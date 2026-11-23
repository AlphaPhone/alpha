# apps/app/src/browser/audio-capture.ts
- Lines: 127 | Role: MediaRecorder session owner for clips and segmented Notes recordings (pause/resume, rollover, size cap, cancellation). | Verdict: SIMPLIFY (small)
- Importers: 1 (`browser/voice.ts`). Text/path pins: `specs/quint/application/manifest.json:3434`, `specs/quint/refinement/application/notes-recorder-media-admission.mjs`, `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs` (P6 legacy), `test/notes-recorder.test.mjs`, `test/fixtures/notes-recorder-media.mjs`, `test/browser/notes-browser-segments.spec.ts`, `test/browser/voice-levels.spec.ts`, `test/browser/cloud-notes-voice-fixture.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 104 | C3 | `partMs(part,now)` and `elapsed()` compute the same formula `now-started-pausedTotal-(pausedAt!==undefined?now-pausedAt:0)` over `SegmentPart` and `Session`. | One `recordedMs(t:{started;pausedTotal;pausedAt?},now)` used by both. | Low |
| 2 | 95-102, 108-110 | C3 | Pause/resume/stop accounting is written twice, once for the session recorder and once for the segment recorder (`part.pausedTotal+=Date.now()-(part.pausedAt??Date.now())`). | `pauseClock(t)` / `resumeClock(t)` helpers applied to session and part. | Low |
| 3 | 31-32, 110 | B4 | `try{if(session.recorder.state!=='inactive')session.recorder.stop();}catch{}` — `stop()` throws only `InvalidStateError` when inactive, which the guard already excludes. | Drop the `try{}catch{}` where the state is checked (31, 32, 110); keep it in `ondataavailable`/`onerror` (64, 67, 84) where the state is not checked. | Low |
| 4 | 5 | A7 | `export type CaptureSegment` — no importer outside this file (`git grep -w CaptureSegment`: this file only). | Drop `export`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Clip` | type | 3 | `{recordingId,durationMs}` shapes in `browser/voice.ts` | keep local |
| `Session`, `SegmentPart` | type | 7-13 | none | keep |
| `cancelled()` AbortError factory | helper | 15 | `isAbortError`/AbortError constructions across src (C3) | shared abort helper module if created |

## Proposed end state
~115 lines: one recorded-time helper, one pause/resume helper, no redundant try/catch around guarded `stop()`.

## Verification
`test/notes-recorder.test.mjs`, `test/browser/notes-browser-segments.spec.ts`, `test/browser/voice-levels.spec.ts`; Quint `notes-recorder-media-admission` refinement (path only).
