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
use std::sync::Mutex;

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
    /// Er is nog geen map gekozen. Een bestandsoperatie vóór de mapkeuze is
    /// geen fout van de gebruiker maar van de aanroeper.
    NoVaultSelected,
    NotFound,
    NotADirectory,
    InvalidUtf8,
    Io(String),
}

impl fmt::Display for VaultError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VaultError::OutsideRoot => write!(f, "pad valt buiten de gekozen map"),
            VaultError::NoVaultSelected => write!(f, "er is nog geen map gekozen"),
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

/// De gekozen map, bewaard aan deze kant van de IPC-grens.
///
/// Waarom dit type bestaat: zonder dit gaf de frontend bij elke aanroep zelf de
/// root mee, en dan is de rel-padcontrole waterdicht terwijl de root dat niet
/// is — een bug of een gecompromitteerde webview kiest dan gewoon een andere
/// map. [07 §4.4](../../docs/07-wave-methode.md) zegt dat de frontend nooit
/// beslist of een pad geldig is; dit type maakt dat waar. De frontend kan de
/// root alleen nog *kiezen* via `open`, niet meer *meegeven*.
///
/// Bewust níét: sessie-persistentie, meerdere vaults tegelijk, herstel na een
/// verplaatste map. Eén map, in het geheugen, tot de app afsluit.
#[derive(Default)]
pub struct Session {
    root: Mutex<Option<PathBuf>>,
}

impl Session {
    pub fn new() -> Self {
        Self::default()
    }

    /// Kiest een map als vault en geeft het canonieke pad terug voor in beeld.
    pub fn open(&self, picked: &Path) -> Result<String, VaultError> {
        let root = resolve_root(picked)?;
        let display = root.to_string_lossy().into_owned();
        *self.lock() = Some(root);
        Ok(display)
    }

    pub fn list_markdown(&self) -> Result<Vec<FileEntry>, VaultError> {
        list_markdown(&self.root()?)
    }

    pub fn read_note(&self, rel: &str) -> Result<String, VaultError> {
        read_note(&self.root()?, rel)
    }

    pub fn write_note(&self, rel: &str, content: &str) -> Result<(), VaultError> {
        write_note(&self.root()?, rel, content)
    }

    fn root(&self) -> Result<PathBuf, VaultError> {
        self.lock().clone().ok_or(VaultError::NoVaultSelected)
    }

