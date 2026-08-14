//! Bestandslogica voor de vault-boom, lezen en schrijven van notities
//! (W1, W2, W3, W7).
//!
//! Deze crate bevat geen Tauri-afhankelijkheid, zodat de tests overal draaien —
//! ook op een machine zonder de macOS- of webview-toolchain. De app in
//! `../src-tauri` is een dunne schil die deze functies als IPC-commands
//! aanbiedt. De tests staan in `../tests/vault_core.rs`, niet hier — zie de
//! uitleg bovenaan dat bestand.
//!
//! Schrijven gaat altijd atomair: naar een tijdelijk bestand in dezelfde map,
//! `fsync`, dan `rename()` over het origineel (PRD F3). Tot en met W1 mocht
//! deze crate helemaal niets schrijven (Goal W1 §11); die beperking is in W3
//! bewust en zichtbaar opgeheven. Persistentie van het vault-pad en de
//! sidebar-status blijft apart lopen via `app-state`, dat nooit binnen een
//! vault-pad schrijft.
//!
//! **W7 (PRD F5) — bestandsbeheer:** `create_note` maakt een notitie pas op
//! schijf aan bij de allereerste opslag, genoemd naar de kopregel die er dan
//! staat (C5+V3) — vóór die eerste opslag bestaat de notitie alleen als
//! concept in de frontend, hier komt niets van in beeld. `move_note` dekt
//! zowel hernoemen als verplaatsen (één `rename()` op besturingssysteemniveau
//! is voor beide identiek). `trash_note` verwijdert nooit permanent: de
//! systeem-prullenbak via de `trash`-crate (PRD C7).
//!
//! **W8 (PRD F5/C8) — bijlagen:** `write_attachment` slaat een bijlage
//! (bijvoorbeeld een geplakte afbeelding) op naast een notitie. Bij de
//! éérste bijlage in een notitie ontstaat een map genoemd naar de notitie
//! zelf, en het `.md`-bestand verhuist daar samen met de bijlage in —
//! bestaande notities migreren daarbij nooit vanzelf (V3), alleen een
//! bijlage die via Lapis zelf wordt toegevoegd triggert dit. `read_attachment`
//! leest de bytes van een bijlage voor inline weergave, opgelost relatief
//! aan de map van de notitie die ernaar verwijst (mag, anders dan een
//! notitiepad zelf, `..`-componenten bevatten).
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
    /// Wijzigingstijd, alleen voor `File` (W6, voor `search-index`'s
    /// `sync`). Hergebruikt de metadata die `scan_children` toch al ophaalt
    /// voor `is_dir`/`is_file` — geen extra syscall. `None` voor mappen, en
    /// voor een bestand waarvan de mtime onverwacht niet te lezen was (geen
    /// reden om de hele scan te laten falen over informatie die alleen de
    /// zoekindex gebruikt).
    pub modified: Option<SystemTime>,
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
        modified: None,
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
                    let modified = fs::metadata(&target).ok().and_then(|m| m.modified().ok());
                    out.push(TreeNode {
                        name: name.clone(),
                        rel_path: rel_path_str(root, &path),
                        kind: NodeKind::File,
                        readable: true,
                        children: Vec::new(),
                        modified,
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
                    modified: None,
                }),
                Err(VaultError::PermissionDenied) => out.push(TreeNode {
                    name,
                    rel_path: rel,
                    kind: NodeKind::Dir,
                    readable: false,
                    children: Vec::new(),
                    modified: None,
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
                modified: meta.modified().ok(),
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

    let candidate = first_available_path(parent, |n| match n {
        None => format!("{stem} (conflict).{ext}"),
        Some(n) => format!("{stem} (conflict {n}).{ext}"),
    });

    let tmp_path = temp_sibling(&candidate)?;
    write_atomically(&tmp_path, &candidate, content)?;

    Ok(rel_path_str(root, &candidate))
}

/// Het eerste pad in `parent` dat nog niet bestaat, geprobeerd via `name(None)`
/// en dan oplopend `name(Some(2))`, `name(Some(3))`, … Gedeeld tussen
/// `write_note_as_copy` ("conflict"-kopieën) en `create_note`/`create_folder`
/// (naamsbotsingen bij het aanmaken) — dezelfde botsingslus, twee toepassingen.
fn first_available_path(parent: &Path, mut name: impl FnMut(Option<u32>) -> String) -> PathBuf {
    let mut candidate = parent.join(name(None));
    let mut n = 2;
    while candidate.exists() {
        candidate = parent.join(name(Some(n)));
        n += 1;
    }
    candidate
}

/// De eerste `# `-kop in `content`, of `None` als die er niet is. Gebruikt om
/// een nieuwe notitie te noemen bij de eerste opslag (C5+V3) — bewust alleen
/// de allereerste kop, geen frontmatter-titel (dat is een apart, uitgebreider
/// mechanisme dat hier niet gevraagd is).
fn first_heading(content: &str) -> Option<&str> {
    for line in content.lines() {
        if let Some(heading) = line.strip_prefix("# ") {
            let heading = heading.trim();
            if !heading.is_empty() {
                return Some(heading);
            }
        }
    }
    None
}

/// Bestandsnaamstam voor een nieuwe notitie: de eerste kopregel, ontdaan van
/// tekens die op een bestandssysteem niet als naam mogen (`/`, `:` — macOS'
/// Finder toont `:` zelf als `/` maar HFS+/APFS staan het toe; we weigeren
/// het toch, voor draagbaarheid), ingekort tot een redelijke lengte, of
/// `"Untitled"` als er nog geen kop is (leeg concept, of een opslag vóór er
/// getypt is — PRD F5 noemt dit geval niet expliciet, "Untitled" is hier de
/// aanname, net als Obsidian's eigen gedrag).
fn note_name_stem(content: &str) -> String {
    let heading = first_heading(content).unwrap_or("Untitled");
    let cleaned: String = heading
        .chars()
        .map(|c| {
            if c == '/' || c == ':' || c.is_control() {
                ' '
            } else {
                c
            }
        })
        .collect();
    let cleaned = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = cleaned.trim().trim_matches('.');
    let truncated: String = trimmed.chars().take(120).collect();
    if truncated.is_empty() {
        "Untitled".to_string()
    } else {
        truncated
    }
}

/// Wat `create_note` teruggeeft.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreatedNote {
    pub rel_path: String,
    pub modified: SystemTime,
}

