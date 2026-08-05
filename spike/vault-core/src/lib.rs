//! Bestandslogica voor de W0-spike.
//!
//! Deze crate bevat geen Tauri-afhankelijkheid, zodat de tests overal draaien —
//! ook op een machine zonder de macOS- of webview-toolchain. De app in
//! `../src-tauri` is een dunne schil die deze functies als IPC-commands aanbiedt.
//!
//! Wat deze code bewust NIET doet, conform de Wave Specification:
//! - niet atomair schrijven (dat is W3)
//! - niet recursief scannen (dat is W1)
//! - inhoud nooit normaliseren: regeleindes, trailing newlines en witruimte
//!   blijven precies zoals ze op schijf staan

use std::fmt;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileEntry {
    /// Pad relatief aan de vault-root.
    pub path: String,
    pub name: String,
}

#[derive(Debug, PartialEq, Eq)]
pub enum VaultError {
    /// Het pad wijst buiten de gekozen map. Dit is de enige
    /// veiligheidsgarantie van de spike.
    OutsideRoot,
    NotFound,
    NotADirectory,
    InvalidUtf8,
    Io(String),
}

impl fmt::Display for VaultError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VaultError::OutsideRoot => write!(f, "pad valt buiten de gekozen map"),
            VaultError::NotFound => write!(f, "bestand of map niet gevonden"),
            VaultError::NotADirectory => write!(f, "pad is geen map"),
            VaultError::InvalidUtf8 => write!(f, "bestand is geen geldige UTF-8"),
            VaultError::Io(m) => write!(f, "bestandsfout: {m}"),
        }
    }
}

impl std::error::Error for VaultError {}

fn io(e: std::io::Error) -> VaultError {
    match e.kind() {
        std::io::ErrorKind::NotFound => VaultError::NotFound,
        _ => VaultError::Io(e.to_string()),
    }
}

/// Canoniek, absoluut pad van de gekozen map.
pub fn resolve_root(picked: &Path) -> Result<PathBuf, VaultError> {
    let root = fs::canonicalize(picked).map_err(io)?;
    if !root.is_dir() {
        return Err(VaultError::NotADirectory);
    }
    Ok(root)
}

/// Zet een relatief pad om naar een absoluut pad binnen `root`, of faalt.
///
/// Twee lagen bescherming, allebei nodig:
/// 1. `..`-componenten en absolute paden worden direct geweigerd.
/// 2. Het resultaat wordt gecanonicaliseerd vóór de vergelijking, zodat een
///    symlink die buiten de map wijst óók wordt gevangen.
pub fn resolve_in_root(root: &Path, rel: &str) -> Result<PathBuf, VaultError> {
    let root = resolve_root(root)?;
    let rel_path = Path::new(rel);

    if rel_path.is_absolute() {
        return Err(VaultError::OutsideRoot);
    }
    for component in rel_path.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(VaultError::OutsideRoot),
        }
    }

    let resolved = canonicalize_existing_prefix(&root.join(rel_path))?;
    if !resolved.starts_with(&root) {
        return Err(VaultError::OutsideRoot);
    }
    Ok(resolved)
}

/// Canonicaliseert het diepste bestaande deel van een pad en plakt de rest er
/// weer aan. Nodig omdat `canonicalize` faalt op een bestand dat nog niet
/// bestaat, terwijl we bij schrijven wél de symlinks in de bovenliggende
/// mappen willen doorlopen.
fn canonicalize_existing_prefix(path: &Path) -> Result<PathBuf, VaultError> {
    if path.exists() {
        return fs::canonicalize(path).map_err(io);
    }
    let parent = path.parent().ok_or(VaultError::OutsideRoot)?;
    let name = path.file_name().ok_or(VaultError::OutsideRoot)?;
    Ok(canonicalize_existing_prefix(parent)?.join(name))
}

