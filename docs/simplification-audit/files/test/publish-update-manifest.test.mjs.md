# test/publish-update-manifest.test.mjs
- Lines: 101 | Kind: tooling integration (real `main()` of `scripts/publish-update-manifest.ts` over temp release dirs) + transplant (`settings-facts` marker region of `settings-adapter.ts` type-stripped into a `data:` module for `parseUpdateManifest`). Research table says "C"; most of it is tooling. | Verdict: MERGE into `test/tooling/release-signing.test.ts` (import `parseUpdateManifest` directly)
- Covers: only a distributable, signed, signer-matching, row-matching release becomes the one-tap update manifest, the phone's own parser accepts it for the right flavour and version, and contradictory archive facts or bad usage write nothing. Duplicates: `test/settings-truth.test.mjs`, `test/app-update-automatic.test.mjs` and the `automatic-app-update-schedule` driver slice the same region. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16 | T2 | Slices `// settings-facts:begin`…`end` instead of importing `parseUpdateManifest`, which is already `export`ed (`settings-adapter.ts:163`). | Import it (after the planned move to `runtime/app-update.ts`, import from there). Then the marker comments can go. | Low |
| 2 | 44-58 | keep | End-to-end: release row → manifest → phone parser offers it to the right flavour only. The most valuable check in the file. | Keep. | Low |
| 3 | 60-95 | keep | Refusals (not distributable, unsigned, wrong signer, row/file mismatch, contradictory archive, usage). | Keep. | Low |
| 4 | 97-101 | keep | Signer rotation: feed uses the APK's original signing family (ties to the Q-LEG-5 rotation block kept by D17). | Keep. | Low |

## Proposed end state
Five cases in `test/tooling/release-signing.test.ts`, importing `main` and `parseUpdateManifest`. No source slicing.
