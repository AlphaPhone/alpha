# specs/quint/refinement/application/canonical-calendar-editor-close.mjs
- Lines: 203 | Kind: Quint refinement harness, mounted app in Chromium | Verdict: KEEP
- Covers: Calendar editor close semantics: Alpha Back closes the attendee picker before the editor, header close dismisses directly, Resume restores exact owner/form/target/last valid title, held/failed discard keeps the retained draft, owner replacement preserves the old slot. Duplicates: partial journey coverage in `test/browser/journey-j01-poster-calendar.spec.ts` and `journey-core-loops.production.spec.ts` ("Resume event draft"), without the held/failed discard or owner-replacement schedules. Callers: `test/quint-canonical-calendar-editor-close.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | T10 (weak) | `inputs` pins `prototype/template.html`, `model.js`, `subview-accessibility.ts` and upstream `durable-draft-controller.ts` paths (hashed, not sliced). | Use the module graph; keep fixture paths only. | L |
| 2 | 23-30 | — | `eventIndex` parses the canonical draft key format `canonical-calendar:["eliza",...,"fixture-event-N"]`; this is a persisted key, so pinning it is legitimate. | None. | — |
| 3 | 52-53, 81, 162 | T6 (partial) | Uses DOM selectors `[data-alpha-subview=...]:not([inert])` and dispatches `alpha-back` / `launcher-home` window events instead of a user gesture. Acceptable for a refinement replay; a journey spec should press the system Back. | None here. | L |
| 4 | 36-44, 46-140 | C5 | Same mounted-campaign scaffold as the handoff and camera harnesses. | Shared helper. | L |
| 5 | 166-168 | — | Schedule ends by opening Calendar Settings, "Google Calendar" and the "Google accounts" dialog. Google Calendar link UI is product (agent-side sync); stays valid after D4. | Confirm after D4 the dialog name is unchanged. | L |

## Proposed end state
Eight schedules unchanged; shared scaffold; inputs from module graph; per-model test only.
