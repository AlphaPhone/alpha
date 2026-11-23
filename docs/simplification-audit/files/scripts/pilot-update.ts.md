# scripts/pilot-update.ts
- Lines: 410 | Kind: operator tool (manual CLI + library) | Verdict: KEEP, SIMPLIFY
- Covers: in-place update of a provisioned pilot unit (signer/versionCode admission, HOME move-away and restore, per-file data readback before/after via run-as or the release integrity export, agent restart check, reviewed signer rotation journal). Duplicates: `test-installed-upgrade.ts` (one-domain predecessor, header line 9). Callers/importers: no npm/CI caller; `README.md:266` documents it; `provision-unit.ts` refers to it; `test/pilot-units.test.mjs`, `test/pilot-update-export.test.mjs`; Quint `specs/quint/refinement/services/pilot-update.mjs` imports `planHome`/`updateUnit` and runs them (import-based harness, good); `android/.../release/DataIntegrityProvider.java` comment.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 74-77, 410 | D7 | Re-exports of upstream parsers (`compareDomains`, `DOMAIN_SCRIPT`, `parseDomainInventory`, `parseIntegrityExport`, `readbackInventory`), alias `updateAdmission`, and `export { sha256 }` exist only so tests import them from here. | Delete re-exports; tests that exercise upstream parsers are T5 (upstream's own tests). | low |
| 2 | 72 | C3 | Local sha256 (twin in `provision-unit.ts:39`). | Shared hash helper. | low |
| 3 | 49 | C1 | `type Adb` re-derived here, in `provision-unit.ts:74`, `ci/emulator-suite.ts:50`, `android-instrumentation.ts:85`. | One exported `Adb` type (with `adbFor`) in `toolchain.ts` or `scripts/lib/adb.ts`. | low |
| 4 | 286-305 | C3 | Hand-written argv splicing for `--units`, `--stock-home`, `--rotation-lineage` before handing the rest to `parseUnitArgs`. | Extend `parseUnitArgs` (or `node:util parseArgs`) with these options. | low |
| 5 | 100 | C3 | `Atomics.wait` sleep; twin in `prepare-client-features.ts:455`. | Shared `sleepSync`. | none |
| 6 | 151-176 | — | Agent restart judged by regexes over logcat text; inherent to an on-device check, acceptable. | Keep. | — |
| 7 | 179-262 | D9 | `updateUnit` is ~85 lines with eight mutable flags. | Split: `quiesce()`, `readback()`, `install()`, `restore()`; keep the result shape. | medium (Quint pilot-update harness drives it) |

## Proposed end state
A ~300-line operator tool with one argument parser, shared adb/hash types, no test-only re-exports. `test/pilot-update-export.test.mjs` (18 cases, mostly upstream parser units) is deleted; `test/pilot-units.test.mjs` keeps the fake-adb integration cases of `updateUnit`/`planHome` that the Quint harness does not already cover (owner should confirm the Quint model is the canonical coverage, in which case the host test goes too).
