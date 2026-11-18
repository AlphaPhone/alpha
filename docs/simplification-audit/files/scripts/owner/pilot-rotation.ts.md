# scripts/owner/pilot-rotation.ts
- Lines: 78 | Kind: release tooling (admits a pilot APK signing rotation against `android/release-signer.json` and runs `VerifyApkRotation.java`) | Verdict: KEEP (D17), MOVE beside `scripts/pilot-update.ts`
- Covers: rotation scope comes only from the committed signer descriptor (variant, device serial/fingerprint/API digests, lineage, verifier JAR digest), never from CLI pins; then the Java verifier must confirm API, installed and replacement versionCodes. Duplicates: `sha256`, digest regex (C3, twin in `pilot-rotation-journal.ts:6-7`). Callers/importers: `scripts/pilot-update.ts`; Quint `specs/quint/refinement/services/pilot-update.mjs:13` (path pin), `specs/quint/services/manifest.json`. No test imports it directly.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Release tooling in the owner-incident folder. | Move with the journal and `VerifyApkRotation.java`. | Low |
| 2 | 9-10 | C3 | Local `sha256` and digest regex. | Shared helper. | None |
| 3 | 34-41 | D9 | One 8-line boolean condition with a single error. | Split into named checks with specific messages when touching. | None |
| 4 | 65-67 | — | Verifies the apksigner JAR digest before executing it: correct trust check. | Keep. | — |

## Proposed end state
Same behaviour, relocated with the pilot journal and the Java verifier, shared hash helper, readable admission predicate.