/// Zet een relatief mappad om naar een absoluut pad binnen `root`, waarbij
/// (anders dan `resolve_in_root`) de lege string geldig is en naar `root`
/// zelf wijst — nodig omdat de vault-root een prima plek is om een nieuwe
/// notitie of map in aan te maken, terwijl `resolve_in_root` de root juist
/// uitsluit (dat is een regel voor *notities*, niet voor mapdoelen; Goal
/// §0/V1).
fn resolve_dir_in_root(root: &Path, dir_rel: &str) -> Result<PathBuf, VaultError> {
    if dir_rel.is_empty() {
        return Ok(root.to_path_buf());
    }
    let dir_path = Path::new(dir_rel);
    if dir_path.is_absolute() {
        return Err(VaultError::OutsideRoot);
    }
    for component in dir_path.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(VaultError::OutsideRoot),
        }
    }
    let resolved = canonicalize_existing_prefix(&root.join(dir_path))?;
    if !resolved.starts_with(root) {
        return Err(VaultError::OutsideRoot);
    }
    if !resolved.is_dir() {
        return Err(VaultError::NotADirectory);
    }
    Ok(resolved)
}

/// Maakt een nieuwe notitie aan in `dir_rel` (leeg voor de vault-root) — dit
/// ÍS de "eerste opslag" uit C5+V3: de bestandsnaam komt uit de eerste
/// kopregel van `content` op dit moment, of wordt `Untitled(.md/ 2.md/…)` als
/// die er nog niet is. Botst de naam met een bestaand bestand, dan telt er
/// een nummer bij op — nooit stilzwijgend overschrijven.
pub fn create_note(root: &Path, dir_rel: &str, content: &str) -> Result<CreatedNote, VaultError> {
    let root = resolve_root(root)?;
    let dir = resolve_dir_in_root(&root, dir_rel)?;
    let stem = note_name_stem(content);

    let target = first_available_path(&dir, |n| match n {
        None => format!("{stem}.md"),
        Some(n) => format!("{stem} {n}.md"),
    });

    let tmp_path = temp_sibling(&target)?;
    write_atomically(&tmp_path, &target, content)?;

    let modified = fs::metadata(&target).map_err(io)?.modified().map_err(io)?;
    Ok(CreatedNote {
        rel_path: rel_path_str(&root, &target),
        modified,
    })
}

