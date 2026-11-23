# apps/app/src/prototype/voice-activity.tsx
- Lines: 86 | Role: React `VoiceActivity` bar animation (WAAPI keyframes per voice phase, reduced-motion aware), adapted from upstream `ChatOverlay.tsx` under the MIT notice in lines 1-29. | Verdict: KEEP (trim exports)
- Importers: 1 product — `apps/app/src/prototype/voice-adapter.ts:11` (used at `:1347,1470,1474`). Tests: `test/voice-composer-recovery.test.mjs:7` (`tsImport`), `test/fixtures/voice-markup.mjs:13` (esbuild bundle).
- Text/path pins: `test/support/feature-parity.mjs:436` (path). `scripts/prepare-client-features.ts:213` and `test/fixtures/shared-batch-voice.mjs:13` name **upstream** `packages/ui/src/voice/voice-activity.ts`, a different module (VAD detector) — name collision, not a reference to this file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32, 35 | A7 | `export const voiceBarHeights`, `export const voiceVisuals` — no importer outside this file (`git grep -n "voiceVisuals\|voiceBarHeights"` in apps/test/specs/scripts: only lines 32-84 here). | Drop `export` from both. | None. |
| 2 | 79 | B2 | `typeof element.animate==='function'?[…]:[]` — the Android WebView and every supported browser implement WAAPI. | `[...root.current!.children].map((element,index)=>element.animate(...))`. | Low; jsdom/SSR test fixtures (`voice-markup.mjs`) render statically and never run layout effects. |
| 3 | 79 | D8 | 380-character expression computing keyframes and per-phase delay. | Name `keyframes(visual)` and `delayFor(phase,index,compact)`. | None. |
| 4 | 73, 75 | C3 | `matchMedia('(prefers-reduced-motion: reduce)')` read twice (initial state + effect). | One `usePrefersReducedMotion()` hook; check for twins (`git grep "prefers-reduced-motion"` in apps/app/src) and share it. | None. |
| 5 | 35 | C1 | `Record<string,{…}>` keyed by free string while phases are a closed set (`idle…error`). | `type VoicePhase = keyof typeof voiceVisuals`; type the `phase` prop with it. Callers in voice-adapter (`:1470,1474`) pass computed strings, so add the type there too. | Low. |
| 6 | 24-28 | D11 | Same basename as the unrelated upstream `voice-activity.ts` (VAD), which `prepare-client-features.ts` stages. | Rename to `voice-activity-bars.tsx` when the prototype folder is reorganised (update the two test imports and feature-parity). | Low. |
| 7 | 1-29 | KEEP | MIT licence header and provenance (source SHA) are required for adapted upstream code. | Keep verbatim. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `voiceBarHeights`, `composerBarHeights` | const | 32-33 | upstream `ChatOverlay.tsx` five-bar motif (source of the adaptation) | keep local, unexported |
| `voiceVisuals` | const | 35-69 | none in apps | keep local, unexported |

## Proposed end state
Same component, ~82 lines: constants unexported, WAAPI called unconditionally, the keyframe/delay expression split into two named helpers, typed phase. Licence header unchanged. Est. lines after: 82.

## Verification
`node --test test/voice-composer-recovery.test.mjs`, markup tests using `test/fixtures/voice-markup.mjs` (`voice-copy-presentation.test.mjs`), Playwright `chat-voice-mode.spec.ts` / `speak-replies.spec.ts` (visual phases).
