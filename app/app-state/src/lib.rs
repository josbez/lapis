//! Persistentie van app-instellingen buiten de vault (Goal W1 §0/V4).
//!
//! Deze crate is de enige plek in de app die schrijft naar
//! `~/Library/Application Support/Lapis/settings.json`. Ze heeft geen
//! Tauri-afhankelijkheid, zodat de tests overal draaien en nooit de echte
//! `Application Support`-map van de testmachine raken — elke test geeft een
//! eigen tijdelijk pad mee via [`Store::at`].
//!
//! Wat hier bewust wél mag wat in `vault-core` verboden is: `fs::write` en
//! `fs::rename`. De scheiding tussen de twee crates is precies waarom dat
//! geen tegenspraak is met Goal §11 — zie Spec W1 §2.

use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Hoeveel paden `recent_paths` bewaart (W5, quick switcher: "recent geopend
/// bovenaan bij lege invoer"). Geen PRD-eis, een redelijke aanname — net als
/// het prestatiebudget in W1 mag Jos dit terugdraaien.
const MAX_RECENT_PATHS: usize = 20;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Settings {
    pub vault_root: Option<PathBuf>,
    pub sidebar_visible: bool,
    /// Meest recent geopende notitie eerst, gededupliceerd.
    pub recent_paths: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            vault_root: None,
            sidebar_visible: true,
            recent_paths: Vec::new(),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct SettingsDto {
    vault_root: Option<String>,
    sidebar_visible: bool,
    // Ontbreekt in een settings.json van vóór W5 — zonder default zou zo'n
    // bestand hier in zijn geheel niet meer deserialiseren, en `load()` zou
    // dan ook vault_root en sidebar_visible stilzwijgend kwijtraken.
    #[serde(default)]
    recent_paths: Vec<String>,
}

impl From<&Settings> for SettingsDto {
    fn from(s: &Settings) -> Self {
        Self {
            vault_root: s
                .vault_root
                .as_ref()
                .map(|p| p.to_string_lossy().into_owned()),
            sidebar_visible: s.sidebar_visible,
            recent_paths: s.recent_paths.clone(),
        }
    }
}

impl From<SettingsDto> for Settings {
    fn from(dto: SettingsDto) -> Self {
        Self {
            vault_root: dto.vault_root.map(PathBuf::from),
            sidebar_visible: dto.sidebar_visible,
            recent_paths: dto.recent_paths,
        }
    }
}

/// `~/Library/Application Support/Lapis` — de map buiten de vault waar deze
/// crate zelf in schrijft, en die de Tauri-schil ook gebruikt voor
/// afgeleide gegevens die hier niet thuishoren (W6: de zoekindex, in een
/// eigen submap, per vault). Eén plek voor dat pad, zodat het niet op twee
/// plekken los hardgecodeerd staat.
pub fn app_support_dir() -> io::Result<PathBuf> {
    let home = std::env::var_os("HOME")
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "HOME is niet gezet"))?;
    Ok(PathBuf::from(home).join("Library/Application Support/Lapis"))
}

/// Eén instellingenbestand op een vast pad.
pub struct Store {
    path: PathBuf,
}

impl Store {
    /// De standaardlocatie: `~/Library/Application Support/Lapis/settings.json`
    /// (Goal §0/V4-antwoord a).
    pub fn default_location() -> io::Result<Self> {
        Ok(Self::at(app_support_dir()?.join("settings.json")))
    }

    /// Een instellingenbestand op een gekozen pad — voor tests, zodat de
    /// echte `Application Support`-map nooit wordt aangeraakt.
    pub fn at(path: PathBuf) -> Self {
        Self { path }
    }

    /// Ontbreekt het bestand, of is het corrupt, dan is de default het
    /// antwoord — nooit een paniek (Spec W1 §14.3).
    pub fn load(&self) -> Settings {
        fs::read(&self.path)
            .ok()
            .and_then(|bytes| String::from_utf8(bytes).ok())
            .and_then(|text| serde_json::from_str::<SettingsDto>(&text).ok())
            .map(Settings::from)
            .unwrap_or_default()
    }

