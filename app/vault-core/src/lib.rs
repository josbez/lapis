//! Bestandslogica voor de vault-boom, lezen en schrijven van notities
//! (W1, W2, W3).
//!
//! Deze crate bevat geen Tauri-afhankelijkheid, zodat de tests overal draaien —
//! ook op een machine zonder de macOS- of webview-toolchain. De app in
//! `../src-tauri` is een dunne schil die deze functies als IPC-commands
//! aanbiedt. De tests staan in `../tests/vault_core.rs`, niet hier — zie de
//! uitleg bovenaan dat bestand.
//!
//! **Schrijven is beperkt tot bewerken van bestaande notities** — geen nieuw
//! bestand aanmaken (dat is F5, een latere wave), en altijd atomair: naar
//! een tijdelijk bestand in dezelfde map, `fsync`, dan `rename()` over het
//! origineel (PRD F3). Tot en met W1 mocht deze crate helemaal niets
//! schrijven (Goal W1 §11); die beperking is hier bewust en zichtbaar
//! opgeheven, precies zoals daar aangekondigd. Persistentie van het
//! vault-pad en de sidebar-status blijft apart lopen via `app-state`, dat
//! nooit binnen een vault-pad schrijft.
//!
//! Wat deze code bewust NIET doet:
//! - de inhoud ooit normaliseren: geen regeleindes omzetten, geen trailing
//!   newline toevoegen, geen witruimte opruimen — noch bij lezen, noch bij
//!   schrijven
//! - symlinks naar mappen volgen, ook niet binnen de vault (voorkomt
//!   oneindige recursie via een cyclische symlink; zie Spec W1 §5.3)
//! - stilzwijgend overschrijven wat buiten Lapis is gewijzigd: `write_note`
//!   weigert met `WriteOutcome::Conflict` zodra de wijzigingstijd op schijf
//!   afwijkt van wat er verwacht werd (PRD F3/C4, §10 besluit 1)

use std::fmt;
use std::fs;
use std::io::Write as _;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeKind {
    Dir,
    File,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TreeNode {
    pub name: String,
    /// Relatief aan de vault-root, `/`-gescheiden. Leeg voor de root zelf.
    pub rel_path: String,
    pub kind: NodeKind,
    /// `false` wanneer deze map niet gelezen kon worden (bijvoorbeeld
    /// `PermissionDenied`). Een onleesbare submap laat de rest van de boom
    /// intact — zie Spec W1 §5.3, punt 5.
    pub readable: bool,
    /// Altijd leeg voor `File`.
    pub children: Vec<TreeNode>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum VaultError {
    /// Het pad wijst buiten de gekozen map. Dit is de belangrijkste
    /// veiligheidsgarantie van deze crate.
    OutsideRoot,
    /// Het pad is leeg, `"."`, of wijst naar de vault-root zelf (Goal §0/V1).
    InvalidPath,
    /// Er is nog geen map gekozen. Een bestandsoperatie vóór de mapkeuze is
    /// geen fout van de gebruiker maar van de aanroeper.
    NoVaultSelected,
    NotFound,
    NotADirectory,
    /// Onderscheidbaar gehouden door alle lagen heen (Goal §9) — nodig voor
    /// latere waves, ook al doet W1 er zelf weinig mee.
    PermissionDenied,
    AlreadyExists,
    /// Het bestand is geen geldige UTF-8. `.md`-bestanden horen dat te zijn,
    /// maar de kern gaat niet uit van een schone vault (W2).
    InvalidUtf8,
    Io(String),
}

impl fmt::Display for VaultError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VaultError::OutsideRoot => write!(f, "pad valt buiten de gekozen map"),
            VaultError::InvalidPath => write!(f, "ongeldig pad"),
            VaultError::NoVaultSelected => write!(f, "er is nog geen map gekozen"),
            VaultError::NotFound => write!(f, "bestand of map niet gevonden"),
            VaultError::NotADirectory => write!(f, "pad is geen map"),
            VaultError::PermissionDenied => write!(f, "geen leesrechten"),
            VaultError::AlreadyExists => write!(f, "bestaat al"),
            VaultError::InvalidUtf8 => write!(f, "bestand is geen geldige UTF-8"),
            VaultError::Io(m) => write!(f, "bestandsfout: {m}"),
        }
    }
}

impl std::error::Error for VaultError {}

