# specs/quint/services/scan-source-conformance.mjs
- Lines: 112 | Kind: stubbed unit harness (esbuild-bundles the real `apps/app/src/prototype/scan-document.ts` with 12 hand-written stub modules, runs it in JSDOM via `vm`) — not tied to any Quint model (imports no `.qnt`, replays no trace) | Verdict: DELETE (with `test/quint-scan-conformance.test.mjs` and the README block)
- Covers: autosave -> explicit "Save document draft" -> "Save document PDF" export leaves the explicitly saved draft in storage (no delete). Duplicates: `specs/quint/refinement/services/scan.mjs` (real Chromium + real IndexedDB draft store, replays the same sequence as a `ScanDocument` Quint trace in modes `explicit`, `explicit-then-autosave`, `unverified`, `automatic`, and asserts `export preserves the exact user-owned or unverified draft`); `test/browser/scan-draft.spec.ts` / `scan-correction.spec.ts` drive save/load draft. Callers/importers: only `test/quint-scan-conformance.test.mjs:6` (spawnSync wrapper, T9) and a manual command in `specs/quint/services/README.md:164` (`git grep scan-source-conformance` outside the audit folder: those two hits only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-112 | T4 | Same behaviour (explicit save survives confirmed export) is the final assertion of the `ScanDocument` refinement harness, which runs the real UI and real draft store and checks it against the model. This copy fakes the store and export. | Delete file. | None: refinement harness asserts the same invariant with stronger fidelity. |
| 2 | 8-35, 39-45 | T3 / T10 | 12 stub specifiers keyed on literal import strings (`'../runtime/abort-signal'`, `'./scan-pdf'`, `'../browser/scan-draft'`, `'../daily'`, `'@capacitor/core'`, ...) and a resolver that throws `Unreviewed scan dependency` for any other import. Every import added to or renamed in `scan-document.ts` breaks it (`scan.mjs` has the same brittleness; that one stays because it is the model's refinement). | Gone with the file. | None |
| 3 | 92-97 | T5 / B3 | Looks up controls by `aria-label`, which is fine, but `tickUntil` polls 100 macrotasks with no timeout semantics; flaky under load. | Gone with the file. | None |
| 4 | 1, README 158-170, verification.md 106-109,158 | A8 | Docs say the script "succeeds when it observes the documented discrepancy" (draft deleted after export). The script now asserts the opposite (`deletes === 0`, prints "saved draft preserved"), and `ScanDocument.qnt:157-158` folds `ExplicitlySavedDraftPreserved` into `safety`. The narrative is stale. | Delete README lines ~158-170 ("A controlled execution ... not an assertion that the desired preservation contract passes") together with the file. | None |
| 5 | test wrapper | T9 | `test/quint-scan-conformance.test.mjs` only spawns this script (~6 s: esbuild bundle + JSDOM). | Delete the wrapper with it. | None |

Verified: `node specs/quint/services/scan-source-conformance.mjs` passes today (6.3 s wall).

## Proposed end state
File, `test/quint-scan-conformance.test.mjs` and the `specs/quint/services/README.md` scan-source paragraph removed.
`ScanDocument` stays covered by `specs/quint/refinement/services/scan.mjs` (real UI + IndexedDB, model trace replay) and
the browser draft specs; when that harness is ported (T10) it should keep the explicit-save-then-export mode.
