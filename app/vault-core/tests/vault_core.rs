//! Integratietests voor `vault-core`, als apart bestand onder `tests/` in
//! plaats van een `#[cfg(test)] mod tests` in `src/lib.rs`.
//!
//! Waarom hier en niet inline: deze tests bouwen fixture-vaults op met
//! `fs::write`/`fs::create_dir_all`, en de isolatiecheck uit Goal W1 §11
//! ("geen schrijfaanroep in de kern") scant `vault-core/src` als tekst — hij
//! kan geen onderscheid maken tussen een `fs::write` in productiecode en een
//! in testcode. Door de tests hier te zetten, buiten `src/`, blijft `src/`
//! aantoonbaar schrijfvrij én blijven de tests gewoon tegen de publieke API
//! draaien (alles hieronder gebruikt uitsluitend `pub` items van `vault-core`).

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;
use vault_core::*;

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

fn temp_dir_met_ouder(label: &str) -> (PathBuf, PathBuf) {
    let parent = temp_dir(label);
    let dir = parent.join("vault");
    fs::create_dir_all(&dir).expect("kon vault-map niet aanmaken");
    (parent, dir)
}

fn write(dir: &Path, rel: &str, content: &str) {
    let path = dir.join(rel);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

fn names_of(nodes: &[TreeNode]) -> Vec<&str> {
    nodes.iter().map(|n| n.name.as_str()).collect()
}

fn find<'a>(nodes: &'a [TreeNode], name: &str) -> &'a TreeNode {
    nodes
        .iter()
        .find(|n| n.name == name)
        .unwrap_or_else(|| panic!("knooppunt {name} niet gevonden"))
}

// W2 — read_note. Dezelfde randgevallen als W0's BE-01, nu voor lezen.
fn fixture_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn copy_fixture(into: &Path, name: &str) -> PathBuf {
    let target = into.join(name);
    fs::copy(fixture_dir().join(name), &target).expect("kon fixture niet kopiëren");
    target
}

const FIXTURES: [&str; 7] = [
    "simpel.md",
    "crlf.md",
    "lone-cr.md",
    "geen-eind-newline.md",
    "emoji-en-accenten.md",
    "frontmatter.md",
    "tabellen-en-code.md",
];

// Bewijst dat het Display-contract voor alle varianten intact is, ook
// voor gevallen die W1 zelf niet produceert maar die Goal §9 als
// onderscheidbaar eist voor latere waves.
#[test]
fn display_dekt_alle_varianten() {
    let varianten = [
        VaultError::OutsideRoot,
        VaultError::InvalidPath,
        VaultError::NoVaultSelected,
        VaultError::NotFound,
        VaultError::NotADirectory,
        VaultError::PermissionDenied,
        VaultError::AlreadyExists,
        VaultError::Io("x".into()),
    ];
    for v in varianten {
        assert!(!v.to_string().is_empty());
    }
}

// V1 — een leeg pad, een pad naar de vault-root zelf, moet netjes stranden.
#[test]
fn v1_leeg_pad_geeft_invalid_path() {
    let dir = temp_dir("v1a");
    assert_eq!(resolve_in_root(&dir, ""), Err(VaultError::InvalidPath));
}

#[test]
fn v1_punt_geeft_invalid_path() {
    let dir = temp_dir("v1b");
    assert_eq!(resolve_in_root(&dir, "."), Err(VaultError::InvalidPath));
}

// ".."-componenten worden altijd geweigerd (OutsideRoot), ook wanneer ze
// per saldo op root zouden uitkomen — dat is bestaand W0-gedrag en blijft
// zo. Om een pad te krijgen dat ná resolutie op root zelf uitkomt zonder
// een ".."-component, gebruiken we een symlink die naar root zelf wijst.
#[test]
#[cfg(unix)]
fn v1_pad_dat_via_symlink_naar_root_zelf_resolveert_geeft_invalid_path() {
    let dir = temp_dir("v1c");
    std::os::unix::fs::symlink(&dir, dir.join("naar-mezelf")).unwrap();
    assert_eq!(
        resolve_in_root(&dir, "naar-mezelf"),
        Err(VaultError::InvalidPath)
    );
}

