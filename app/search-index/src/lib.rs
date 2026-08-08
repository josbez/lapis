//! Full-text search index (W6, PRD F4/D5).
//!
//! SQLite met FTS5, buiten de vault. Deze crate weet niets van `vault-core`
//! of Tauri — hij kent alleen (pad, titel, inhoud, wijzigingstijd) en geeft
//! zoekresultaten terug. De synchronisatie tussen "wat er op schijf staat"
//! en "wat er in de index staat" gebeurt via [`Index::sync`], die een
//! iterator van (pad, wijzigingstijd) krijgt en een closure om de inhoud van
//! een pad te lezen — de aanroeper (de Tauri-schil) levert die uit
//! `vault-core`, zodat deze twee crates elkaar niet hoeven te kennen.
//!
//! **Wegwerpbaar** (PRD): bij een schema-mismatch of corrupt bestand wordt
//! de index gewoon opnieuw aangemaakt. Er staat nooit iets in die alleen
//! hier bestaat — alles is afgeleid van bestanden in de vault.

use rusqlite::{Connection, OptionalExtension};
use std::fmt;
use std::path::Path;

#[derive(Debug)]
pub enum IndexError {
    Sqlite(String),
    Io(String),
}

impl fmt::Display for IndexError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IndexError::Sqlite(m) => write!(f, "indexfout: {m}"),
            IndexError::Io(m) => write!(f, "bestandsfout bij de index: {m}"),
        }
    }
}

impl std::error::Error for IndexError {}

impl From<rusqlite::Error> for IndexError {
    fn from(e: rusqlite::Error) -> Self {
        IndexError::Sqlite(e.to_string())
    }
}

/// Huidig schema-versienummer. Wijkt de index op schijf hiervan af (of is
/// hij corrupt), dan wordt hij weggegooid en leeg opnieuw aangemaakt — de
/// index is wegwerpbaar, dat kost alleen een her-sync.
const SCHEMA_VERSION: i64 = 1;

pub struct SearchResult {
    pub path: String,
    pub title: String,
    /// Met `<mark>…</mark>` rond de treffer(s), uit FTS5's `snippet()`.
    pub snippet: String,
}

/// Titel: frontmatter `title:`, anders de eerste `# `-kop, anders de
/// bestandsnaam zonder extensie (PRD/tech-spec §index).
///
/// Bewust geen YAML-parser: dit is een beste-poging-titel voor
/// zoekresultaten, geen frontmatter-interpretatie die iets in de vault
/// verandert of ergens anders voor gebruikt wordt.
pub fn extract_title(file_name: &str, content: &str) -> String {
    if let Some(title) = frontmatter_title(content) {
        return title;
    }
    if let Some(heading) = first_h1(content) {
        return heading;
    }
    file_name
        .strip_suffix(".md")
        .or_else(|| file_name.strip_suffix(".MD"))
        .unwrap_or(file_name)
        .to_string()
}

fn frontmatter_title(content: &str) -> Option<String> {
    let rest = content.strip_prefix("---\n")?;
    let end = rest.find("\n---")?;
    let block = &rest[..end];
    for line in block.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("title:") {
            let value = value.trim().trim_matches('"').trim_matches('\'');
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }
    None
}

fn first_h1(content: &str) -> Option<String> {
    for line in content.lines() {
        if let Some(heading) = line.strip_prefix("# ") {
            let heading = heading.trim();
            if !heading.is_empty() {
                return Some(heading.to_string());
            }
        }
    }
    None
}

pub struct Index {
    conn: Connection,
}

