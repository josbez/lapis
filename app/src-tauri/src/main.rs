// De Tauri-schil van Lapis.
//
// Deze module bevat bewust geen bestandslogica: die staat in `vault-core`
// (de boom, schrijfvrij) en `app-state` (instellingen, buiten de vault). Wat
// hier staat is de vertaling van IPC-aanroepen naar die twee crates, en
// niets meer (07 §4.3: geen directe bestands-I/O in deze schil).
//
// De gekozen map zit in `vault_core::Session`, hier als managed state. De
// frontend geeft dus geen root meer mee; hij kan er alleen één kiezen
// (bevinding B1).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

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

/// De enige command die een absoluut pad accepteert — het pad dat de
/// gebruiker zelf in de mapkiezer aanwees. Daarna ligt de root in de sessie
/// én in app-state, en geeft de frontend nooit meer een root mee.
#[tauri::command]
fn open_vault(picked: String, session: State<'_, Session>) -> Result<VaultViewDto, String> {
    let view = session
        .open(&PathBuf::from(&picked))
        .map_err(|e| e.to_string())?;
    store()
        .save_vault_root(Some(Path::new(&view.root_display)))
        .map_err(|e| e.to_string())?;
    Ok(view.into())
}

/// Bij opstarten: leest het onthouden pad uit app-state en probeert het te
/// heropenen. Bestaat het niet meer, dan is `None` het antwoord — de lege
/// staat, niets stilzwijgend getoond (Goal §0/V4).
#[tauri::command]
fn restore_vault(session: State<'_, Session>) -> Result<Option<VaultViewDto>, String> {
    let Some(root) = store().load().vault_root else {
        return Ok(None);
    };
    session
        .restore(&root)
        .map(|opt| opt.map(VaultViewDto::from))
        .map_err(|e| e.to_string())
}

/// Handmatig verversen van de huidige sessie.
#[tauri::command]
fn rescan_vault(session: State<'_, Session>) -> Result<VaultViewDto, String> {
    session
        .rescan()
        .map(VaultViewDto::from)
        .map_err(|e| e.to_string())
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
) -> Result<WriteOutcomeDto, String> {
    let expected = expected_modified_ms.map(from_millis);
    session
        .write_note(&path, &content, expected)
        .map(WriteOutcomeDto::from)
        .map_err(|e| e.to_string())
}

/// Slaat `content` op als nieuwe kopie naast `path` — "beide bewaren" bij
/// een conflict (PRD §10). Geeft het relatieve pad van de nieuwe kopie
/// terug, zodat de frontend de boom kan verversen.
#[tauri::command]
fn write_note_as_copy(
    path: String,
    content: String,
    session: State<'_, Session>,
) -> Result<String, String> {
    session
        .write_note_as_copy(&path, &content)
        .map_err(|e| e.to_string())
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Session::new())
        .invoke_handler(tauri::generate_handler![
            open_vault,
            restore_vault,
            rescan_vault,
            read_note,
            write_note,
            write_note_as_copy,
            get_sidebar_visible,
            set_sidebar_visible
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

    #[test]
    fn millis_rondje_blijft_gelijk() {
        let t = from_millis(1_700_000_000_123);
        assert_eq!(millis_since_epoch(t), 1_700_000_000_123);
    }
}