#[test]
fn v1_dubbele_punt_component_geeft_outside_root_niet_invalid_path() {
    // Vastgelegd gedrag, geen verrassing: ".."-componenten worden altijd
    // als OutsideRoot geweigerd, vóórdat er iets gecanonicaliseerd wordt.
    let dir = temp_dir("v1d");
    fs::create_dir_all(dir.join("sub")).unwrap();
    assert_eq!(
        resolve_in_root(&dir, "sub/.."),
        Err(VaultError::OutsideRoot)
    );
}

// V2 — een symlink die buiten de vault wijst, bestaat niet voor Lapis.
#[test]
#[cfg(unix)]
fn v2_symlink_naar_bestand_buiten_vault_niet_in_boom() {
    let (ouder, dir) = temp_dir_met_ouder("v2");
    write(&ouder, "geheim.md", "geheim");
    std::os::unix::fs::symlink(ouder.join("geheim.md"), dir.join("ontsnapping.md")).unwrap();
    write(&dir, "gewoon.md", "x");

    let tree = scan_tree(&dir).unwrap();
    assert_eq!(names_of(&tree.children), vec!["gewoon.md"]);
}

#[test]
#[cfg(unix)]
fn v2_symlink_naar_map_wordt_niet_gevolgd() {
    let dir = temp_dir("v2b");
    fs::create_dir_all(dir.join("echt")).unwrap();
    write(&dir, "echt/binnen.md", "x");
    std::os::unix::fs::symlink(dir.join("echt"), dir.join("gekoppeld")).unwrap();

    let tree = scan_tree(&dir).unwrap();
    // De symlink zelf is een map-achtige entry die niet gevolgd wordt:
    // hij verschijnt niet in de boom, zoals een symlink naar buiten.
    assert!(
        tree.children.iter().all(|n| n.name != "gekoppeld"),
        "symlink naar een map had niet gevolgd moeten worden"
    );
    assert_eq!(names_of(&tree.children), vec!["echt"]);
}

// V3 — hoofdletter-ongevoelig.
#[test]
fn v3_hoofdletter_ongevoelige_md_herkenning() {
    let dir = temp_dir("v3");
    write(&dir, "a.md", "x");
    write(&dir, "B.MD", "x");
    write(&dir, "c.Md", "x");
    write(&dir, "genegeerd.txt", "x");

    let tree = scan_tree(&dir).unwrap();
    assert_eq!(names_of(&tree.children), vec!["a.md", "B.MD", "c.Md"]);
}

// Verborgen mappen en bestanden.
#[test]
fn verborgen_entries_worden_overgeslagen() {
    let dir = temp_dir("verborgen");
    fs::create_dir_all(dir.join(".git")).unwrap();
    write(&dir, ".git/config", "x");
    fs::create_dir_all(dir.join(".obsidian")).unwrap();
    write(&dir, ".obsidian/workspace.json", "x");
    write(&dir, ".verborgen.md", "x");
    write(&dir, "zichtbaar.md", "x");

    let tree = scan_tree(&dir).unwrap();
    assert_eq!(names_of(&tree.children), vec!["zichtbaar.md"]);
}

// Boomstructuur: geneste mappen, lege submap, submap zonder .md.
#[test]
fn boomstructuur_geneste_en_lege_mappen() {
    let dir = temp_dir("boom");
    fs::create_dir_all(dir.join("leeg")).unwrap();
    fs::create_dir_all(dir.join("zonder-md")).unwrap();
    write(&dir, "zonder-md/notitie.txt", "x");
    write(&dir, "diep/nog-dieper/notitie.md", "x");

    let tree = scan_tree(&dir).unwrap();
    assert_eq!(names_of(&tree.children), vec!["diep", "leeg", "zonder-md"]);

    let leeg = find(&tree.children, "leeg");
    assert!(leeg.children.is_empty());

    let zonder_md = find(&tree.children, "zonder-md");
    assert!(zonder_md.children.is_empty());

    let diep = find(&tree.children, "diep");
    let nog_dieper = find(&diep.children, "nog-dieper");
    let notitie = find(&nog_dieper.children, "notitie.md");
    assert_eq!(notitie.rel_path, "diep/nog-dieper/notitie.md");
    assert_eq!(notitie.kind, NodeKind::File);
}

// Sortering: mappen vóór bestanden, allebei hoofdletter-ongevoelig.
#[test]
fn sortering_mappen_voor_bestanden() {
    let dir = temp_dir("sortering");
    write(&dir, "aardbei.md", "x");
    fs::create_dir_all(dir.join("Zebra")).unwrap();
    write(&dir, "banaan.md", "x");
    fs::create_dir_all(dir.join("appel")).unwrap();

    let tree = scan_tree(&dir).unwrap();
    assert_eq!(
        names_of(&tree.children),
        vec!["appel", "Zebra", "aardbei.md", "banaan.md"]
    );
}