impl Index {
    /// Opent de index op `path`, en maakt hem (opnieuw) aan als hij
    /// ontbreekt, corrupt is, of van een ander schema is.
    pub fn open(path: &Path) -> Result<Self, IndexError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| IndexError::Io(e.to_string()))?;
        }

        let conn = match Connection::open(path) {
            Ok(conn) if schema_is_current(&conn) => conn,
            _ => {
                // Corrupt, ontbrekend schema, of een oudere versie: opnieuw
                // beginnen is goedkoper en veiliger dan migreren voor een
                // index die toch alleen afgeleide data bevat.
                let _ = std::fs::remove_file(path);
                Connection::open(path)?
            }
        };

        let index = Self { conn };
        index.create_schema()?;
        Ok(index)
    }

    /// Een index die alleen in het geheugen leeft — voor tests, zodat de
    /// echte `Application Support`-map nooit wordt aangeraakt.
    pub fn open_in_memory() -> Result<Self, IndexError> {
        let conn = Connection::open_in_memory()?;
        let index = Self { conn };
        index.create_schema()?;
        Ok(index)
    }

    fn create_schema(&self) -> Result<(), IndexError> {
        self.conn.execute_batch(&format!(
            "
            PRAGMA user_version = {SCHEMA_VERSION};
            CREATE TABLE IF NOT EXISTS notes (
                path  TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                mtime INTEGER NOT NULL
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                path UNINDEXED,
                title,
                body,
                tokenize = 'unicode61 remove_diacritics 2'
            );
            "
        ))?;
        Ok(())
    }

    /// De wijzigingstijd zoals laatst geïndexeerd, of `None` als `path` nog
    /// niet in de index staat.
    pub fn indexed_mtime(&self, path: &str) -> Result<Option<i64>, IndexError> {
        indexed_mtime_on(&self.conn, path)
    }

    pub fn all_indexed_paths(&self) -> Result<Vec<String>, IndexError> {
        all_indexed_paths_on(&self.conn)
    }

    /// Voegt `path` toe aan de index, of werkt hem bij als hij er al stond.
    pub fn upsert_note(
        &self,
        path: &str,
        file_name: &str,
        content: &str,
        mtime: i64,
    ) -> Result<(), IndexError> {
        upsert_note_on(&self.conn, path, file_name, content, mtime)
    }

    pub fn remove_note(&self, path: &str) -> Result<(), IndexError> {
        remove_note_on(&self.conn, path)
    }

    /// Brengt de index in lijn met wat er op schijf staat.
    ///
    /// `on_disk` is elk bestand dat nu in de vault bestaat, met zijn
    /// wijzigingstijd. `read` levert de inhoud van één pad — alleen
    /// aangeroepen voor bestanden die nieuw zijn of waarvan de
    /// wijzigingstijd afwijkt van wat er al geïndexeerd stond.
    ///
    /// Draait in één transactie: bij duizenden bestanden is anders elke
    /// upsert zijn eigen `fsync`, wat de 5000-notities-prestatie-eis (Goal
    /// §9-budget) met een factor ruimschoots overschrijdt.
    pub fn sync<'a>(
        &self,
        on_disk: impl Iterator<Item = (&'a str, &'a str, i64)>,
        mut read: impl FnMut(&str) -> Result<String, IndexError>,
    ) -> Result<(), IndexError> {
        let tx = self.conn.unchecked_transaction()?;

        let mut seen = std::collections::HashSet::new();
        for (path, file_name, mtime) in on_disk {
            seen.insert(path.to_string());
            if indexed_mtime_on(&tx, path)? == Some(mtime) {
                continue;
            }
            let content = read(path)?;
            upsert_note_on(&tx, path, file_name, &content, mtime)?;
        }

        for indexed in all_indexed_paths_on(&tx)? {
            if !seen.contains(&indexed) {
                remove_note_on(&tx, &indexed)?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    /// Zoekt met FTS5 `MATCH` en BM25-ranking, met gemarkeerde fragmenten.
    /// Een lege of ongeldige FTS5-query geeft gewoon een lege lijst terug —
    /// geen fout naar de gebruiker om een tikfout in een zoekterm.
    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>, IndexError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let mut stmt = self.conn.prepare(
            "SELECT path, title, snippet(notes_fts, 2, '<mark>', '</mark>', '…', 12)
             FROM notes_fts
             WHERE notes_fts MATCH ?1
             ORDER BY bm25(notes_fts)
             LIMIT ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![fts5_query(query), limit as i64], |row| {
            Ok(SearchResult {
                path: row.get(0)?,
                title: row.get(1)?,
                snippet: row.get(2)?,
            })
        });

        let rows = match rows {
            Ok(rows) => rows,
            // Een query die FTS5's eigen syntax breekt (bijv. een lone `"`)
            // is een gebruikersinvoerprobleem, geen systeemfout.
            Err(rusqlite::Error::SqliteFailure(_, _)) => return Ok(Vec::new()),
            Err(e) => return Err(e.into()),
        };

        let mut out = Vec::new();
        for row in rows {
            match row {
                Ok(r) => out.push(r),
                Err(rusqlite::Error::SqliteFailure(_, _)) => return Ok(Vec::new()),
                Err(e) => return Err(e.into()),
            }
        }
        Ok(out)
    }
}

/// Vertaalt vrije tekst naar een FTS5-query die niet meteen struikelt over
/// FTS5's eigen speciale tekens (`"`, `*`, `:`, ...). Elk woord wordt als
/// losse, aan elkaar ge-AND-de term met een prefix-wildcard doorgegeven,
/// zodat "vergad" ook "vergadering" vindt — net als de quick switcher
/// vindt-tijdens-typen aanvoelt.
fn fts5_query(query: &str) -> String {
    query
        .split_whitespace()
        .map(|word| {
            let cleaned: String = word.chars().filter(|c| c.is_alphanumeric()).collect();
            format!("\"{cleaned}\"*")
        })
        .collect::<Vec<_>>()
        .join(" AND ")
}

fn indexed_mtime_on(conn: &Connection, path: &str) -> Result<Option<i64>, IndexError> {
    conn.query_row("SELECT mtime FROM notes WHERE path = ?1", [path], |row| {
        row.get(0)
    })
    .map(Some)
    .or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        e => Err(e.into()),
    })
}