    /// Schrijft naar een tijdelijk bestand en hernoemt het pas daarna, zodat
    /// een onderbroken schrijfactie nooit een half instellingenbestand
    /// achterlaat (dezelfde reden als W3's atomair schrijven, hier toegepast
    /// op instellingen).
    pub fn save(&self, settings: &Settings) -> io::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let dto = SettingsDto::from(settings);
        let json = serde_json::to_string_pretty(&dto)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, json)?;
        fs::rename(&tmp, &self.path)?;
        Ok(())
    }

    pub fn save_vault_root(&self, root: Option<&Path>) -> io::Result<()> {
        let mut settings = self.load();
        settings.vault_root = root.map(Path::to_path_buf);
        self.save(&settings)
    }

    pub fn save_sidebar_visible(&self, visible: bool) -> io::Result<()> {
        let mut settings = self.load();
        settings.sidebar_visible = visible;
        self.save(&settings)
    }

    /// Zet `rel_path` vooraan in `recent_paths` (W5). Stond hij er al in, dan
    /// verhuist hij naar voren in plaats van te dupliceren.
    pub fn record_note_opened(&self, rel_path: &str) -> io::Result<()> {
        let mut settings = self.load();
        settings.recent_paths.retain(|p| p != rel_path);
        settings.recent_paths.insert(0, rel_path.to_string());
        settings.recent_paths.truncate(MAX_RECENT_PATHS);
        self.save(&settings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn temp_store(label: &str) -> Store {
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-tmp")
            .join(format!("{label}-{n}"));
        let _ = fs::remove_dir_all(&dir);
        Store::at(dir.join("settings.json"))
    }

    #[test]
    fn load_zonder_bestaand_bestand_geeft_default() {
        let store = temp_store("default");
        assert_eq!(store.load(), Settings::default());
    }

    #[test]
    fn save_vault_root_en_load_rondom() {
        let store = temp_store("root");
        let pad = PathBuf::from("/tmp/een-vault");
        store.save_vault_root(Some(&pad)).unwrap();
        assert_eq!(store.load().vault_root, Some(pad));
    }

    #[test]
    fn save_vault_root_none_wist_het_pad() {
        let store = temp_store("root-none");
        store.save_vault_root(Some(Path::new("/tmp/x"))).unwrap();
        store.save_vault_root(None).unwrap();
        assert_eq!(store.load().vault_root, None);
    }

    #[test]
    fn save_sidebar_visible_en_load_rondom() {
        let store = temp_store("sidebar");
        assert!(store.load().sidebar_visible, "default moet true zijn");
        store.save_sidebar_visible(false).unwrap();
        assert!(!store.load().sidebar_visible);
    }

    #[test]
    fn sidebar_en_root_staan_los_van_elkaar() {
        let store = temp_store("los");
        store
            .save_vault_root(Some(Path::new("/tmp/vault")))
            .unwrap();
        store.save_sidebar_visible(false).unwrap();
        let settings = store.load();
        assert_eq!(settings.vault_root, Some(PathBuf::from("/tmp/vault")));
        assert!(!settings.sidebar_visible);
    }

    #[test]
    fn corrupte_json_geeft_default_geen_paniek() {
        let store = temp_store("corrupt");
        fs::create_dir_all(store.path.parent().unwrap()).unwrap();
        fs::write(&store.path, "dit is geen json").unwrap();
        assert_eq!(store.load(), Settings::default());
    }

    #[test]
    fn schrijft_nooit_in_een_meegegeven_vault_pad() {
        // Directe controle op de aanname uit Testplan §14: het schrijfpad van
        // deze crate wijst naar de settings-locatie, nooit naar de vault.
        let vault = Path::new(env!("CARGO_MANIFEST_DIR")).join("target/test-tmp/fictieve-vault");
        let _ = fs::remove_dir_all(&vault);
        fs::create_dir_all(&vault).unwrap();

        let store = temp_store("geen-vault-schrijven");
        store.save_vault_root(Some(&vault)).unwrap();
        store.save_sidebar_visible(false).unwrap();

        let inhoud: Vec<_> = fs::read_dir(&vault).unwrap().collect();
        assert!(inhoud.is_empty(), "er is iets in de vault-map geschreven");
    }

    // W5 — recente paden voor de quick switcher.

    #[test]
    fn record_note_opened_zet_vooraan() {
        let store = temp_store("recent-vooraan");
        store.record_note_opened("a.md").unwrap();
        store.record_note_opened("b.md").unwrap();
        assert_eq!(store.load().recent_paths, vec!["b.md", "a.md"]);
    }

    #[test]
    fn record_note_opened_dedupliceert_door_te_verplaatsen() {
        let store = temp_store("recent-dedupe");
        store.record_note_opened("a.md").unwrap();
        store.record_note_opened("b.md").unwrap();
        store.record_note_opened("a.md").unwrap();
        assert_eq!(store.load().recent_paths, vec!["a.md", "b.md"]);
    }

    #[test]
    fn record_note_opened_bewaart_maximaal_twintig() {
        let store = temp_store("recent-max");
        for i in 0..25 {
            store
                .record_note_opened(&format!("notitie-{i}.md"))
                .unwrap();
        }
        let recent = store.load().recent_paths;
        assert_eq!(recent.len(), 20);
        assert_eq!(recent[0], "notitie-24.md");
        assert_eq!(recent[19], "notitie-5.md");
    }

    #[test]
    fn recent_paths_is_leeg_zonder_bestaand_instellingenbestand() {
        let store = temp_store("recent-default");
        assert_eq!(store.load().recent_paths, Vec::<String>::new());
    }

    #[test]
    fn een_settingsbestand_van_voor_w5_blijft_bruikbaar() {
        // Simuleert een settings.json geschreven door W1-W3-code, zonder het
        // recent_paths-veld — moet nog steeds vault_root en sidebar_visible
        // opleveren, niet stilzwijgend terugvallen op de volledige default.
        let store = temp_store("recent-oud-bestand");
        fs::create_dir_all(store.path.parent().unwrap()).unwrap();
        fs::write(
            &store.path,
            r#"{"vault_root":"/tmp/oude-vault","sidebar_visible":false}"#,
        )
        .unwrap();

        let settings = store.load();
        assert_eq!(settings.vault_root, Some(PathBuf::from("/tmp/oude-vault")));
        assert!(!settings.sidebar_visible);
        assert_eq!(settings.recent_paths, Vec::<String>::new());
    }
}