// Padveiligheid — voortzetting van W0's bewijs op de recursieve scan.
#[test]
fn ne_read_buiten_root_faalt() {
    let (ouder, dir) = temp_dir_met_ouder("ne1");
    write(&ouder, "buiten.md", "geheim");
    assert_eq!(
        resolve_in_root(&dir, "../buiten.md"),
        Err(VaultError::OutsideRoot)
    );
}

#[test]
fn ne_absoluut_pad_faalt() {
    let dir = temp_dir("ne2");
    let elders = temp_dir("ne2-elders");
    assert_eq!(
        resolve_in_root(&dir, elders.to_str().unwrap()),
        Err(VaultError::OutsideRoot)
    );
}

#[test]
#[cfg(unix)]
fn ne_symlink_buiten_root_faalt_bij_resolve() {
    let (ouder, dir) = temp_dir_met_ouder("ne3");
    write(&ouder, "geheim.md", "geheim");
    std::os::unix::fs::symlink(ouder.join("geheim.md"), dir.join("link.md")).unwrap();
    assert_eq!(
        resolve_in_root(&dir, "link.md"),
        Err(VaultError::OutsideRoot)
    );
}

// Negatieve tests uit Spec §14.6 / Testplan §9.6.
#[test]
fn scan_tree_op_niet_bestaande_map_geeft_not_found() {
    let dir = temp_dir("neg1").join("bestaat-niet");
    assert_eq!(scan_tree(&dir), Err(VaultError::NotFound));
}

#[test]
fn scan_tree_op_bestand_geeft_not_a_directory() {
    let dir = temp_dir("neg2");
    write(&dir, "bestand.md", "x");
    assert_eq!(
        scan_tree(&dir.join("bestand.md")),
        Err(VaultError::NotADirectory)
    );
}

#[test]
#[cfg(unix)]
fn onleesbare_submap_faalt_lokaal_niet_globaal() {
    use std::os::unix::fs::PermissionsExt;

    let dir = temp_dir("permissie");
    fs::create_dir_all(dir.join("ontoegankelijk")).unwrap();
    write(&dir, "ontoegankelijk/geheim.md", "x");
    write(&dir, "zichtbaar.md", "x");

    let mut perms = fs::metadata(dir.join("ontoegankelijk"))
        .unwrap()
        .permissions();
    perms.set_mode(0o000);
    fs::set_permissions(dir.join("ontoegankelijk"), perms).unwrap();

    // Root draait tests vaak als root en negeert permissiebits; sla de
    // assertie dan over in plaats van een vals-positieve/negatieve test.
    let is_root = std::env::var("USER").as_deref() == Ok("root") || unsafe { libc_geteuid() } == 0;

    let result = scan_tree(&dir);

    // Herstel de rechten sowieso, ook als de assertie hieronder afwijkt,
    // zodat de testmap achteraf opgeruimd kan worden.
    let mut restore = fs::metadata(dir.join("ontoegankelijk"))
        .unwrap()
        .permissions();
    restore.set_mode(0o755);
    let _ = fs::set_permissions(dir.join("ontoegankelijk"), restore);

    if is_root {
        return;
    }

    let tree = result.expect("een onleesbare submap mag de hele scan niet laten falen");
    assert_eq!(
        names_of(&tree.children),
        vec!["ontoegankelijk", "zichtbaar.md"]
    );
    let ontoegankelijk = find(&tree.children, "ontoegankelijk");
    assert!(!ontoegankelijk.readable);
    assert!(ontoegankelijk.children.is_empty());
}

#[cfg(unix)]
unsafe fn libc_geteuid() -> u32 {
    extern "C" {
        fn geteuid() -> u32;
    }
    geteuid()
}

// Session
#[test]
fn sessie_open_geeft_boom_en_onthoudt_root() {
    let dir = temp_dir("sessie1");
    write(&dir, "notitie.md", "x");

    let sessie = Session::new();
    let view = sessie.open(&dir).unwrap();
    assert_eq!(
        view.root_display,
        fs::canonicalize(&dir).unwrap().to_string_lossy()
    );
    assert_eq!(names_of(&view.tree.children), vec!["notitie.md"]);
}

