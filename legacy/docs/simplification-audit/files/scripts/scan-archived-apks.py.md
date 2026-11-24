# scripts/scan-archived-apks.py
- Lines: 75 | Kind: manual release-evidence tool (Python) | Verdict: DELETE (owner question: still run by hand?)
- Covers: scans the four archived APKs under `test-results/` for the owner's Cerebras key (raw, UTF-16, base64, hex), release DEX for androidTest classes, and debug hook class consistency; writes `static-secret-scan.json`. Duplicates: debug-hook / androidTest exclusion is already enforced by `scripts/verify-apks.ts` + `scripts/apk.ts` (dev class names) and `scripts/audit-production-bundle.ts`. Callers: only `test/archive-scan.test.mjs` (two spawns); no npm script, workflow or doc.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / T9 | No caller except its own test; CI cannot run it (needs `~/.config/alphaphone/cerebras-key`). | Delete with `test/archive-scan.test.mjs`. | Low |
| 2 | 40-63 | C5 | Debug-hook presence rule duplicates `apk.ts`/`verify-apks.ts`. | Nothing to carry. | — |
| 3 | 28-39 | C7 | The one unique check, "no provider key in any APK byte", only works on the owner's machine. If wanted, it belongs in `audit-production-bundle.ts` as an optional `--secret-file` scan of build output (TypeScript, one language). | Owner decision. | Low |
| 4 | 68-75 | B5 | Writes an evidence receipt nothing reads; exact count `len(results) != 4`. | Gone with the file. | — |

## Proposed end state
Deleted. If the owner still scans archives for the provider key, add an optional secret-file scan to
`audit-production-bundle.ts` instead of a separate Python tool.