/// De `.md`-bestanden direct in `root`, alfabetisch. Niet recursief — dat is W1.
pub fn list_markdown(root: &Path) -> Result<Vec<FileEntry>, VaultError> {
    let root = resolve_root(root)?;
    let mut entries = Vec::new();

    for entry in fs::read_dir(&root).map_err(io)? {
        let entry = entry.map_err(io)?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('.') {
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        entries.push(FileEntry {
            path: name.clone(),
            name,
        });
    }

    entries.sort_by_key(|e| e.name.to_lowercase());
    Ok(entries)
}

/// Leest een notitie als UTF-8, zonder enige normalisatie.
pub fn read_note(root: &Path, rel: &str) -> Result<String, VaultError> {
    let path = resolve_in_root(root, rel)?;
    let bytes = fs::read(&path).map_err(io)?;
    String::from_utf8(bytes).map_err(|_| VaultError::InvalidUtf8)
}

/// Schrijft een notitie zoals aangeleverd, byte voor byte.
///
/// Naïef schrijven is hier toegestaan; atomair schrijven is W3. Daarom draait
/// de spike nooit tegen echte notities.
pub fn write_note(root: &Path, rel: &str, content: &str) -> Result<(), VaultError> {
    let path = resolve_in_root(root, rel)?;
    fs::write(&path, content.as_bytes()).map_err(io)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    const FIXTURES: [&str; 6] = [
        "simpel.md",
        "crlf.md",
        "geen-eind-newline.md",
        "emoji-en-accenten.md",
        "frontmatter.md",
        "tabellen-en-code.md",
    ];

    fn fixture_dir() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures")
    }

    /// Elke test krijgt een eigen map. De fixtures zelf worden nooit
    /// beschreven, anders is een tweede testrun niet meer betrouwbaar.
    fn temp_dir(label: &str) -> PathBuf {
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-tmp")
            .join(format!("{label}-{n}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("kon testmap niet aanmaken");
        dir
    }

    fn copy_fixture(into: &Path, name: &str) -> PathBuf {
        let target = into.join(name);
        fs::copy(fixture_dir().join(name), &target).expect("kon fixture niet kopiëren");
        target
    }

    // BE-01 — de belangrijkste test van de wave.
    #[test]
    fn be_01_round_trip_is_byte_identiek() {
        for name in FIXTURES {
            let dir = temp_dir("be01");
            let path = copy_fixture(&dir, name);
            let before = fs::read(&path).unwrap();

            let content = read_note(&dir, name).unwrap();
            write_note(&dir, name, &content).unwrap();

            let after = fs::read(&path).unwrap();
            assert_eq!(before, after, "fixture {name} is niet byte-identiek gebleven");
        }
    }

    #[test]
    fn be_01b_crlf_fixture_bevat_daadwerkelijk_crlf() {
        // Zonder deze controle zou BE-01 kunnen slagen op een fixture die zijn
        // CRLF onderweg al kwijt was geraakt, bijvoorbeeld via git.
        let bytes = fs::read(fixture_dir().join("crlf.md")).unwrap();
        assert!(
            bytes.windows(2).any(|w| w == b"\r\n"),
            "crlf.md bevat geen CRLF meer; de test zou niets bewijzen"
        );
    }

    // BE-02
    #[test]
    fn be_02_resolve_root_geeft_canoniek_pad() {
        let dir = temp_dir("be02");
        let sub = dir.join("sub");
        fs::create_dir_all(&sub).unwrap();

        let resolved = resolve_root(&sub.join(".")).unwrap();
        assert!(resolved.is_absolute());
        assert_eq!(resolved, fs::canonicalize(&sub).unwrap());
    }

    #[test]
    fn be_02b_resolve_root_weigert_een_bestand() {
        let dir = temp_dir("be02b");
        let file = copy_fixture(&dir, "simpel.md");
        assert_eq!(resolve_root(&file), Err(VaultError::NotADirectory));
    }

    // BE-03
    #[test]
    fn be_03_read_note_normaliseert_niets() {
        let dir = temp_dir("be03");
        copy_fixture(&dir, "crlf.md");
        copy_fixture(&dir, "geen-eind-newline.md");

        let crlf = read_note(&dir, "crlf.md").unwrap();
        assert!(crlf.contains("\r\n"), "regeleindes zijn omgezet");

        let no_newline = read_note(&dir, "geen-eind-newline.md").unwrap();
        assert!(
            !no_newline.ends_with('\n'),
            "er is een newline toegevoegd aan het eind"
        );
    }

    // BE-04
    #[test]
    fn be_04_list_markdown_filtert_en_sorteert() {
        let dir = temp_dir("be04");
        copy_fixture(&dir, "simpel.md");
        fs::write(dir.join("bravo.md"), "b").unwrap();
        fs::write(dir.join("Alpha.md"), "a").unwrap();
        fs::write(dir.join("negeer.txt"), "x").unwrap();
        fs::write(dir.join(".verborgen.md"), "x").unwrap();
        fs::create_dir_all(dir.join("submap")).unwrap();
        fs::write(dir.join("submap/diep.md"), "x").unwrap();

        let names: Vec<String> = list_markdown(&dir)
            .unwrap()
            .into_iter()
            .map(|e| e.name)
            .collect();

        assert_eq!(names, vec!["Alpha.md", "bravo.md", "simpel.md"]);
    }

    // BE-05
    #[test]
    fn be_05_write_note_maakt_nieuw_bestand_exact_aan() {
        let dir = temp_dir("be05");
        let content = "# Nieuw\r\n\r\ngeen eind-newline";

        write_note(&dir, "nieuw.md", content).unwrap();

        let bytes = fs::read(dir.join("nieuw.md")).unwrap();
        assert_eq!(bytes, content.as_bytes());
    }

    // NE-01
    #[test]
    fn ne_01_read_buiten_root_faalt() {
        let dir = temp_dir("ne01");
        fs::write(dir.join("../buiten-de-map.md"), "geheim").unwrap();

        assert_eq!(
            read_note(&dir, "../buiten-de-map.md"),
            Err(VaultError::OutsideRoot)
        );
    }

    // NE-02
    #[test]
    fn ne_02_write_buiten_root_maakt_geen_bestand() {
        let dir = temp_dir("ne02");
        let doelwit = dir.join("../mag-niet-bestaan.md");
        let _ = fs::remove_file(&doelwit);

        assert_eq!(
            write_note(&dir, "../mag-niet-bestaan.md", "x"),
            Err(VaultError::OutsideRoot)
        );
        assert!(!doelwit.exists(), "er is tóch een bestand aangemaakt");
    }

    // NE-03
    #[test]
    fn ne_03_write_met_absoluut_pad_maakt_geen_bestand() {
        let dir = temp_dir("ne03");
        let doelwit = temp_dir("ne03-doel").join("absoluut.md");

        assert_eq!(
            write_note(&dir, doelwit.to_str().unwrap(), "x"),
            Err(VaultError::OutsideRoot)
        );
        assert!(!doelwit.exists(), "er is tóch een bestand aangemaakt");
    }

    // NE-04
    #[test]
    fn ne_04_read_niet_bestaand_bestand_geeft_nette_fout() {
        let dir = temp_dir("ne04");
        assert_eq!(read_note(&dir, "bestaat-niet.md"), Err(VaultError::NotFound));
    }

    // NE-05
    #[test]
    fn ne_05_lege_map_geeft_lege_lijst() {
        let dir = temp_dir("ne05");
        assert_eq!(list_markdown(&dir).unwrap(), vec![]);
    }

    // NE-06
    #[test]
    fn ne_06_niet_bestaande_map_geeft_nette_fout() {
        let dir = temp_dir("ne06").join("bestaat-niet");
        assert_eq!(list_markdown(&dir), Err(VaultError::NotFound));
    }

    // NE-07 — een padcontrole die vóór het volgen van symlinks gebeurt is te
    // omzeilen. Deze test bewijst dat we canonicaliseren.
    #[test]
    #[cfg(unix)]
    fn ne_07_symlink_buiten_root_faalt() {
        let dir = temp_dir("ne07");
        let buiten = temp_dir("ne07-buiten");
        fs::write(buiten.join("geheim.md"), "geheim").unwrap();

        std::os::unix::fs::symlink(buiten.join("geheim.md"), dir.join("ontsnapping.md")).unwrap();

        assert_eq!(
            read_note(&dir, "ontsnapping.md"),
            Err(VaultError::OutsideRoot)
        );
    }
}
