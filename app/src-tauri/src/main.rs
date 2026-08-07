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

use serde::Serialize;
use tauri::State;
use vault_core::{NodeKind, Session, TreeNode, TreeView};

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

/// Leest een notitie relatief aan de huidige vault (W2, alleen-lezen — er is
/// nog geen command dat schrijft, dat is W3).
#[tauri::command]
fn read_note(path: String, session: State<'_, Session>) -> Result<String, String> {
    session.read_note(&path).map_err(|e| e.to_string())
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
            get_sidebar_visible,
            set_sidebar_visible
        ])
        .run(tauri::generate_context!())
        .expect("kon de Tauri-app niet starten");
}
