# apps/app/src/browser/video-transcode.ts
- Lines: 33 | Role: WebCodecs (mediabunny) re-encode of an edited clip to WebM with timeout, 100 MB cap and abort | Verdict: KEEP (two small SIMPLIFY edits)
- Importers: 1 — `browser/video-edit.ts:1,84` (product video editor, web and Android WebView). Text/path pins: `test/video-capture-limit.test.mjs:12` and `specs/quint/refinement/native/video-edit-review.mjs:15` replace the literal import `'./video-transcode'` in video-edit.ts with a stub (pins the *import specifier*, not this file's text); `test/support/feature-parity.mjs` lists the path.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 28 | C6 | `100*1024*1024` written twice (`if(end>100*1024*1024)`, `byteLength>100*1024*1024`) | `const MAX_BYTES=100*1024*1024;` at top | none |
| 2 | 12-15, 31 | C3 | Hand-rolled abort race: `let rejectAbort!…; const cancelled=new Promise<never>(…)` then `Promise.race([work(),cancelled])`. Same shape in `local-speech-playback.ts:19-20`, `runtime/native-connection.ts:276-287`, `runtime/voice-timing.ts:126-129`, `runtime/workflow-presentation.ts:47-51` | Use one `raceAbort(promise, signal)` / deferred helper in `runtime/abort-signal.ts` (research n–z §4 proposes it) | low; keep `retired`/`failure` semantics (first reason wins) |
| 3 | 14, 32 | B1 (justified) | `void conversion?.cancel().catch(()=>{})`, `void output.cancel().catch(()=>{})` | Keep — cleanup after a decided failure; add a 3-word comment "cleanup is best effort" | none |
| 4 | 5 | B2 (not applicable) | `typeof VideoEncoder==='undefined'…` | Keep: WebCodecs is genuinely absent on older WebViews and the caller falls back on `null` | — |
| 5 | 22 | D8 | 520-char `Conversion.init({…})` line incl. crop math `w*(1-1/1.3)/2` | Extract `const crop=edit.crop?centreCrop(w,h,1.3):undefined` on its own lines when touched | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `cancelled`/`rejectAbort` deferred | helper | 12-13 | local-speech-playback.ts:19-20, native-connection.ts:276-287, voice-timing.ts:126-129, workflow-presentation.ts:47-51 | `runtime/abort-signal.ts` `raceAbort` |
| dimensions object type | type | 4 | none | keep inline |

## Proposed end state
Same file, one `MAX_BYTES` const, abort race via shared helper, crop math extracted. ~30 lines.

## Verification
`test/video-capture-limit.test.mjs`, `specs/quint/refinement/native/video-edit-review.mjs` (both stub this module — keep the export name `transcodeVideo` and the import specifier in video-edit.ts), browser video edit specs (`test/browser/*video*`). Re-run `npm run verify`.
