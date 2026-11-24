# scripts/dev-cartesia.ts
- Lines: 18 | Kind: script (dev launcher helper: opt-in Cartesia credential file for the Mac local agent) | Verdict: MERGE into `scripts/start-local-remote.ts` (using a shared `readPrivateFile` check)
- Covers: with `ALPHA_DEV_CARTESIA=1`, requires an absolute, user-owned, 0600, ≤4 KiB `CARTESIA_API_KEY_FILE` and passes only its path (never the key) to the agent. Callers: `scripts/start-local-remote.ts:15` (only). Test: `test/dev-cartesia.test.mjs`. `dev-local.ts:48` reads the same `ALPHA_DEV_CARTESIA` for the Vite flag.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-16 | C3 | Same owner-only regular-file check as `dev-speech-settings.ts:19-33` and `cloud-resident-host.ts:93-95`. | `scripts/lib/private-file.ts` `assertPrivateFile(path,{maxBytes})`; use it in all three. | Low |
| 2 | whole | D4 | 18-line module with one caller. | Inline into `start-local-remote.ts`. | Low |
| 3 | 13 | B2 | `process.getuid?.()`. | `process.getuid()` (macOS/Linux only). | Low |

## Proposed end state
Five lines inside `start-local-remote.ts` calling the shared private-file check; file removed.
