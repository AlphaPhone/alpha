# scripts/with-test-mocks.ts
- Lines: 20 | Kind: script (runs a command with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`) | Verdict: DELETE (inline the env in `package.json`)
- Covers: `npm run dev:ui` and `npm run build:test-mocks` (`package.json:11,14`). Duplicates: `scripts/run-node-tests.ts` is the same kind of env wrapper (research §4). Callers: `package.json` only; listed in `quint-lib.ts:34` (source enumeration).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D4 | A process wrapper to set one variable. | `"dev:ui": "ELIZA_DEV_ALLOW_TEST_MOCKS=1 vite --host 127.0.0.1"`, `"build:test-mocks": "ELIZA_DEV_ALLOW_TEST_MOCKS=1 vite build"`. Remove from `quint-lib.ts` list. | Low: POSIX shell syntax; the `shell: win32` branch (line 14) implies Windows was considered. CI is Linux, development is macOS. Owner question if Windows matters. |
| 2 | 17–19 | B1 | Catch-all printing the message. | Gone. | None |

## Proposed end state
File deleted; two npm scripts set the variable inline; `vite.config.ts` maps it to `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` as today (`apps/app/src/build-flags.ts:2`).
