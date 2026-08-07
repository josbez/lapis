# Wave W1 Bewijsverslag — Vault openen en tonen

| | |
|---|---|
| **Status** | **Onvolledig.** De geautomatiseerde helft is af en groen; de handmatige doorloop op Jos' eigen vault kan alleen op macOS |
| **Datum** | 7 augustus 2026 |
| **Bron** | [Goal](00-goal.md) · [Spec](01-spec.md) · [Testplan](02-testplan.md) |

---

## 1. Wat er is gebouwd

Een nieuw, blijvend project `app/`, los van `spike/`: een Tauri v2-app met drie
Rust-crates (`vault-core`, `app-state`, `src-tauri`) en een React-frontend.

- `vault-core` scant een vault recursief tot een boom van mappen en `.md`-bestanden,
  slaat verborgen entries en symlinks naar buiten de vault over, herkent `.md`
  hoofdletter-ongevoelig, en schrijft nergens naartoe.
- `app-state` onthoudt het gekozen vault-pad en de sidebar-zichtbaarheid in
  `~/Library/Application Support/Lapis/settings.json`, atomair (tijdelijk bestand +
  hernoemen).
- `src-tauri` is de dunne schil: vijf commands (`open_vault`, `restore_vault`,
  `rescan_vault`, `get_sidebar_visible`, `set_sidebar_visible`), geen enkele met een
  root-parameter, strikte CSP.
- De frontend toont de lege staat of de boom, met in-/uitklappen, een selecteerbaar
  (niet-opbaar) bestand, en een sidebar-toggle die een herstart overleeft.

## 2. Testcommando's en uitkomst

Uitgevoerd op een Linux-omgeving (geen macOS beschikbaar in deze sessie) met
`libwebkit2gtk-4.1-dev` en de overige systeembibliotheken uit de CI-workflow
geïnstalleerd — anders dan bij W0 kon de Tauri-schil dit keer wél gecompileerd worden.

| Commando | Uitkomst |
|---|---|
| `cargo fmt --all -- --check` (in `app/`) | ✅ geslaagd |
| `cargo clippy --workspace --all-targets -- -D warnings` (in `app/`) | ✅ geen waarschuwingen |
| `cargo test --workspace` (in `app/`) | ✅ 26 tests in `vault-core` (integratietests, zie §4), 7 in `app-state` |
| `cargo build --workspace` (in `app/`, incl. `src-tauri`) | ✅ compileert, inclusief de Tauri-schil tegen GTK/WebKit |
| `npm run lint` | ✅ geen bevindingen |
| `npm run typecheck` | ✅ geen fouten |
| `npm test` | ✅ 12 tests (`requestGate`, `Tree`, `App`) |
| `npm run build` | ✅ bundelt zonder fouten |
| `./scripts/isolatie-check.sh --zelftest` | ✅ alle 17 checks vangen hun proef-overtreding |
| `./scripts/isolatie-check.sh` | ✅ alle 17 checks slagen op de echte repo |

## 3. Prestatiebewijs

De test `prestatie_5000_notities_onder_500ms` (`app/vault-core/tests/vault_core.rs`)
genereert 5.500 bestanden over 50 submappen en meet `scan_tree` met `Instant`. Gemeten
met `cargo test -p vault-core prestatie -- --nocapture` op de Linux-omgeving van deze
sessie:

```
prestatie_5000_notities_onder_500ms: 5500 bestanden in 23.015281ms
```

23ms tegen een budget van 500ms (Goal §9) — een factor 20 marge. Herhaalde runs in deze
sessie bleven steeds ruim onder 50ms.

**Let op:** dit is een synthetische fixture op Linux-schijf, geen meting op Jos' echte
vault op macOS (APFS, mogelijk andere I/O-karakteristiek). Het budget is hiermee
aannemelijk gemaakt, niet op het doelplatform bewezen.

## 4. Aannames uit Spec §13 — expliciet, terug te draaien

| # | Aanname | Waar in de code |
|---|---|---|
| 1 | `app-state` als aparte crate, gescheiden van `vault-core` | `app/app-state/` |
| 2 | Geen gevolgde symlinks naar mappen, ook niet binnen de vault | `scan_children` in `app/vault-core/src/lib.rs`, getest in `v2_symlink_naar_map_wordt_niet_gevolgd` |
| 3 | Een onleesbare submap faalt lokaal (`readable: false`), niet de hele scan | `scan_children`, getest in `onleesbare_submap_faalt_lokaal_niet_globaal` |
| 4 | 500ms haalbaar zonder threads, met een simpele synchrone scan | §3 hierboven |
| 5 | Sortering: mappen vóór bestanden, allebei hoofdletter-ongevoelig | `sort_nodes`, getest in `sortering_mappen_voor_bestanden` |

Extra, niet in Spec §13 maar tijdens het bouwen ontdekt en hier vastgelegd: de tests van
`vault-core` staan in `app/vault-core/tests/vault_core.rs` (Rust-integratietest tegen de
publieke API) in plaats van inline als `#[cfg(test)] mod tests` — nodig omdat de
isolatiecheck `app/vault-core/src` als platte tekst scant en anders een testfixture met
`fs::write` de eigen crate ten onrechte zou laten falen op de nieuwe schrijfvrij-regel.
Uitgelegd in de doc-comment bovenaan dat bestand en in Spec §5.3.

## 5. Wat hier niet getest is

| Wat | Waarom niet hier |
|---|---|
| `npm run tauri dev` daadwerkelijk starten, een venster zien | Geen display in deze omgeving |
| De handmatige happy flow (Goal §8, Testplan §12) | Vereist een draaiend venster |
| Jos' eigen vault openen en doorheen navigeren | Vereist macOS en Jos' `/Users/jos/Documents` |
| Het schrijfvrij-bewijs op de échte vault (`find -newer`) | Idem — het geautomatiseerde schrijfvrij-bewijs (§9.4 testplan) draait wel, tegen een fixture-vault, en slaagt |
| macOS security-scoped bookmarks bij het onthouden van het pad | Kan alleen op macOS optreden; niet reproduceerbaar op Linux (Goal §15, stopconditie als het misgaat) |
| Prestatie op APFS met een realistische, geneste mapstructuur zoals Jos' vault | Alleen de synthetische fixture is gemeten (§3) |

## 6. Bevestiging dat de scope niet is opgerekt

- Geen `open_note`/`read_note`-command toegevoegd — openen en lezen is W2.
- Geen expand/collapse-persistentie toegevoegd — niet geëist door Goal §4.
- `spike/` is niet aangeraakt; alle 20 W0-tests draaien nog ongewijzigd groen.
- Documenten 00 t/m 09 zijn niet gewijzigd.

## 7. Wat er nu van Jos nodig is

De geautomatiseerde helft van het testplan is compleet en groen. Voor de
Definition of Done (Spec §15) ontbreekt nog uitsluitend de handmatige doorloop op macOS:
Lapis bouwen en starten (`npm run tauri dev` in `app/`), de eigen vault openen,
navigeren, de sidebar verbergen/tonen, herstarten, en het schrijfvrij-bewijs met
`find ~/Documents -newer <tijdstip>` vastleggen — plus het oordeel over de vier
aannames in §4.
