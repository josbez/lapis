// De Tauri-schil van Lapis.
//
// Deze module bevat bewust geen bestandslogica: die staat in `vault-core`
// (de boom, schrijfvrij), `app-state` (instellingen, buiten de vault) en
// `search-index` (de FTS5-zoekindex, ook buiten de vault). Wat hier staat is
// de vertaling van IPC-aanroepen naar die drie crates, en niets meer (07
// §4.3: geen directe bestands-I/O in deze schil).
//
// De gekozen map zit in `vault_core::Session`, hier als managed state. De
// frontend geeft dus geen root meer mee; hij kan er alleen één kiezen
// (bevinding B1).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use serde::Serialize;
use tauri::State;
use vault_core::{NodeKind, NoteContent, Session, TreeNode, TreeView, WriteOutcome};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TreeNodeDto {
    name: String,
    rel_path: String,
    kind: &'static str,
    readable: bool,
    children: Vec<TreeNodeDto>,
}

impl From<TreeNode> for TreeNodeDto {
    fn from(n: TreeNode) -> Self {
        TreeNodeDto {
            name: n.name,
            rel_path: n.rel_path,
            kind: match n.kind {
                NodeKind::Dir => "dir",
                NodeKind::File => "file",
            },
            readable: n.readable,
            children: n.children.into_iter().map(TreeNodeDto::from).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultViewDto {
    root_display: String,
    tree: TreeNodeDto,
}

impl From<TreeView> for VaultViewDto {
    fn from(v: TreeView) -> Self {
        VaultViewDto {
            root_display: v.root_display,
            tree: v.tree.into(),
        }
    }
}

fn store() -> app_state::Store {
    app_state::Store::default_location().expect("kon Application Support-pad niet bepalen")
}

/// Milliseconden sinds epoch — de vorm waarin een `SystemTime` de IPC-grens
/// over kan (JSON kent geen `SystemTime`). Past ruim binnen JS' veilige
/// integer-bereik voor elke realistische datum.
fn millis_since_epoch(t: SystemTime) -> u64 {
    t.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn from_millis(ms: u64) -> SystemTime {
    UNIX_EPOCH + std::time::Duration::from_millis(ms)
}

/// De zoekindex van de huidige vault (W6). `None` vóórdat er een vault
/// geopend is, of wanneer de index zelf niet te openen bleek — zoeken is een
/// aanvullende functie, geen index is dan gewoon geen zoekresultaten, geen
/// reden om de vault zelf te weigeren.
struct IndexState(Mutex<Option<search_index::Index>>);

/// Eén indexbestand per vault, in een submap van `app_support_dir()` — nooit
/// in de vault zelf. `vault_label` (het gecanonicaliseerde vaultpad, zoals
/// getoond in de UI) bepaalt de bestandsnaam via een hash, zodat teruggaan
/// naar een eerder geopende vault zijn index hergebruikt in plaats van hem
/// steeds opnieuw op te bouwen.
fn index_path_for_vault(vault_label: &str) -> Result<PathBuf, String> {
    let dir = app_state::app_support_dir().map_err(|e| e.to_string())?;
    let mut hasher = DefaultHasher::new();
    vault_label.hash(&mut hasher);
    let id = hasher.finish();
    Ok(dir.join("search-index").join(format!("{id:016x}.db")))
}

/// Verzamelt elk bestand uit de boom als `(pad, bestandsnaam, mtime-ms)`,
/// voor `Index::sync`. Mappen leveren niets op, alleen hun kinderen.
fn collect_files(node: &TreeNode, out: &mut Vec<(String, String, i64)>) {
    for child in &node.children {
        match child.kind {
            NodeKind::File => {
                if let Some(modified) = child.modified {
                    out.push((
                        child.rel_path.clone(),
                        child.name.clone(),
                        millis_since_epoch(modified) as i64,
                    ));
                }
            }
            NodeKind::Dir => collect_files(child, out),
        }
    }
}

/// Opent (of hergebruikt) de index voor `vault_label` en brengt hem in lijn
/// met `tree`. Aangeroepen ná elke vault-open/-restore/-rescan. Een fout
/// hierbij — een corrupt indexbestand dat toch niet opnieuw aangemaakt kon
/// worden, een niet te beschrijven map — is nooit fataal voor het openen van
/// de vault zelf; hij komt alleen op stderr terecht, en de index blijft
/// `None` (`search_notes` geeft dan gewoon een lege lijst).
fn sync_index(index_state: &IndexState, session: &Session, vault_label: &str, tree: &TreeNode) {
    let mut guard = index_state.0.lock().unwrap_or_else(|e| e.into_inner());

    let path = match index_path_for_vault(vault_label) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("kon indexpad niet bepalen: {e}");
            *guard = None;
            return;
        }
    };

    let index = match search_index::Index::open(&path) {
        Ok(i) => i,
        Err(e) => {
            eprintln!("kon zoekindex niet openen: {e}");
            *guard = None;
            return;
        }
    };

    let mut files = Vec::new();
    collect_files(tree, &mut files);
    let result = index.sync(
        files.iter().map(|(p, n, m)| (p.as_str(), n.as_str(), *m)),
        |path| {
            session
                .read_note(path)
                .map_err(|e| search_index::IndexError::Io(e.to_string()))
        },
    );
    if let Err(e) = result {
        eprintln!("kon zoekindex niet bijwerken: {e}");
    }

    *guard = Some(index);
}

/// Werkt de index bij voor één notitie, meteen na een geslaagde schrijfactie
/// — zonder daarvoor op de eerstvolgende rescan te wachten. Geen index (nog)
/// geopend, dan is er simpelweg niets te doen.
fn index_upsert(index_state: &IndexState, path: &str, content: &str, modified: SystemTime) {
    let file_name = path.rsplit('/').next().unwrap_or(path);
    let guard = index_state.0.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(index) = guard.as_ref() {
        if let Err(e) = index.upsert_note(
            path,
            file_name,
            content,
            millis_since_epoch(modified) as i64,
        ) {
            eprintln!("kon zoekindex niet bijwerken na schrijven: {e}");
        }
    }
}

/// Haalt één notitie uit de index — na verplaatsen (het oude pad) of naar de
/// prullenbak (W7). Geen index (nog) geopend, dan is er niets te doen.
fn index_remove(index_state: &IndexState, path: &str) {
    let guard = index_state.0.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(index) = guard.as_ref() {
        if let Err(e) = index.remove_note(path) {
            eprintln!("kon zoekindex niet bijwerken na verwijderen: {e}");
        }
    }
}

/// De enige command die een absoluut pad accepteert — het pad dat de
/// gebruiker zelf in de mapkiezer aanwees. Daarna ligt de root in de sessie
/// én in app-state, en geeft de frontend nooit meer een root mee.
#[tauri::command]
fn open_vault(
    picked: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<VaultViewDto, String> {
    let view = session
        .open(&PathBuf::from(&picked))
        .map_err(|e| e.to_string())?;
    store()
        .save_vault_root(Some(Path::new(&view.root_display)))
        .map_err(|e| e.to_string())?;
    sync_index(&index, &session, &view.root_display, &view.tree);
    Ok(view.into())
}

/// Bij opstarten: leest het onthouden pad uit app-state en probeert het te
/// heropenen. Bestaat het niet meer, dan is `None` het antwoord — de lege
/// staat, niets stilzwijgend getoond (Goal §0/V4).
#[tauri::command]
fn restore_vault(
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<Option<VaultViewDto>, String> {
    let Some(root) = store().load().vault_root else {
        return Ok(None);
    };
    let Some(view) = session.restore(&root).map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    sync_index(&index, &session, &view.root_display, &view.tree);
    Ok(Some(view.into()))
}

/// Handmatig verversen van de huidige sessie.
#[tauri::command]
fn rescan_vault(
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<VaultViewDto, String> {
    let view = session.rescan().map_err(|e| e.to_string())?;
    sync_index(&index, &session, &view.root_display, &view.tree);
    Ok(view.into())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NoteContentDto {
    content: String,
    modified_ms: u64,
}

impl From<NoteContent> for NoteContentDto {
    fn from(n: NoteContent) -> Self {
        NoteContentDto {
            content: n.content,
            modified_ms: millis_since_epoch(n.modified),
        }
    }
}

/// Wat `write_note` teruggeeft. Een conflict is hier geen `Err`: het is een
/// verwachte, af te handelen uitkomst (PRD §10, besluit 1), geen
/// programmeerfout — de frontend onderscheidt de twee varianten op `kind`,
/// niet door een foutstring te lezen.
#[derive(Serialize)]
#[serde(tag = "kind")]
enum WriteOutcomeDto {
    #[serde(rename = "saved", rename_all = "camelCase")]
    Saved { modified_ms: u64 },
    #[serde(rename = "conflict")]
    Conflict,
}

impl From<WriteOutcome> for WriteOutcomeDto {
    fn from(o: WriteOutcome) -> Self {
        match o {
            WriteOutcome::Saved(t) => WriteOutcomeDto::Saved {
                modified_ms: millis_since_epoch(t),
            },
            WriteOutcome::Conflict => WriteOutcomeDto::Conflict,
        }
    }
}

/// Leest een notitie relatief aan de huidige vault, mét wijzigingstijd (W2
/// las alleen inhoud; W3 heeft de tijd nodig om conflicten te herkennen
/// vóór het schrijven).
#[tauri::command]
fn read_note(path: String, session: State<'_, Session>) -> Result<NoteContentDto, String> {
    session
        .read_note_with_mtime(&path)
        .map(NoteContentDto::from)
        .map_err(|e| e.to_string())
}

/// Schrijft een notitie atomair (W3, PRD F3). `expected_modified_ms` is de
/// laatst bekende wijzigingstijd; wijkt de tijd op schijf daarvan af, dan
/// komt er `Conflict` terug in plaats van dat er iets overschreven wordt.
/// `None` omzeilt die controle bewust — "mijn versie behouden" na een
/// conflict.
#[tauri::command]
fn write_note(
    path: String,
    content: String,
    expected_modified_ms: Option<u64>,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<WriteOutcomeDto, String> {
    let expected = expected_modified_ms.map(from_millis);
    let outcome = session
        .write_note(&path, &content, expected)
        .map_err(|e| e.to_string())?;
    if let WriteOutcome::Saved(modified) = outcome {
        index_upsert(&index, &path, &content, modified);
    }
    Ok(outcome.into())
}

/// Slaat `content` op als nieuwe kopie naast `path` — "beide bewaren" bij
/// een conflict (PRD §10). Geeft het relatieve pad van de nieuwe kopie
/// terug, zodat de frontend de boom kan verversen.
#[tauri::command]
fn write_note_as_copy(
    path: String,
    content: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<String, String> {
    let new_rel = session
        .write_note_as_copy(&path, &content)
        .map_err(|e| e.to_string())?;
    if let Ok(note) = session.read_note_with_mtime(&new_rel) {
        index_upsert(&index, &new_rel, &content, note.modified);
    }
    Ok(new_rel)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreatedNoteDto {
    rel_path: String,
    modified_ms: u64,
}

impl From<vault_core::CreatedNote> for CreatedNoteDto {
    fn from(c: vault_core::CreatedNote) -> Self {
        CreatedNoteDto {
            rel_path: c.rel_path,
            modified_ms: millis_since_epoch(c.modified),
        }
    }
}

/// Maakt een nieuwe notitie aan (W7, PRD F5). Dit ÍS de "eerste opslag" uit
/// C5+V3: de bestandsnaam komt uit de eerste kopregel van `content` op dit
/// moment — vóór deze aanroep bestond de notitie alleen als concept in de
/// frontend, hier komt niets van in beeld.
#[tauri::command]
fn create_note(
    dir: String,
    content: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<CreatedNoteDto, String> {
    let created = session
        .create_note(&dir, &content)
        .map_err(|e| e.to_string())?;
    index_upsert(&index, &created.rel_path, &content, created.modified);
    Ok(created.into())
}

/// Maakt een nieuwe, lege map aan (W7, PRD F5).
#[tauri::command]
fn create_folder(dir: String, name: String, session: State<'_, Session>) -> Result<String, String> {
    session
        .create_folder(&dir, &name)
        .map_err(|e| e.to_string())
}

/// Hernoemt of verplaatst een notitie (W7, PRD F5) — dezelfde onderliggende
/// bewerking (Spec: één `rename()`), of `to_path` nu in dezelfde map ligt of
/// een andere.
#[tauri::command]
fn move_note(
    from_path: String,
    to_path: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<(), String> {
    session
        .move_note(&from_path, &to_path)
        .map_err(|e| e.to_string())?;
    index_remove(&index, &from_path);
    if let Ok(note) = session.read_note_with_mtime(&to_path) {
        index_upsert(&index, &to_path, &note.content, note.modified);
    }
    Ok(())
}

/// Verplaatst een notitie naar de systeem-prullenbak (W7, PRD C7) — nooit
/// permanent.
#[tauri::command]
fn trash_note(
    path: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<(), String> {
    session.trash_note(&path).map_err(|e| e.to_string())?;
    index_remove(&index, &path);
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AttachmentOutcomeDto {
    note_rel_path: String,
    attachment_rel_path: String,
    /// `true` wanneer dit de eerste bijlage in de notitie was — de frontend
    /// moet dan zijn "welke notitie staat open"-toestand bijwerken naar
    /// `note_rel_path`, precies zoals na een `move_note`.
    note_moved: bool,
}

impl From<vault_core::AttachmentOutcome> for AttachmentOutcomeDto {
    fn from(o: vault_core::AttachmentOutcome) -> Self {
        AttachmentOutcomeDto {
            note_rel_path: o.note_rel_path,
            attachment_rel_path: o.attachment_rel_path,
            note_moved: o.note_moved,
        }
    }
}

/// Slaat een bijlage op bij een notitie (W8, PRD F5/C8) — bijvoorbeeld een
/// geplakte afbeelding. `bytes_base64` is de ruwe inhoud, base64-gecodeerd:
/// compacter over de IPC-grens dan een JSON-array van getallen, en simpeler
/// dan Tauri's raw-request-mechanisme voor iets dat maar in twee commands
/// gebeurt. Is dit de eerste bijlage, dan verhuist de notitie naar haar
/// eigen map (`note_moved`); de index volgt die padwijziging net als bij
/// `move_note`.
#[tauri::command]
fn write_attachment(
    note_path: String,
    filename: String,
    bytes_base64: String,
    session: State<'_, Session>,
    index: State<'_, IndexState>,
) -> Result<AttachmentOutcomeDto, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&bytes_base64)
        .map_err(|e| e.to_string())?;
    let outcome = session
        .write_attachment(&note_path, &filename, &bytes)
        .map_err(|e| e.to_string())?;
    if outcome.note_moved {
        index_remove(&index, &note_path);
        if let Ok(note) = session.read_note_with_mtime(&outcome.note_rel_path) {
            index_upsert(&index, &outcome.note_rel_path, &note.content, note.modified);
        }
    }
    Ok(outcome.into())
}

/// Leest een bijlage voor inline weergave (W8) — `image_ref` is de
/// letterlijke string uit de markdown-link (`![alt](image_ref)`), opgelost
/// relatief aan de map van `note_path`. Geeft de bytes base64-gecodeerd
/// terug, voor de frontend om als blob-URL te tonen.
#[tauri::command]
fn read_attachment(
    note_path: String,
    image_ref: String,
    session: State<'_, Session>,
) -> Result<String, String> {
    let bytes = session
        .read_attachment(&note_path, &image_ref)
        .map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

/// Volledige tekst zoeken (W6, PRD F4, `⌘⇧F`). Geen index (nog) geopend —
/// bijvoorbeeld vóór de eerste vault-open — geeft gewoon een lege lijst,
/// geen fout: zoeken zonder vault is geen gebruikersfout.
#[tauri::command]
fn search_notes(
    query: String,
    index: State<'_, IndexState>,
) -> Result<Vec<SearchResultDto>, String> {
    let guard = index.0.lock().unwrap_or_else(|e| e.into_inner());
    let Some(index) = guard.as_ref() else {
        return Ok(Vec::new());
    };
    index
        .search(&query, SEARCH_RESULT_LIMIT)
        .map(|results| results.into_iter().map(SearchResultDto::from).collect())
        .map_err(|e| e.to_string())
}

/// Geen PRD-eis, een redelijke aanname zoals W5's `MAX_RECENT_PATHS` — een
/// zoekvenster toont er toch nooit meer dan een handvol tegelijk.
const SEARCH_RESULT_LIMIT: usize = 50;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResultDto {
    path: String,
    title: String,
    snippet: String,
}

impl From<search_index::SearchResult> for SearchResultDto {
    fn from(r: search_index::SearchResult) -> Self {
        SearchResultDto {
            path: r.path,
            title: r.title,
            snippet: r.snippet,
        }
    }
}

/// De meest recent geopende notities, meest-recent-eerst (W5, quick
/// switcher: "recent geopend bovenaan bij lege invoer").
#[tauri::command]
fn get_recent_paths() -> Result<Vec<String>, String> {
    Ok(store().load().recent_paths)
}

/// Zet `path` vooraan in de recente lijst. De frontend roept dit aan na een
/// geslaagde `read_note` — dit command leest zelf niets, het onthoudt alleen.
#[tauri::command]
fn record_note_opened(path: String) -> Result<(), String> {
    store().record_note_opened(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sidebar_visible() -> Result<bool, String> {
    Ok(store().load().sidebar_visible)
}

#[tauri::command]
fn set_sidebar_visible(visible: bool) -> Result<(), String> {
    store()
        .save_sidebar_visible(visible)
        .map_err(|e| e.to_string())
}

/// De vaste eerste pagina (W9, PRD F7) — `None` betekent: geen startpagina
/// ingesteld, Lapis opent leeg. Of het pad nog bestaat, controleert dit
/// command niet — dat is aan de aanroeper, ná een `read_note`-poging.
#[tauri::command]
fn get_start_page() -> Result<Option<String>, String> {
    Ok(store().load().start_page)
}

/// Wijst `path` aan als vaste eerste pagina, of trekt de aanwijzing in met
/// `None`.
#[tauri::command]
fn set_start_page(path: Option<String>) -> Result<(), String> {
    store()
        .save_start_page(path.as_deref())
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Session::new())
        .manage(IndexState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            open_vault,
            restore_vault,
            rescan_vault,
            read_note,
            write_note,
            write_note_as_copy,
            create_note,
            create_folder,
            move_note,
            trash_note,
            write_attachment,
            read_attachment,
            search_notes,
            get_recent_paths,
            record_note_opened,
            get_sidebar_visible,
            set_sidebar_visible,
            get_start_page,
            set_start_page
        ])
        .run(tauri::generate_context!())
        .expect("kon de Tauri-app niet starten");
}

#[cfg(test)]
mod tests {
    use super::*;

    // Bewijst de JSON-vorm die de frontend op `kind` onderscheidt, in
    // plaats van dat als aanname in ipc.ts te laten staan.
    #[test]
    fn write_outcome_dto_serialiseert_op_kind() {
        let saved = WriteOutcomeDto::Saved { modified_ms: 42 };
        assert_eq!(
            serde_json::to_value(&saved).unwrap(),
            serde_json::json!({ "kind": "saved", "modifiedMs": 42 })
        );

        let conflict = WriteOutcomeDto::Conflict;
        assert_eq!(
            serde_json::to_value(&conflict).unwrap(),
            serde_json::json!({ "kind": "conflict" })
        );
    }

    // W7 — create_note.
    #[test]
    fn created_note_dto_serialiseert_camelcase() {
        let created = vault_core::CreatedNote {
            rel_path: "Boodschappen.md".to_string(),
            modified: from_millis(1_700_000_000_000),
        };
        assert_eq!(
            serde_json::to_value(CreatedNoteDto::from(created)).unwrap(),
            serde_json::json!({ "relPath": "Boodschappen.md", "modifiedMs": 1_700_000_000_000_u64 })
        );
    }

    // W8 — write_attachment/read_attachment.
    #[test]
    fn attachment_outcome_dto_serialiseert_camelcase() {
        let outcome = vault_core::AttachmentOutcome {
            note_rel_path: "Notitie/Notitie.md".to_string(),
            attachment_rel_path: "Notitie/foto.png".to_string(),
            note_moved: true,
        };
        assert_eq!(
            serde_json::to_value(AttachmentOutcomeDto::from(outcome)).unwrap(),
            serde_json::json!({
                "noteRelPath": "Notitie/Notitie.md",
                "attachmentRelPath": "Notitie/foto.png",
                "noteMoved": true,
            })
        );
    }

    #[test]
    fn millis_rondje_blijft_gelijk() {
        let t = from_millis(1_700_000_000_123);
        assert_eq!(millis_since_epoch(t), 1_700_000_000_123);
    }

    // W6 — search_notes en de indexlevenscyclus.

    #[test]
    fn search_result_dto_serialiseert_camelcase() {
        let result = search_index::SearchResult {
            path: "dagboek/vandaag.md".to_string(),
            title: "Vandaag".to_string(),
            snippet: "…met <mark>koffie</mark>…".to_string(),
        };
        assert_eq!(
            serde_json::to_value(SearchResultDto::from(result)).unwrap(),
            serde_json::json!({
                "path": "dagboek/vandaag.md",
                "title": "Vandaag",
                "snippet": "…met <mark>koffie</mark>…",
            })
        );
    }

    #[test]
    fn index_pad_is_stabiel_voor_hetzelfde_label_en_verschilt_tussen_vaults() {
        let a = index_path_for_vault("/tmp/notities").unwrap();
        let a_opnieuw = index_path_for_vault("/tmp/notities").unwrap();
        let b = index_path_for_vault("/tmp/ander-project").unwrap();

        assert_eq!(
            a, a_opnieuw,
            "hetzelfde vaultpad moet hetzelfde indexbestand geven"
        );
        assert_ne!(a, b, "verschillende vaults mogen elkaars index niet delen");
    }

    fn tree_node(name: &str, rel_path: &str, kind: NodeKind, children: Vec<TreeNode>) -> TreeNode {
        TreeNode {
            name: name.to_string(),
            rel_path: rel_path.to_string(),
            kind,
            readable: true,
            children,
            modified: match kind {
                NodeKind::File => Some(SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(1)),
                NodeKind::Dir => None,
            },
        }
    }

    #[test]
    fn collect_files_haalt_alleen_bestanden_uit_geneste_mappen() {
        let tree = tree_node(
            "vault",
            "",
            NodeKind::Dir,
            vec![
                tree_node("wortel.md", "wortel.md", NodeKind::File, Vec::new()),
                tree_node(
                    "map",
                    "map",
                    NodeKind::Dir,
                    vec![tree_node(
                        "kind.md",
                        "map/kind.md",
                        NodeKind::File,
                        Vec::new(),
                    )],
                ),
            ],
        );

        let mut files = Vec::new();
        collect_files(&tree, &mut files);
        let paths: Vec<&str> = files.iter().map(|(p, _, _)| p.as_str()).collect();

        assert_eq!(paths, vec!["wortel.md", "map/kind.md"]);
    }
}