/// Maakt een nieuwe, lege map aan in `dir_rel`. Botst `name` met wat er al
/// staat, dan is dat `AlreadyExists` — anders dan bij `create_note` (waar de
/// naam automatisch uit de inhoud komt) heeft de gebruiker deze naam hier
/// zelf getypt, dus mag een botsing gewoon terugkomen als foutmelding in
/// plaats van er stilzwijgend een nummer bij te plakken.
pub fn create_folder(root: &Path, dir_rel: &str, name: &str) -> Result<String, VaultError> {
    let root = resolve_root(root)?;
    let dir = resolve_dir_in_root(&root, dir_rel)?;
    let name = name.trim();
    if name.is_empty() || name.contains('/') {
        return Err(VaultError::InvalidPath);
    }

    let target = dir.join(name);
    if target.exists() {
        return Err(VaultError::AlreadyExists);
    }
    fs::create_dir(&target).map_err(io)?;
    Ok(rel_path_str(&root, &target))
}

/// Hernoemen én verplaatsen zijn dezelfde operatie: één `rename()` op
/// besturingssysteemniveau, of de doelmap nu dezelfde is (hernoemen) of een
/// andere (verplaatsen). Weigert stilzwijgend te overschrijven — bestaat
/// `to_rel` al, dan komt er `AlreadyExists` terug, niets verandert.
pub fn move_note(root: &Path, from_rel: &str, to_rel: &str) -> Result<(), VaultError> {
    let from = resolve_in_root(root, from_rel)?;
    if !from.is_file() {
        return Err(VaultError::NotFound);
    }
    let to = resolve_in_root(root, to_rel)?;
    if to.exists() {
        return Err(VaultError::AlreadyExists);
    }
    fs::rename(&from, &to).map_err(io)
}

/// Verplaatst een notitie naar de systeem-prullenbak — nooit permanent
/// verwijderen (PRD C7).
pub fn trash_note(root: &Path, rel: &str) -> Result<(), VaultError> {
    let path = resolve_in_root(root, rel)?;
    if !path.is_file() {
        return Err(VaultError::NotFound);
    }
    trash::delete(&path).map_err(|e| VaultError::Io(e.to_string()))
}

/// Zet een pad-verwijzing uit de markdown van een notitie (een afbeeldings-
/// link) om naar een absoluut pad binnen `root`, relatief aan `base` (de map
/// van de notitie zelf). Anders dan `resolve_in_root` mag dit wél
/// `..`-componenten bevatten — een notitie kan best naar een bijlage in een
/// buurmap verwijzen, bijvoorbeeld een centrale bijlagenmap uit een vault die
/// van vóór Lapis dateert (V3: bestaande notities migreren niet). Dezelfde
/// canonicalisatie als elders vangt zowel `..` als een symlink die naar
/// buiten de vault wijst af.
fn resolve_note_relative(root: &Path, base: &Path, reference: &str) -> Result<PathBuf, VaultError> {
    if reference.is_empty() {
        return Err(VaultError::InvalidPath);
    }
    let ref_path = Path::new(reference);
    if ref_path.is_absolute() {
        return Err(VaultError::OutsideRoot);
    }
    for component in ref_path.components() {
        match component {
            Component::Normal(_) | Component::CurDir | Component::ParentDir => {}
            _ => return Err(VaultError::OutsideRoot),
        }
    }
    let resolved = canonicalize_existing_prefix(&base.join(ref_path))?;
    if !resolved.starts_with(root) {
        return Err(VaultError::OutsideRoot);
    }
    Ok(resolved)
}

