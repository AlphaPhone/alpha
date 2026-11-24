# test/quint-password-provider-dialog.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (`checkPasswordProviderDialog`, JSDOM; `browser/password-provider.ts`) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the development password-provider dialog (request, edit, vault unlock, sample fill, hide/show, screen lock, external change) follows 54 traces. Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 7-10 | B5 | Exact trace count, checkpoint floor, 12 action counters. | Drop. | None |
| 3 | — | D6, D20 | `password-provider` is a dev-only module (delete-candidates C21) that moves behind `dev/`. D20: keep code and model together. | Move the driver's path with the module; select it only when dev modules change. | Low |

## Proposed end state
Deleted; PasswordProviderDialog registered in the application index and follows the module into `dev/`.