#[test]
fn sessie_open_op_niet_bestaande_map_laat_geen_sessie_achter() {
    let dir = temp_dir("sessie2").join("weg");
    let sessie = Session::new();
    assert_eq!(sessie.open(&dir), Err(VaultError::NotFound));
    assert_eq!(sessie.rescan(), Err(VaultError::NoVaultSelected));
}

#[test]
fn sessie_rescan_vereist_geopende_sessie() {
    let sessie = Session::new();
    assert_eq!(sessie.rescan(), Err(VaultError::NoVaultSelected));
}

#[test]
fn sessie_rescan_ziet_nieuwe_bestanden() {
    let dir = temp_dir("sessie3");
    let sessie = Session::new();
    sessie.open(&dir).unwrap();
    write(&dir, "later.md", "x");
    let view = sessie.rescan().unwrap();
    assert_eq!(names_of(&view.tree.children), vec!["later.md"]);
}

#[test]
fn sessie_restore_op_verdwenen_pad_geeft_none() {
    let dir = temp_dir("sessie4").join("weg");
    let sessie = Session::new();
    assert_eq!(sessie.restore(&dir), Ok(None));
}

#[test]
fn sessie_restore_op_bestand_in_plaats_van_map_geeft_none() {
    let dir = temp_dir("sessie5");
    write(&dir, "was-een-map.md", "x");
    let sessie = Session::new();
    assert_eq!(sessie.restore(&dir.join("was-een-map.md")), Ok(None));
}

#[test]
fn sessie_restore_op_geldig_pad_geeft_boom() {
    let dir = temp_dir("sessie6");
    write(&dir, "notitie.md", "x");
    let sessie = Session::new();
    let view = sessie.restore(&dir).unwrap().unwrap();
    assert_eq!(names_of(&view.tree.children), vec!["notitie.md"]);
}

// Schrijfvrij — het belangrijkste bewijs van deze wave.
#[test]
fn schrijfvrij_scan_laat_geen_spoor_achter() {
    let dir = temp_dir("schrijfvrij");
    write(&dir, "a.md", "inhoud a");
    write(&dir, "sub/b.md", "inhoud b");
    fs::create_dir_all(dir.join("leeg")).unwrap();

    fn snapshot(dir: &Path) -> Vec<(String, std::time::SystemTime)> {
        fn walk(dir: &Path, out: &mut Vec<(String, std::time::SystemTime)>) {
            let mut entries: Vec<_> = fs::read_dir(dir).unwrap().map(|e| e.unwrap()).collect();
            entries.sort_by_key(|e| e.path());
            for entry in entries {
                let meta = entry.metadata().unwrap();
                out.push((
                    entry.path().to_string_lossy().into_owned(),
                    meta.modified().unwrap(),
                ));
                if meta.is_dir() {
                    walk(&entry.path(), out);
                }
            }
        }
        let mut out = Vec::new();
        walk(dir, &mut out);
        out
    }

    let voor = snapshot(&dir);
    for _ in 0..3 {
        scan_tree(&dir).unwrap();
    }
    let na = snapshot(&dir);

    assert_eq!(voor, na, "de scan heeft sporen achtergelaten in de vault");
}

// Prestatie — Goal §9: 5.000+ notities binnen 500 ms.
#[test]
fn prestatie_5000_notities_onder_500ms() {
    let dir = temp_dir("prestatie");
    let mut geteld = 0usize;
    'buiten: for map in 0..50 {
        let submap = dir.join(format!("map-{map:03}"));
        fs::create_dir_all(&submap).unwrap();
        for bestand in 0..110 {
            write(&submap, &format!("notitie-{bestand:04}.md"), "x");
            geteld += 1;
            if geteld >= 5_500 {
                break 'buiten;
            }
        }
    }
    assert!(geteld >= 5_000, "fixture heeft niet genoeg bestanden");

    let start = Instant::now();
    let tree = scan_tree(&dir).unwrap();
    let duur = start.elapsed();

    let totaal: usize = tree
        .children
        .iter()
        .map(|submap| submap.children.len())
        .sum();
    assert_eq!(totaal, geteld);

    eprintln!("prestatie_5000_notities_onder_500ms: {geteld} bestanden in {duur:?}");
    assert!(
        duur.as_millis() < 500,
        "scan duurde {duur:?}, budget is 500ms (Goal W1 §9)"
    );
}