/// Leest de bytes van een bijlage die vanuit een notitie wordt verwezen (W8,
/// PRD F5/C8) — voor inline weergave in de editor. `image_ref` is de
/// letterlijke string uit de markdown-link (`![alt](image_ref)`), opgelost
/// relatief aan de map van `note_rel`.
pub fn read_attachment(
    root: &Path,
    note_rel: &str,
    image_ref: &str,
) -> Result<Vec<u8>, VaultError> {
    let root = resolve_root(root)?;
    let note_path = resolve_in_root(&root, note_rel)?;
    let note_dir = note_path.parent().ok_or(VaultError::OutsideRoot)?;
    let path = resolve_note_relative(&root, note_dir, image_ref)?;
    if !path.is_file() {
        return Err(VaultError::NotFound);
    }
    fs::read(&path).map_err(io)
}

/// Wat `write_attachment` teruggeeft: het pad van de bijlage, plús het
/// (mogelijk gewijzigde) pad van de notitie zelf. Bij de éérste bijlage in
/// een notitie verhuist de notitie naar een eigen map genoemd naar de
/// notitie (PRD F5/C8) — de aanroeper (Tauri-schil, dan de frontend) moet dat
/// nieuwe pad meekrijgen om zijn eigen "welke notitie staat open"-toestand
/// bij te werken, precies zoals bij `move_note`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttachmentOutcome {
    pub note_rel_path: String,
    pub attachment_rel_path: String,
    /// `true` wanneer dit de eerste bijlage in deze notitie was en de
    /// notitie daarom verhuisd is naar haar eigen map.
    pub note_moved: bool,
}

/// Bestandsnaamstam plus (optionele) extensie voor `first_available_path`'s
/// naamfunctie, botsingsvrij binnen `dir`. Gedeeld tussen de "notitie heeft
/// al een map"- en "eerste bijlage, migreren"-paden van `write_attachment`.
fn attachment_target_path(dir: &Path, filename: &str) -> PathBuf {
    let stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("bijlage")
        .to_string();
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_string);

    first_available_path(dir, |n| match (&ext, n) {
        (Some(ext), None) => format!("{stem}.{ext}"),
        (Some(ext), Some(n)) => format!("{stem} {n}.{ext}"),
        (None, None) => stem.clone(),
        (None, Some(n)) => format!("{stem} {n}"),
    })
}

/// Ontsmet een door de aanroeper voorgestelde bijlagenaam. Dit is een
/// bestandsnaam, geen pad — geen padscheidingstekens, geen `.`/`..`, geen
/// controletekens. Minder uitgebreid dan `note_name_stem` (dat een hele
/// kopregel opschoont); hier levert de aanroeper al een kale bestandsnaam,
/// bijvoorbeeld afgeleid van het klembord.
fn sanitize_attachment_name(name: &str) -> Result<String, VaultError> {
    let name = name.trim();
    if name.is_empty() || name == "." || name == ".." {
        return Err(VaultError::InvalidPath);
    }
    if name.contains('/') || name.contains('\\') || name.chars().any(char::is_control) {
        return Err(VaultError::InvalidPath);
    }
    Ok(name.to_string())
}

