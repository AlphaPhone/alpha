# apps/app/src/browser/note-recording-journal.ts
- Lines: 66 | Role: pending browser voice-note segment journal (manifest + standalone clip documents) | Verdict: SIMPLIFY
- Importers: 1 (voice.ts). Text/path pins: specs/quint/application/manifest.json; refinement browser-note-recording-journal.mjs (imports module), notes-recorder-media-admission.mjs; test/browser-note-pending-audio.test.mjs (reads source); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | C1 | `Snapshot`/`Documents` re-declared (third copy; domain-document.ts:2-8, upstream BrowserDocumentStore). | Import upstream types. | None. |
| 2 | 4 | A7 | `export type PendingNoteSegment` — 0 importers outside file. | Unexport (or have voice.ts import it instead of re-declaring). | None. |
| 3 | 11, 45 | D8/B3 | 400+ char validator expressions for data written by this module; the clip check (45) is a trust-boundary re-read of IndexedDB — acceptable. | Split into named predicates; keep validation (storage boundary). | None. |
| 4 | 23-24 | C3 | Chunked base64 encode (twin incoming-simulation.ts:23 and 6 others). | lib `bytesToBase64`. | None. |
| 5 | 46 | C3 | base64 decode twin. | lib `base64ToBytes`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Snapshot | type | 1 | domain-document.ts:2 | upstream |
| Documents | type | 2 | domain-document.ts:3 | upstream |
| Binding | type | 3 | digest-delegation-ui.tsx:6 (different) | stay |

## Proposed end state
Same journal with upstream types and shared base64 helpers. Estimated lines after: 60 (current 66).

## Verification
test/browser-note-pending-audio.test.mjs, browser-note-recording-journal Quint harness, browser-audio.spec.ts.