// W2 — read_note geeft de inhoud terug precies zoals ze op schijf staat,
// voor elke fixture die een bekende manier is om tekst stilletjes te
// beschadigen (dezelfde randgevallen als W0's BE-01/BE-03).
#[test]
fn w2_read_note_geeft_inhoud_byte_voor_byte_als_string() {
    for name in FIXTURES {
        let dir = temp_dir("w2-lezen");
        let path = copy_fixture(&dir, name);
        let op_schijf = fs::read(&path).unwrap();

        let gelezen = read_note(&dir, name).unwrap();

        assert_eq!(
            gelezen.as_bytes(),
            op_schijf.as_slice(),
            "fixture {name} is niet byte-identiek uit read_note gekomen"
        );
    }
}

#[test]
fn w2_read_note_normaliseert_regeleindes_niet() {
    let dir = temp_dir("w2-regeleindes");
    copy_fixture(&dir, "crlf.md");
    copy_fixture(&dir, "geen-eind-newline.md");
    copy_fixture(&dir, "lone-cr.md");

    let crlf = read_note(&dir, "crlf.md").unwrap();
    assert!(crlf.contains("\r\n"), "regeleindes zijn omgezet");

    let geen_newline = read_note(&dir, "geen-eind-newline.md").unwrap();
    assert!(
        !geen_newline.ends_with('\n'),
        "er is een newline toegevoegd aan het eind"
    );

    let lone_cr = read_note(&dir, "lone-cr.md").unwrap();
    assert!(lone_cr.contains('\r'), "de losse CR is verdwenen");
    assert!(!lone_cr.contains('\n'), "er is een LF bijgekomen");
}

#[test]
fn w2_read_note_op_niet_bestaand_bestand_geeft_nette_fout() {
    let dir = temp_dir("w2-ontbreekt");
    assert_eq!(
        read_note(&dir, "bestaat-niet.md"),
        Err(VaultError::NotFound)
    );
}

#[test]
fn w2_read_note_buiten_root_faalt() {
    let (ouder, dir) = temp_dir_met_ouder("w2-buiten");
    write(&ouder, "geheim.md", "geheim");
    assert_eq!(
        read_note(&dir, "../geheim.md"),
        Err(VaultError::OutsideRoot)
    );
}

// V1 geldt ook voor read_note, via dezelfde resolve_in_root.
#[test]
fn w2_read_note_op_leeg_pad_geeft_invalid_path() {
    let dir = temp_dir("w2-leeg-pad");
    assert_eq!(read_note(&dir, ""), Err(VaultError::InvalidPath));
}

#[test]
fn w2_read_note_op_ongeldige_utf8_geeft_nette_fout() {
    let dir = temp_dir("w2-utf8");
    fs::write(dir.join("kapot.md"), [0x66, 0x6f, 0xff, 0x6f]).unwrap();
    assert_eq!(read_note(&dir, "kapot.md"), Err(VaultError::InvalidUtf8));
}

#[test]
fn w2_sessie_read_note_werkt_op_de_geopende_vault() {
    let dir = temp_dir("w2-sessie");
    write(&dir, "notitie.md", "inhoud van de notitie");

    let sessie = Session::new();
    sessie.open(&dir).unwrap();

    assert_eq!(
        sessie.read_note("notitie.md").unwrap(),
        "inhoud van de notitie"
    );
}

#[test]
fn w2_sessie_read_note_vereist_geopende_sessie() {
    let sessie = Session::new();
    assert_eq!(
        sessie.read_note("notitie.md"),
        Err(VaultError::NoVaultSelected)
    );
}

// Zelfbewaking van de fixtures, zoals W0's be_01b/be_06 dat deden — anders
// zou een test kunnen slagen op een fixture die zijn kenmerk al kwijt is.
#[test]
fn w2_crlf_fixture_bevat_daadwerkelijk_crlf() {
    let bytes = fs::read(fixture_dir().join("crlf.md")).unwrap();
    assert!(bytes.windows(2).any(|w| w == b"\r\n"));
}

#[test]
fn w2_lone_cr_fixture_bevat_losse_cr_en_geen_lf() {
    let bytes = fs::read(fixture_dir().join("lone-cr.md")).unwrap();
    assert!(bytes.contains(&b'\r'));
    assert!(!bytes.contains(&b'\n'));
}
