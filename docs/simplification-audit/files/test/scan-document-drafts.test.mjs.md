# test/scan-document-drafts.test.mjs
- Lines: 78 | Kind: transplant-bundle (esbuild bundles real `prototype/scan-document.ts` with 12 imports replaced by inline stubs; jsdom) | Verdict: REWRITE as cases in `journeys/camera-photos.spec.ts`
- Covers: a stored draft offers Resume/Delete; Delete unblocks autosave; native Close with autosaved pages asks Keep/Discard; Back dismisses the question; `pagehide` keeps the draft; web Close does not ask; Discard works during PDF preparation. Duplicates: partial in `test/browser/scan-draft.spec.ts`, `scan-keep.spec.ts`, `scan-document.spec.ts` (no spec found asserting "Keep draft"/"Discard draft"). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-17 | T2 | Stub map keyed by literal import specifiers, including a deep `.eliza` path (D13); any import change breaks it. | Delete. | Low |
| 2 | 25-37 | T3 | jsdom with patched `showModal`, globals assigned to `globalThis`. | Goes with the file. | Low |

## Proposed end state
Delete after the journey (native Capacitor fake from `scan-native-page-camera.spec.ts`) carries: (1) stored draft →
Resume/Delete with review; (2) native Close → Keep/Discard question, Back dismisses; (3) Keep leaves the draft;
(4) web Close closes without asking.
