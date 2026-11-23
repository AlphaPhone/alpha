# scripts/stage-os-update-enrollment.ts
- Lines: 69 | Kind: manual OS-image staging tool | Verdict: KEEP pending owner (D17: device/image concern), SIMPLIFY
- Covers: writes the product-owned OTA enrollment (manifest URL, hosts, OTA certificate overlay and make fragment) into an AOSP source tree for preserving pilot devices, with a receipt. Duplicates: none. Callers: only `test/os-update-enrollment.test.mjs:25`; no npm script, workflow or doc.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 (question) | Only its test runs it. It concerns pilot devices' OTA keys (`legacyBuildFingerprint`), which D17 keeps out of scope for deletion without an owner answer. | Owner question: is the pilot enrollment still staged by hand? If not, delete with its test and `android/aosp/pilot-system-update-enrollment.json`. | Medium if deleted wrongly (pilot phones stop receiving OS updates). |
| 2 | 25-31 | B3 | Re-checks the committed profile JSON against hard-coded values (purpose, product, URL path, host list). The hard-coded copy is the real policy; the JSON just repeats it. | Either generate from the JSON after one schema check, or drop the JSON fields and keep the constants here. One source of truth. | Low |
| 3 | 14-19, 33 | C3 | Hand-rolled argv parser plus a `value()` accessor. | `parseArgs`. | — |
| 4 | 21 | D11 | Local function named `require` shadows the CommonJS name. | Rename `check`. | — |
| 5 | 20 | C3 | sha256 helper. | Shared helper. | — |

## Proposed end state
If kept: ~45 lines, one source of truth for the enrollment policy, standard arg parsing; test stays as
the CLI integration test (dry-run and `--execute` on a fixture source tree).
