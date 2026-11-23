# scripts/verify-aosp-listener.ts
- Lines: 19 | Kind: manual device CLI (read-only package-manager facts for the always-on listener) | Verdict: MERGE into `scripts/aosp-check.ts listener`
- Covers: wraps `aosp-listener.ts verifyAospListener` (privileged permissions, package state) on a booted image. Duplicates: adb boilerplate with the other two `verify-aosp-*` CLIs. Callers: none (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | Comment cites "issue #424". | Drop the issue reference; describe what it checks. | None |
| 2 | 11–12 | C3 | Hand-rolled `get(key)` arg parser (14 twins in scripts). | `node:util parseArgs` in the merged CLI. | None |
| 3 | 15–17 | C3 | adb runner boilerplate. | `toolchain.ts adb(serial)`. | None |
| 4 | 18 | C3 | Reads `app.config.json` relative to cwd (others resolve from `import.meta.url`). | `readAppConfig()` helper. | Low |
| 5 | whole | A7 | No caller; PRD keeps the always-on listener (D7), so the check has value for manual image acceptance. | Merge, do not delete. | None |

## Proposed end state
`aosp-check.ts listener --serial S --user U`, same output JSON.
