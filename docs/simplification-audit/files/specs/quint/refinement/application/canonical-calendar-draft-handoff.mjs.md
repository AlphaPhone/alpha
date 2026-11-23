# specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs
- Lines: 158 | Kind: Quint refinement harness, mounted app in Chromium (Vite + Playwright) | Verdict: KEEP, with one schedule removed (it covers deleted legacy preservation)
- Covers: Note "Review event" and Camera scan event review hand a draft to the canonical Calendar editor only when no retained form / pending open / pending consume blocks it; refused handoffs keep the origin review and stored bytes. Duplicates: `test/browser/scan-keep.spec.ts` (scan review journey, not the refusal/retention cases). Callers: `test/quint-canonical-calendar-draft-handoff.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30, 149-152 | A1 / broken | `browser.page({legacyTitle: ready ? '' : 'Unapproved legacy fixture'})` and the schedule "unapproved preservation never admits a canonical Note event". `test/fixtures/calendar-mounted-editor.mjs` no longer accepts `legacyTitle` (legacy calendar preservation was deleted in this worktree), so this schedule now starts `ready` and will not match the model's `initWith(false)`. | Delete the schedule and the `{ready}` option; in `CanonicalCalendarDraftHandoff.qnt` remove `unavailableCanonicalSourceRetainsOriginTest` (l.85) or re-express "not ready" as a loading status the fixture can produce (`f.status('loading')`). | M (harness fails until done) |
| 2 | 11-14 | T10 (weak) | `inputs` pins 11 file paths, including `scripts/local-ocr-assets.ts`; hashed, not sliced. | Derive from the Vite module graph (`onSource`) as the other mounted harnesses do; keep only fixture paths. | L |
| 3 | 19-26 | C5 | The `sources`/`captureSources`/`startMountedCalendar({onSource})` prologue and `schedule()` / `mark()` scaffolding are copied verbatim in `camera-preview-retirement.mjs`, `canonical-calendar-editor-close.mjs` and other mounted harnesses. | One `mountedCampaign({model, inputs, page options}, schedules)` helper in `test/fixtures/calendar-mounted-editor.mjs`. | L |
| 4 | 90-103 | — | Holds real storage ops through `f.invoke('hold', ...)` gates installed by the fixture (in-page patching of `shell.canonicalDraft.consume`). Acceptable for a refinement replay. | None. | — |
| 5 | — | P1 | Runtime: Vite + Chromium, OCR assets, five schedules; minute-scale. | Path-filter. | — |

## Proposed end state
Four schedules (legacy one removed, model test removed or rephrased), shared mounted-campaign scaffold, inputs from the module graph.
