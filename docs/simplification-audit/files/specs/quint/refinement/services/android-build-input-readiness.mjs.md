# specs/quint/refinement/services/android-build-input-readiness.mjs
- Lines: 223 | Kind: Quint refinement harness (imports real `strictBuildInputs`, `checkoutProblems`, `preparedRuntimeProblems`, `formatReport`, `formatProblems` from `scripts/android-build-preflight.ts`; scratch Git repos for pin ancestry) | Verdict: KEEP (SIMPLIFY)
- Covers: model `AndroidBuildInputReadiness`: the `android:build:local` input report and the early/full refusals - pin equal/descendant accepted, older/unknown/mismatched refused; voice, embedding host bytes, prepared source stamp, worker, runtime profile, mobile receipt and Google host gates; signing report never discloses env values (8 traces). Duplicates: `test/strict-build-inputs.test.mjs` (same preflight functions) and the README contract that `npm run android:build` exits 2 with the command to run; the model is the only check of the report/gate ordering. Importers: `index.mjs`, `test/quint-android-build-input-readiness.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-37, 128-132 | D10 | Problems are classified by regex on message prefixes (`/^The staged resident runtime is not the native profile/`). Rewording a user-facing message breaks the formal check. | `android-build-preflight.ts` returns `{kind, message}` problems; harness reads `kind`. | Low |
| 2 | 40-45 | C3 | Local hardened `git()` wrapper; twins in `test/fixtures/android-browser-module-stage.mjs:27`, `test/fixtures/git-fixture.mjs` and ~17 script copies. | Import one `git` helper from `test/fixtures/git-fixture.mjs`. | Low |
| 3 | 97 | C3 | Inline sha256. | Shared helper. | None |
| 4 | 13-14 | B5 | `scripts/stage-embedding-host.ts`, `scripts/voice-host.ts` hashed but not imported (voice and embedding are closed ports here). | Drop from receipt sources; keep in manifest only if they change behaviour under test. | Low |
| 5 | 136-137 | B3 | `assert.equal(rows.length, labels.size)` - an exact count of report rows; adding an input forces a harness edit. | Assert each row has a label (already done next line); drop the count. | Low |

## Proposed end state
~190 lines; problem kinds instead of message regexes; shared git helper. Same 8 traces.