    /// Een vergiftigde lock betekent dat een andere thread paniekte terwijl hij
    /// de root vasthield. De waarde zelf is een `Option<PathBuf>` en kan niet
    /// half-geschreven zijn, dus doorgaan is hier veiliger dan paniek erbovenop.
    fn lock(&self) -> std::sync::MutexGuard<'_, Option<PathBuf>> {
        self.root.lock().unwrap_or_else(|e| e.into_inner())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    const FIXTURES: [&str; 7] = [
        "simpel.md",
        "crlf.md",
        "lone-cr.md",
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

    /// Voor tests die bewust nét buiten de vault schrijven: de vault krijgt een
    /// eigen bovenliggende map, zodat dat artefact binnen de opruimbare
    /// testmap van díé test valt en niet ernaast in `target/test-tmp/`.
    fn temp_dir_met_ouder(label: &str) -> (PathBuf, PathBuf) {
        let parent = temp_dir(label);
        let dir = parent.join("vault");
        fs::create_dir_all(&dir).expect("kon vault-map niet aanmaken");
        (parent, dir)
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
            assert_eq!(
                before, after,
                "fixture {name} is niet byte-identiek gebleven"
            );
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
        let (ouder, dir) = temp_dir_met_ouder("ne01");
        fs::write(ouder.join("buiten-de-map.md"), "geheim").unwrap();

        assert_eq!(
            read_note(&dir, "../buiten-de-map.md"),
            Err(VaultError::OutsideRoot)
        );
    }

    // NE-02
    #[test]
    fn ne_02_write_buiten_root_maakt_geen_bestand() {
        let (ouder, dir) = temp_dir_met_ouder("ne02");
        let doelwit = ouder.join("mag-niet-bestaan.md");

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
        assert_eq!(
            read_note(&dir, "bestaat-niet.md"),
            Err(VaultError::NotFound)
        );
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

    // BE-06 — de fixture bewaakt zichzelf, zoals be_01b dat voor CRLF doet.
    #[test]
    fn be_06_lone_cr_fixture_bevat_losse_cr_en_geen_lf() {
        let bytes = fs::read(fixture_dir().join("lone-cr.md")).unwrap();
        assert!(
            bytes.contains(&b'\r'),
            "lone-cr.md bevat geen CR meer; de test zou niets bewijzen"
        );
        assert!(
            !bytes.contains(&b'\n'),
            "lone-cr.md bevat een LF; dan is het geen klassiek-Mac-bestand meer"
        );
    }

    // BE-07 — de sessie is de enige plek waar de root vandaan komt.
    #[test]
    fn be_07_sessie_werkt_op_de_gekozen_map() {
        let dir = temp_dir("be07");
        copy_fixture(&dir, "simpel.md");

        let sessie = Session::new();
        let getoond = sessie.open(&dir).unwrap();
        assert_eq!(getoond, fs::canonicalize(&dir).unwrap().to_string_lossy());

        assert_eq!(
            sessie.list_markdown().unwrap(),
            vec![FileEntry {
                path: "simpel.md".into(),
                name: "simpel.md".into(),
            }]
        );

        let inhoud = sessie.read_note("simpel.md").unwrap();
        sessie.write_note("simpel.md", &inhoud).unwrap();
        assert_eq!(fs::read_to_string(dir.join("simpel.md")).unwrap(), inhoud);
    }

    // BE-08 — een tweede mapkeuze vervangt de eerste volledig.
    #[test]
    fn be_08_sessie_wisselt_van_map() {
        let eerste = temp_dir("be08-a");
        copy_fixture(&eerste, "simpel.md");
        let tweede = temp_dir("be08-b");

        let sessie = Session::new();
        sessie.open(&eerste).unwrap();
        sessie.open(&tweede).unwrap();

        assert_eq!(sessie.list_markdown().unwrap(), vec![]);
        assert_eq!(sessie.read_note("simpel.md"), Err(VaultError::NotFound));
    }

    // NE-08 — de kern van B1: zonder mapkeuze is er geen pad om te raken.
    #[test]
    fn ne_08_operatie_voor_mapkeuze_faalt_netjes() {
        let sessie = Session::new();

        assert_eq!(sessie.list_markdown(), Err(VaultError::NoVaultSelected));
        assert_eq!(
            sessie.read_note("simpel.md"),
            Err(VaultError::NoVaultSelected)
        );
        assert_eq!(
            sessie.write_note("nieuw.md", "x"),
            Err(VaultError::NoVaultSelected)
        );
    }

    // NE-09 — de sessie neemt de rel-padcontrole niet weg, hij vult hem aan.
    #[test]
    fn ne_09_sessie_weigert_paden_buiten_de_gekozen_map() {
        let (ouder, dir) = temp_dir_met_ouder("ne09");
        let doelwit = ouder.join("mag-niet-bestaan.md");

        let sessie = Session::new();
        sessie.open(&dir).unwrap();

        assert_eq!(
            sessie.read_note("../buiten-de-map.md"),
            Err(VaultError::OutsideRoot)
        );
        assert_eq!(
            sessie.write_note("../mag-niet-bestaan.md", "x"),
            Err(VaultError::OutsideRoot)
        );
        assert!(!doelwit.exists(), "er is tóch een bestand aangemaakt");
    }

    // NE-10 — een niet-bestaande map wordt geen sessie.
    #[test]
    fn ne_10_sessie_open_op_niet_bestaande_map_faalt_en_laat_geen_root_achter() {
        let dir = temp_dir("ne10").join("bestaat-niet");
        let sessie = Session::new();

        assert_eq!(sessie.open(&dir), Err(VaultError::NotFound));
        assert_eq!(sessie.list_markdown(), Err(VaultError::NoVaultSelected));
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
