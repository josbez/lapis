// De Tauri-schil van de W0-spike.
//
// Deze module bevat bewust geen logica: alles wat met bestanden te maken heeft
// staat in de crate `vault-core`, die zonder Tauri te testen is. Wat hier staat
// is de vertaling van IPC-aanroepen naar die functies, en niets meer.
//
// De gekozen map zit in `vault_core::Session`, hier als managed state. De
// frontend geeft dus geen root meer mee; hij kan er alleen één kiezen. Zonder
// dat is de rel-padcontrole waterdicht terwijl de root vrij te kiezen blijft.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use serde::Serialize;
use tauri::State;
use vault_core::Session;

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

/// De enige command die een absoluut pad accepteert — het pad dat de gebruiker
/// zelf in de mapkiezer aanwees. Daarna ligt de root in de sessie en geeft de
/// frontend alleen nog paden relatief aan die map mee.
#[tauri::command]
fn open_vault(picked: String, session: State<'_, Session>) -> Result<String, String> {
    session
        .open(&PathBuf::from(picked))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_markdown(session: State<'_, Session>) -> Result<Vec<FileEntry>, String> {
    session
        .list_markdown()
        .map(|v| v.into_iter().map(FileEntry::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn read_note(path: String, session: State<'_, Session>) -> Result<String, String> {
    session.read_note(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_note(path: String, content: String, session: State<'_, Session>) -> Result<(), String> {
    session
        .write_note(&path, &content)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Session::new())
        .invoke_handler(tauri::generate_handler![
            open_vault,
            list_markdown,
            read_note,
            write_note
        ])
        .run(tauri::generate_context!())
        .expect("kon de Tauri-app niet starten");
}
