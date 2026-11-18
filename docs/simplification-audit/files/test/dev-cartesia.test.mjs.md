# test/dev-cartesia.test.mjs
- Lines: 34 | Kind: tooling (imports `developmentCartesiaEnvironment` from `scripts/dev-cartesia.ts`; real temp files, chmod, symlink) | Verdict: DELETE (T5: development-only tooling, gates no release); owner question below
- Covers: `ALPHA_DEV_CARTESIA=1` must name an absolute, owner-only (0600), regular, non-empty, ≤4096-byte key file; the key contents are never returned; any other activation value throws. Duplicates: none. Callers/importers: `npm test` glob. `scripts/dev-cartesia.ts` is imported only by `scripts/start-local-remote.ts` (`npm run agent:local`, a developer launcher).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-34 | T5 / T3 | Single-function test of a developer launcher helper. Nothing it checks ships in an APK or web build. | Delete. | Low |
| 2 | — | B3 | The script re-validates a path the developer typed (symlink, size, mode). Reasonable at a trust boundary, but large for a dev knob. | Scripts review: keep the 0600 + regular-file check, drop the rest. | Low |

## Proposed end state
File deleted. If the owner wants developer-secret hygiene tested, one `test/tooling/dev-launchers.test.ts` holds this and
`dev-speech-settings` (both small, real fs) and runs only when `scripts/dev-*.ts` change.