/// Slaat een bijlage (bijvoorbeeld een geplakte afbeelding) op bij een
/// notitie (PRD F5/C8). Is de map van de notitie al naar de notitie zelf
/// genoemd (`ergens/Notitie/Notitie.md`), dan komt de bijlage daar gewoon
/// naast. Anders is dit de éérste bijlage: er ontstaat een map met de naam
/// van de notitie, en het `.md`-bestand verhuist daar samen met de bijlage
/// in.
///
/// Volgorde is bewust: de bijlage wordt éérst geschreven, in de nieuwe map —
/// pas als dat gelukt is, verhuist de notitie zelf ernaartoe met dezelfde
/// `rename()` als `move_note`. Mislukt de bijlage-schrijfactie, dan is de
/// notitie nog geen millimeter verplaatst; er blijft hoogstens een lege
/// (opgeruimde) map achter. De notitie raken is het risicovollere,
/// onomkeerbaardere deel van deze operatie en gebeurt daarom als laatste,
/// niet als eerste.
///
/// Botst de bijlagenaam met wat er al in de doelmap staat, dan telt er een
/// nummer bij op (`first_available_path`) — nooit stilzwijgend overschrijven.
/// Bestaande notities migreren nooit vanzelf (V3): dit gebeurt alleen op het
/// moment dat er via Lapis zelf een bijlage bij komt.
pub fn write_attachment(
    root: &Path,
    note_rel: &str,
    filename: &str,
    bytes: &[u8],
) -> Result<AttachmentOutcome, VaultError> {
    let root = resolve_root(root)?;
    let note_path = resolve_in_root(&root, note_rel)?;
    if !note_path.is_file() {
        return Err(VaultError::NotFound);
    }
    let filename = sanitize_attachment_name(filename)?;

    let note_dir = note_path.parent().ok_or(VaultError::OutsideRoot)?;
    let note_stem = note_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or(VaultError::OutsideRoot)?;
    let already_in_own_folder = note_dir.file_name().and_then(|n| n.to_str()) == Some(note_stem);

    if already_in_own_folder {
        let attachment_target = attachment_target_path(note_dir, &filename);
        fs::write(&attachment_target, bytes).map_err(io)?;
        return Ok(AttachmentOutcome {
            note_rel_path: rel_path_str(&root, &note_path),
            attachment_rel_path: rel_path_str(&root, &attachment_target),
            note_moved: false,
        });
    }

    let new_dir = first_available_path(note_dir, |n| match n {
        None => note_stem.to_string(),
        Some(n) => format!("{note_stem} {n}"),
    });
    fs::create_dir(&new_dir).map_err(io)?;

    let attachment_target = attachment_target_path(&new_dir, &filename);
    if let Err(e) = fs::write(&attachment_target, bytes) {
        let _ = fs::remove_dir(&new_dir);
        return Err(io(e));
    }

    let note_filename = note_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or(VaultError::OutsideRoot)?;
    let new_note_path = new_dir.join(note_filename);
    fs::rename(&note_path, &new_note_path).map_err(io)?;

    Ok(AttachmentOutcome {
        note_rel_path: rel_path_str(&root, &new_note_path),
        attachment_rel_path: rel_path_str(&root, &attachment_target),
        note_moved: true,
    })
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

    /// Maakt een nieuwe notitie aan binnen de huidige vault (W7) — de
    /// "eerste opslag" die de bestandsnaam uit de kopregel bepaalt.
    pub fn create_note(&self, dir_rel: &str, content: &str) -> Result<CreatedNote, VaultError> {
        create_note(&self.root()?, dir_rel, content)
    }

    /// Maakt een nieuwe, lege map aan binnen de huidige vault (W7).
    pub fn create_folder(&self, dir_rel: &str, name: &str) -> Result<String, VaultError> {
        create_folder(&self.root()?, dir_rel, name)
    }

    /// Hernoemt of verplaatst een notitie binnen de huidige vault (W7).
    pub fn move_note(&self, from_rel: &str, to_rel: &str) -> Result<(), VaultError> {
        move_note(&self.root()?, from_rel, to_rel)
    }

    /// Verplaatst een notitie naar de systeem-prullenbak (W7).
    pub fn trash_note(&self, rel: &str) -> Result<(), VaultError> {
        trash_note(&self.root()?, rel)
    }

    /// Leest de bytes van een bijlage, opgelost relatief aan een notitie
    /// binnen de huidige vault (W8).
    pub fn read_attachment(&self, note_rel: &str, image_ref: &str) -> Result<Vec<u8>, VaultError> {
        read_attachment(&self.root()?, note_rel, image_ref)
    }

    /// Slaat een bijlage op bij een notitie binnen de huidige vault (W8) —
    /// migreert de notitie naar haar eigen map als dit de eerste bijlage is.
    pub fn write_attachment(
        &self,
        note_rel: &str,
        filename: &str,
        bytes: &[u8],
    ) -> Result<AttachmentOutcome, VaultError> {
        write_attachment(&self.root()?, note_rel, filename, bytes)
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
