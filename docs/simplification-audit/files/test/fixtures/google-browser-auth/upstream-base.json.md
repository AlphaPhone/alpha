# test/fixtures/google-browser-auth/upstream-base.json
- Lines: 12 | Kind: fixture (fork provenance pins) | Verdict: DELETE with the overlay
- Covers: sha256 of each upstream test file the overlay replaces; `test/google-browser-auth.test.mjs:21-29` fails when upstream changes one ("rebase the Alpha fork"). `null` for the two Alpha-only files.
- Duplicates: none. Importers: `test/google-browser-auth.test.mjs` only (grep found no other reader).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | B5 / A8 | `baseCommit` is `dae11e0b…` but the pin in `upstream.lock.json` is `8876e369…`; nothing reads the field. The file hashes do still match the current pin (verified with `shasum` against `vendor/eliza/packages/auth/android/test`). | Delete the field (or the file). | None |
| 2 | 1-12 | T5 / B5 | Exists only to keep a forked copy of upstream tests in sync — fork maintenance ceremony. | Delete once the forks are upstreamed/deleted. If the Quint harness keeps the chain template, it does not need this pin: it already hashes its inputs via `captureInputs`. | Low |

## Proposed end state
Deleted. No replacement.
