# specs/quint/legacy/files-browser/README.md
- Lines: 33 | Kind: narrative doc for a historical Quint refinement campaign | Verdict: DELETE
- Covers: prose description of `check-files-browser-refinement.mjs` (three mounted Files schedules, three expected mismatches against historical profiles) and the command to run `test/quint-legacy-files-browser-refinement.test.mjs`. Duplicates: the harness's own `assumptions` strings (`check-files-browser-refinement.mjs:385-390`) say the same thing. Callers/importers: none (`git grep "legacy/files-browser/README"` finds nothing; only the directory is referenced by harness imports).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-33 | P6 / A8 | Documents a historical design comparison (`FilesBrowser.qnt`, source `ef9fbf7cd7`) that DECISIONS D11 retires with `specs/quint/legacy`. | Delete with the harness, model and test. | None |
| 2 | 20-24 | T4 | Half the README explains "expected observation mismatches": the campaign passes only because today's code differs from superseded profiles. | Nothing to carry. | None |
| 3 | 32-33 | — | Run command names `test/quint-legacy-files-browser-refinement.test.mjs`, which goes in the same deletion. | Delete together. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs`,
`specs/quint/legacy/FilesBrowser.qnt`, `test/fixtures/quint/FilesBrowserComparison.qnt` and
`test/quint-legacy-files-browser-refinement.test.mjs`. The behaviours it describes that still matter are listed in the
harness report as journey cases for `journeys/files.spec.ts`.
