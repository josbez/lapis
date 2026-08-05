// De Tauri-schil van de W0-spike.
//
// Deze module bevat bewust geen logica: alles wat met bestanden te maken heeft
// staat in de crate `vault-core`, die zonder Tauri te testen is. Wat hier staat
// is de vertaling van IPC-aanroepen naar die functies, en niets meer.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use serde::Serialize;

#[derive(Serialize)]
struct FileEntry {
    path: String,
    name: String,
}

impl From<vault_core::FileEntry> for FileEntry {
    fn from(e: vault_core::FileEntry) -> Self {
        FileEntry {
            path: e.path,
            name: e.name,
        }
    }
}

#[tauri::command]
fn resolve_root(picked: String) -> Result<String, String> {
    vault_core::resolve_root(&PathBuf::from(picked))
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_markdown(root: String) -> Result<Vec<FileEntry>, String> {
    vault_core::list_markdown(&PathBuf::from(root))
        .map(|v| v.into_iter().map(FileEntry::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn read_note(root: String, path: String) -> Result<String, String> {
    vault_core::read_note(&PathBuf::from(root), &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_note(root: String, path: String, content: String) -> Result<(), String> {
    vault_core::write_note(&PathBuf::from(root), &path, &content).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            resolve_root,
            list_markdown,
            read_note,
            write_note
        ])
        .run(tauri::generate_context!())
        .expect("kon de Tauri-app niet starten");
}
