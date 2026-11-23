# test/digest-restart-input.test.mjs
- Lines: 32 | Kind: tooling (spawns `scripts/test-local-digest-restart.ts` with bad `ALPHA_ELIZA_SOURCE` to check its input preflight) + one package.json constant check | Verdict: DELETE
- Covers: the digest-restart check exits 2 with the exact preparation command when its prepared source is missing, and the npm script points at it. Duplicates: none. Callers/importers: `npm test`. The real check runs in `.github/workflows/digest-restart.yml:51` and `resident-prepare.yml:49`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-27 | T5 | Tests the error message of a test harness (`scripts/test-local-digest-restart.ts` is itself a test, T9). Not a release gate. | Delete. When `scripts/test-local-digest-restart.ts` moves into `test/` (T9), it should `test.skip` with that message instead of exit 2. | None. |
| 2 | 29-31 | T1 | Asserts a package.json string equals a literal. | Delete. | None. |

## Proposed end state
Deleted. The restart check itself moves to `test/integration/digest-restart.test.ts` (prepared-SDK lane), skipping with
the preparation hint when its input is missing.