fn io(e: std::io::Error) -> VaultError {
    match e.kind() {
        std::io::ErrorKind::NotFound => VaultError::NotFound,
        std::io::ErrorKind::PermissionDenied => VaultError::PermissionDenied,
        std::io::ErrorKind::AlreadyExists => VaultError::AlreadyExists,
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
/// - Leeg, `"."`, of een pad dat na resolutie gelijk is aan `root` zelf →
///   `InvalidPath` (Goal §0/V1).
/// - `..`-componenten en absolute paden worden direct geweigerd.
/// - Het resultaat wordt gecanonicaliseerd vóór de vergelijking, zodat een
///   symlink die buiten de map wijst óók wordt gevangen.
pub fn resolve_in_root(root: &Path, rel: &str) -> Result<PathBuf, VaultError> {
    let root = resolve_root(root)?;
    if rel.is_empty() || rel == "." {
        return Err(VaultError::InvalidPath);
    }

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
    if resolved == root {
        return Err(VaultError::InvalidPath);
    }
    if !resolved.starts_with(&root) {
        return Err(VaultError::OutsideRoot);
    }
    Ok(resolved)
}

/// Canonicaliseert het diepste bestaande deel van een pad en plakt de rest er
/// weer aan. Nodig omdat `canonicalize` faalt op een pad dat nog niet
/// bestaat.
fn canonicalize_existing_prefix(path: &Path) -> Result<PathBuf, VaultError> {
    if path.exists() {
        return fs::canonicalize(path).map_err(io);
    }
    let parent = path.parent().ok_or(VaultError::OutsideRoot)?;
    let name = path.file_name().ok_or(VaultError::OutsideRoot)?;
    Ok(canonicalize_existing_prefix(parent)?.join(name))
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

/// Hoofdletter-ongevoelig (Goal §0/V3): `.md`, `.MD`, `.Md` tellen allemaal.
fn is_markdown(name: &str) -> bool {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("md"))
}

fn node_name(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(str::to_string)
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

fn rel_path_str(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn kind_rank(kind: NodeKind) -> u8 {
    match kind {
        NodeKind::Dir => 0,
        NodeKind::File => 1,
    }
}

/// Mappen vóór bestanden, allebei hoofdletter-ongevoelig alfabetisch. Een
/// presentatiekeuze zonder eis in Goal of PRD (Spec W1 §5.3, punt 4).
fn sort_nodes(nodes: &mut [TreeNode]) {
    nodes.sort_by(|a, b| {
        kind_rank(a.kind)
            .cmp(&kind_rank(b.kind))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
}

/// De volledige boom onder `root`: mappen en `.md`-bestanden, verborgen
/// entries overgeslagen, symlinks naar buiten de vault niet getoond (V2).
pub fn scan_tree(root: &Path) -> Result<TreeNode, VaultError> {
    let root = resolve_root(root)?;
    let children = scan_children(&root, &root)?;
    Ok(TreeNode {
        name: node_name(&root),
        rel_path: String::new(),
        kind: NodeKind::Dir,
        readable: true,
        children,
    })
}

fn scan_children(root: &Path, dir_abs: &Path) -> Result<Vec<TreeNode>, VaultError> {
    let read = fs::read_dir(dir_abs).map_err(io)?;
    let mut out = Vec::new();

    for entry in read {
        let entry = match entry {
            Ok(e) => e,
            // Een entry die verdwijnt tussen `read_dir` en het lezen ervan is
            // een race, geen structurele fout — overslaan in plaats van de
            // hele scan te laten falen.
            Err(_) => continue,
        };
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if is_hidden(&name) {
            continue;
        }

        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            // V2: wijst het doel buiten de vault, of is het onbereikbaar, dan
            // bestaat het niet voor Lapis. Een symlink naar een map binnen de
            // vault wordt niet gevolgd (voorkomt cyclische recursie).
            if let Ok(target) = fs::canonicalize(&path) {
                if target.starts_with(root) && target.is_file() && is_markdown(&name) {
                    out.push(TreeNode {
                        name: name.clone(),
                        rel_path: rel_path_str(root, &path),
                        kind: NodeKind::File,
                        readable: true,
                        children: Vec::new(),
                    });
                }
            }
            continue;
        }

        if meta.is_dir() {
            let rel = rel_path_str(root, &path);
            match scan_children(root, &path) {
                Ok(children) => out.push(TreeNode {
                    name,
                    rel_path: rel,
                    kind: NodeKind::Dir,
                    readable: true,
                    children,
                }),
                Err(VaultError::PermissionDenied) => out.push(TreeNode {
                    name,
                    rel_path: rel,
                    kind: NodeKind::Dir,
                    readable: false,
                    children: Vec::new(),
                }),
                Err(e) => return Err(e),
            }
        } else if meta.is_file() && is_markdown(&name) {
            out.push(TreeNode {
                name,
                rel_path: rel_path_str(root, &path),
                kind: NodeKind::File,
                readable: true,
                children: Vec::new(),
            });
        }
    }

    sort_nodes(&mut out);
    Ok(out)
}

/// Leest een notitie als UTF-8, zonder enige normalisatie (W2, alleen-lezen).
///
/// Regeleindes, trailing newlines en witruimte blijven precies zoals ze op
/// schijf staan.
pub fn read_note(root: &Path, rel: &str) -> Result<String, VaultError> {
    let path = resolve_in_root(root, rel)?;
    let bytes = fs::read(&path).map_err(io)?;
    String::from_utf8(bytes).map_err(|_| VaultError::InvalidUtf8)
}

/// Wat `read_note_with_mtime` teruggeeft: de inhoud plús de wijzigingstijd
/// op het moment van lezen, nodig om vóór het schrijven te kunnen zien of
/// iets buiten Lapis is veranderd (W3, PRD F3/C4).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoteContent {
    pub content: String,
    pub modified: SystemTime,
}

pub fn read_note_with_mtime(root: &Path, rel: &str) -> Result<NoteContent, VaultError> {
    let path = resolve_in_root(root, rel)?;
    let modified = fs::metadata(&path).map_err(io)?.modified().map_err(io)?;
    let bytes = fs::read(&path).map_err(io)?;
    let content = String::from_utf8(bytes).map_err(|_| VaultError::InvalidUtf8)?;
    Ok(NoteContent { content, modified })
}

/// Wat `write_note` teruggeeft.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WriteOutcome {
    Saved(SystemTime),
    /// Het bestand is op schijf gewijzigd sinds `expected` — er is niets
    /// overschreven. Geen fout: dit is een verwacht, af te handelen geval
    /// (PRD §10, besluit 1), geen programmeerfout.
    Conflict,
}

/// Schrijft een notitie atomair: naar een tijdelijk bestand in dezelfde map,
/// `fsync`, dan `rename()` over het origineel. Halve bestanden bestaan niet
/// (PRD F3).
///
/// Bewerkt een bestaand bestand — een nieuw bestand aanmaken is geen
/// W3-scope (dat is F5) en geeft `NotFound`.
///
/// `expected` is de laatst bekende wijzigingstijd (bijvoorbeeld uit
/// `read_note_with_mtime`, of uit een eerdere geslaagde `write_note`). Wijkt
/// de huidige tijd op schijf daarvan af, dan is het bestand buiten Lapis
/// gewijzigd sinds het voor het laatst gezien werd: `WriteOutcome::Conflict`,
/// zonder dat er iets overschreven wordt. Geef `None` om die controle bewust
/// te omzeilen ("mijn versie behouden" na een conflict).
pub fn write_note(
    root: &Path,
    rel: &str,
    content: &str,
    expected: Option<SystemTime>,
) -> Result<WriteOutcome, VaultError> {
    let path = resolve_in_root(root, rel)?;
    if !path.is_file() {
        return Err(VaultError::NotFound);
    }
    if let Some(expected) = expected {
        let current = fs::metadata(&path).map_err(io)?.modified().map_err(io)?;
        if current != expected {
            return Ok(WriteOutcome::Conflict);
        }
    }

    let tmp_path = temp_sibling(&path)?;
    write_atomically(&tmp_path, &path, content)?;

    let modified = fs::metadata(&path).map_err(io)?.modified().map_err(io)?;
    Ok(WriteOutcome::Saved(modified))
}

/// Slaat `content` op als een nieuwe, niet-bestaande kopie naast `rel` —
/// `notitie (conflict).md`, of met een oplopend nummer bij een
/// naamsbotsing. Voor de "beide bewaren"-keuze bij een conflict (PRD §10);
/// het bestand waar `rel` naar wijst wordt hierbij niet aangeraakt.
pub fn write_note_as_copy(root: &Path, rel: &str, content: &str) -> Result<String, VaultError> {
    let path = resolve_in_root(root, rel)?;
    let parent = path.parent().ok_or(VaultError::OutsideRoot)?;
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("notitie");
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("md");

    let mut candidate = parent.join(format!("{stem} (conflict).{ext}"));
    let mut n = 2;
    while candidate.exists() {
        candidate = parent.join(format!("{stem} (conflict {n}).{ext}"));
        n += 1;
    }

    let tmp_path = temp_sibling(&candidate)?;
    write_atomically(&tmp_path, &candidate, content)?;

    Ok(rel_path_str(root, &candidate))
}

/// Een verborgen, gegarandeerd unieke naam náást `path` — dezelfde map, zodat
/// de latere `rename()` binnen één bestandssysteem blijft (vereist voor
/// atomiciteit). Het punt vooraan laat `scan_tree` hem overslaan, mocht een
/// crash hem ooit achterlaten.
fn temp_sibling(path: &Path) -> Result<PathBuf, VaultError> {
    let parent = path.parent().ok_or(VaultError::OutsideRoot)?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or(VaultError::OutsideRoot)?;

    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    Ok(parent.join(format!(".lapis-tmp-{name}-{nanos}-{n}")))
}

/// Schrijft `content` naar `tmp_path`, `fsync`, en hernoemt dan over
/// `target`. Ruimt `tmp_path` op als de hernoeming zelf mislukt, zodat er
/// geen zwervend tijdelijk bestand achterblijft.
fn write_atomically(tmp_path: &Path, target: &Path, content: &str) -> Result<(), VaultError> {
    let mut file = fs::File::create(tmp_path).map_err(io)?;
    file.write_all(content.as_bytes()).map_err(io)?;
    file.sync_all().map_err(io)?;
    drop(file);

    let result = fs::rename(tmp_path, target).map_err(io);
    if result.is_err() {
        let _ = fs::remove_file(tmp_path);
    }
    result
}

/// Wat de Tauri-schil na een geslaagde scan aan de frontend geeft.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TreeView {
    pub root_display: String,
    pub tree: TreeNode,
}

/// De gekozen map, bewaard aan deze kant van de IPC-grens.
///
/// Zoals in W0: de frontend kan de root alleen nog *kiezen* via `open`, niet
/// meer *meegeven* (bevinding B1, [07 §4.4](../../docs/07-wave-methode.md)).
///
/// Bewust níét: sessie-persistentie (dat is `app-state`), meerdere vaults
/// tegelijk. Eén map, in het geheugen, tot de app afsluit.
#[derive(Default)]
pub struct Session {
    root: Mutex<Option<PathBuf>>,
}

impl Session {
    pub fn new() -> Self {
        Self::default()
    }

    /// Kiest een map als vault en geeft de boom terug.
    pub fn open(&self, picked: &Path) -> Result<TreeView, VaultError> {
        let root = resolve_root(picked)?;
        let tree = scan_tree(&root)?;
        let display = root.to_string_lossy().into_owned();
        *self.lock() = Some(root);
        Ok(TreeView {
            root_display: display,
            tree,
        })
    }

    /// Herscant de huidige sessie (handmatig verversen).
    pub fn rescan(&self) -> Result<TreeView, VaultError> {
        let root = self.root()?;
        let tree = scan_tree(&root)?;
        Ok(TreeView {
            root_display: root.to_string_lossy().into_owned(),
            tree,
        })
    }

    /// Probeert een eerder onthouden pad te heropenen. Bestaat het niet meer,
    /// of is het geen map meer, dan is dat geen fout maar de lege staat
    /// (Goal §0/V4) — geen sessie wordt aangemaakt.
    pub fn restore(&self, remembered: &Path) -> Result<Option<TreeView>, VaultError> {
        match self.open(remembered) {
            Ok(view) => Ok(Some(view)),
            Err(VaultError::NotFound) | Err(VaultError::NotADirectory) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Leest een notitie relatief aan de huidige vault (W2).
    pub fn read_note(&self, rel: &str) -> Result<String, VaultError> {
        read_note(&self.root()?, rel)
    }

    /// Leest een notitie mét wijzigingstijd, relatief aan de huidige vault (W3).
    pub fn read_note_with_mtime(&self, rel: &str) -> Result<NoteContent, VaultError> {
        read_note_with_mtime(&self.root()?, rel)
    }

    /// Schrijft een notitie atomair binnen de huidige vault (W3).
    pub fn write_note(
        &self,
        rel: &str,
        content: &str,
        expected: Option<SystemTime>,
    ) -> Result<WriteOutcome, VaultError> {
        write_note(&self.root()?, rel, content, expected)
    }

    /// Slaat `content` op als nieuwe kopie naast `rel`, binnen de huidige
    /// vault (W3, "beide bewaren" bij een conflict).
    pub fn write_note_as_copy(&self, rel: &str, content: &str) -> Result<String, VaultError> {
        write_note_as_copy(&self.root()?, rel, content)
    }

    fn root(&self) -> Result<PathBuf, VaultError> {
        self.lock().clone().ok_or(VaultError::NoVaultSelected)
    }

    /// Een vergiftigde lock betekent dat een andere thread paniekte terwijl
    /// hij de root vasthield. De waarde zelf is een `Option<PathBuf>` en kan
    /// niet half-geschreven zijn, dus doorgaan is hier veiliger dan paniek
    /// erbovenop.
    fn lock(&self) -> std::sync::MutexGuard<'_, Option<PathBuf>> {
        self.root.lock().unwrap_or_else(|e| e.into_inner())
    }
}