fn all_indexed_paths_on(conn: &Connection) -> Result<Vec<String>, IndexError> {
    let mut stmt = conn.prepare("SELECT path FROM notes")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

/// De `path`-kolom in `notes_fts` staat bewust `UNINDEXED` (FTS5 tokenizeert
/// geen paden) — maar dat betekent ook dat `WHERE path = ?` er een volledige
/// tabelscan is. Daarom lopen updates via `notes.rowid`, dat `notes_fts`
/// deelt als eigen rowid: een primaire-sleutel-lookup gevolgd door een
/// rowid-match, in plaats van een scan die bij 5000 notities kwadratisch
/// wordt (elke upsert scant een tabel die net zo hard groeit).
fn upsert_note_on(
    conn: &Connection,
    path: &str,
    file_name: &str,
    content: &str,
    mtime: i64,
) -> Result<(), IndexError> {
    let title = extract_title(file_name, content);
    conn.execute(
        "INSERT INTO notes (path, title, mtime) VALUES (?1, ?2, ?3)
         ON CONFLICT(path) DO UPDATE SET title = excluded.title, mtime = excluded.mtime",
        rusqlite::params![path, title, mtime],
    )?;
    let rowid: i64 = conn.query_row("SELECT rowid FROM notes WHERE path = ?1", [path], |row| {
        row.get(0)
    })?;
    conn.execute("DELETE FROM notes_fts WHERE rowid = ?1", [rowid])?;
    conn.execute(
        "INSERT INTO notes_fts (rowid, path, title, body) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![rowid, path, title, content],
    )?;
    Ok(())
}

fn remove_note_on(conn: &Connection, path: &str) -> Result<(), IndexError> {
    let rowid: Option<i64> = conn
        .query_row("SELECT rowid FROM notes WHERE path = ?1", [path], |row| {
            row.get(0)
        })
        .optional()?;
    if let Some(rowid) = rowid {
        conn.execute("DELETE FROM notes_fts WHERE rowid = ?1", [rowid])?;
    }
    conn.execute("DELETE FROM notes WHERE path = ?1", [path])?;
    Ok(())
}

fn schema_is_current(conn: &Connection) -> bool {
    conn.query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map(|v| v == SCHEMA_VERSION)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn temp_index_path(label: &str) -> std::path::PathBuf {
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-tmp")
            .join(format!("{label}-{n}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("index.db")
    }

    #[test]
    fn fts5_is_beschikbaar_in_de_gebundelde_sqlite() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE VIRTUAL TABLE t USING fts5(body);")
            .expect("fts5 lijkt niet beschikbaar in deze gebundelde SQLite-build");
    }

    // Titel-extractie
    #[test]
    fn titel_uit_frontmatter() {
        let content = "---\ntitle: Mijn Notitie\ntags: [x]\n---\n\n# Andere kop\n";
        assert_eq!(extract_title("bestand.md", content), "Mijn Notitie");
    }

    #[test]
    fn titel_uit_eerste_h1_zonder_frontmatter() {
        let content = "Wat inleidende tekst.\n\n# De Echte Titel\n\nMeer tekst.";
        assert_eq!(extract_title("bestand.md", content), "De Echte Titel");
    }

    #[test]
    fn titel_valt_terug_op_bestandsnaam() {
        let content = "Geen kop, geen frontmatter, gewoon tekst.";
        assert_eq!(extract_title("notitie.md", content), "notitie");
    }

    #[test]
    fn frontmatter_titel_met_quotes_wordt_ontdaan() {
        let content = "---\ntitle: \"Aangehaalde titel\"\n---\ntekst";
        assert_eq!(extract_title("x.md", content), "Aangehaalde titel");
    }

    // Index
    #[test]
    fn upsert_en_search_vinden_een_woord_in_de_body() {
        let index = Index::open_in_memory().unwrap();
        index
            .upsert_note(
                "dagboek/vandaag.md",
                "vandaag.md",
                "Vergadering met het team om 10 uur.",
                1,
            )
            .unwrap();

        let resultaten = index.search("vergadering", 10).unwrap();
        assert_eq!(resultaten.len(), 1);
        assert_eq!(resultaten[0].path, "dagboek/vandaag.md");
        assert!(resultaten[0].snippet.contains("<mark>"));
    }

    #[test]
    fn prefix_match_vindt_een_gedeeltelijk_getypt_woord() {
        let index = Index::open_in_memory().unwrap();
        index
            .upsert_note("a.md", "a.md", "Een vergadering staat gepland.", 1)
            .unwrap();

        assert_eq!(index.search("vergad", 10).unwrap().len(), 1);
    }

    #[test]
    fn zoeken_naar_niets_geeft_een_lege_lijst_geen_fout() {
        let index = Index::open_in_memory().unwrap();
        index.upsert_note("a.md", "a.md", "inhoud", 1).unwrap();
        assert!(index.search("xyzxyzxyz", 10).unwrap().is_empty());
    }

    #[test]
    fn een_lege_query_geeft_een_lege_lijst() {
        let index = Index::open_in_memory().unwrap();
        assert!(index.search("", 10).unwrap().is_empty());
        assert!(index.search("   ", 10).unwrap().is_empty());
    }

    #[test]
    fn speciale_tekens_in_de_query_geven_geen_fout() {
        let index = Index::open_in_memory().unwrap();
        index.upsert_note("a.md", "a.md", "inhoud", 1).unwrap();
        // FTS5-syntax-tekens die zonder opschoning een SQL-fout zouden geven.
        assert!(index.search("\"onafgesloten aanhalingsteken", 10).is_ok());
        assert!(index.search("titel: iets", 10).is_ok());
    }

    #[test]
    fn upsert_op_bestaand_pad_overschrijft_in_plaats_van_te_dupliceren() {
        let index = Index::open_in_memory().unwrap();
        index
            .upsert_note("a.md", "a.md", "eerste versie", 1)
            .unwrap();
        index
            .upsert_note("a.md", "a.md", "tweede versie met ander woord", 2)
            .unwrap();

        assert!(index.search("eerste", 10).unwrap().is_empty());
        assert_eq!(index.search("tweede", 10).unwrap().len(), 1);
        assert_eq!(index.indexed_mtime("a.md").unwrap(), Some(2));
    }

    #[test]
    fn remove_note_haalt_een_bestand_volledig_uit_de_index() {
        let index = Index::open_in_memory().unwrap();
        index.upsert_note("a.md", "a.md", "inhoud", 1).unwrap();
        index.remove_note("a.md").unwrap();

        assert!(index.search("inhoud", 10).unwrap().is_empty());
        assert_eq!(index.indexed_mtime("a.md").unwrap(), None);
    }

    #[test]
    fn ranking_zet_meer_relevante_treffers_eerst() {
        let index = Index::open_in_memory().unwrap();
        index
            .upsert_note("weinig.md", "weinig.md", "Ergens in deze lange notitie komt het woord notitie precies één keer voor, tussen veel andere tekst die er niets mee te maken heeft.", 1)
            .unwrap();
        index
            .upsert_note("veel.md", "veel.md", "notitie notitie notitie", 2)
            .unwrap();

        let resultaten = index.search("notitie", 10).unwrap();
        assert_eq!(resultaten.len(), 2);
        assert_eq!(resultaten[0].path, "veel.md");
    }

    // Persistentie op schijf (niet alleen in-memory)
    #[test]
    fn index_op_schijf_overleeft_heropenen() {
        let path = temp_index_path("persist");
        {
            let index = Index::open(&path).unwrap();
            index
                .upsert_note("a.md", "a.md", "blijvende inhoud", 1)
                .unwrap();
        }
        let heropend = Index::open(&path).unwrap();
        assert_eq!(heropend.search("blijvende", 10).unwrap().len(), 1);
    }

    #[test]
    fn een_corrupt_indexbestand_wordt_vervangen_niet_laten_crashen() {
        let path = temp_index_path("corrupt");
        std::fs::write(&path, b"dit is geen sqlite-bestand").unwrap();

        let index = Index::open(&path).unwrap();
        index.upsert_note("a.md", "a.md", "werkt weer", 1).unwrap();
        assert_eq!(index.search("werkt", 10).unwrap().len(), 1);
    }

    #[test]
    fn een_oudere_schemaversie_wordt_opnieuw_opgebouwd() {
        let path = temp_index_path("oud-schema");
        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch("PRAGMA user_version = 0;").unwrap();
        }
        let index = Index::open(&path).unwrap();
        // Geen paniek, en de index is meteen bruikbaar.
        index.upsert_note("a.md", "a.md", "na migratie", 1).unwrap();
        assert_eq!(index.search("migratie", 10).unwrap().len(), 1);
    }

    // sync()
    #[test]
    fn sync_indexeert_nieuwe_bestanden() {
        let index = Index::open_in_memory().unwrap();
        let bestanden = [("a.md", "a.md", 1i64), ("b.md", "b.md", 1i64)];

        index
            .sync(bestanden.iter().map(|(p, n, m)| (*p, *n, *m)), |path| {
                Ok(format!("inhoud van {path}"))
            })
            .unwrap();

        assert_eq!(index.search("inhoud", 10).unwrap().len(), 2);
    }

    #[test]
    fn sync_slaat_ongewijzigde_bestanden_over() {
        let index = Index::open_in_memory().unwrap();
        let mut leesaanroepen = 0;

        index
            .sync(std::iter::once(("a.md", "a.md", 1i64)), |path| {
                leesaanroepen += 1;
                Ok(format!("inhoud van {path}"))
            })
            .unwrap();
        assert_eq!(leesaanroepen, 1);

        // Zelfde mtime, tweede sync — geen nieuwe leesactie nodig.
        index
            .sync(std::iter::once(("a.md", "a.md", 1i64)), |path| {
                leesaanroepen += 1;
                Ok(format!("inhoud van {path}"))
            })
            .unwrap();
        assert_eq!(
            leesaanroepen, 1,
            "een ongewijzigd bestand had niet herlezen moeten worden"
        );
    }

    #[test]
    fn sync_herindexeert_een_gewijzigd_bestand() {
        let index = Index::open_in_memory().unwrap();
        index
            .sync(std::iter::once(("a.md", "a.md", 1i64)), |_| {
                Ok("oude inhoud".to_string())
            })
            .unwrap();
        index
            .sync(std::iter::once(("a.md", "a.md", 2i64)), |_| {
                Ok("nieuwe inhoud".to_string())
            })
            .unwrap();

        assert!(index.search("oude", 10).unwrap().is_empty());
        assert_eq!(index.search("nieuwe", 10).unwrap().len(), 1);
    }

    #[test]
    fn sync_verwijdert_bestanden_die_niet_meer_op_schijf_staan() {
        let index = Index::open_in_memory().unwrap();
        index
            .sync(std::iter::once(("weg.md", "weg.md", 1i64)), |_| {
                Ok("verdwijnt straks".to_string())
            })
            .unwrap();
        assert_eq!(index.search("verdwijnt", 10).unwrap().len(), 1);

        index.sync(std::iter::empty(), |_| unreachable!()).unwrap();
        assert!(index.search("verdwijnt", 10).unwrap().is_empty());
    }

    // Prestatie — zelfde budget als W1's scan (Goal §9), nu voor een volledige
    // her-indexering van een lege index.
    #[test]
    fn prestatie_5000_notities_synchroniseren() {
        let index = Index::open_in_memory().unwrap();
        let bestanden: Vec<(String, String, i64)> = (0..5_000)
            .map(|i| {
                (
                    format!("notitie-{i:04}.md"),
                    format!("notitie-{i:04}.md"),
                    1i64,
                )
            })
            .collect();

        let start = std::time::Instant::now();
        index
            .sync(
                bestanden
                    .iter()
                    .map(|(p, n, m)| (p.as_str(), n.as_str(), *m)),
                |path| {
                    Ok(format!(
                        "inhoud van {path} met wat extra tekst om op te zoeken."
                    ))
                },
            )
            .unwrap();
        let duur = start.elapsed();

        eprintln!("prestatie_5000_notities_synchroniseren: {duur:?}");
        assert_eq!(index.search("extra", 10).unwrap().len(), 10);
        assert!(
            duur.as_millis() < 2000,
            "sync duurde {duur:?}, budget is 2s"
        );
    }
}
