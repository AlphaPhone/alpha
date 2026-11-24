# test/home-calendar-selection.test.mjs
- Lines: 299 | Kind: transplant (esbuild-transforms real `apps/app/src/runtime/home-calendar-selection.ts` to CJS and runs it in `vm` with `./agent-calendar` and `internal/time` replaced by stubs) — in effect a unit test of one selector | Verdict: REWRITE as cases in `journeys/home-shell.spec.ts` (Agent Calendar card)
- Covers: which Agent Calendar event Home shows (today → week → month, upcoming before most-recent-past, civil dates for all-day, midnight boundaries) and when Home may claim "Nothing planned" (only a complete feed covering the period, no unknown source, no failed reread). Duplicates: `test/browser/home-daily-overview.spec.ts:188-248` (verified event, excluded source, failed widget, reminder priority under Agent Calendar), `home-calendar-density.spec.ts`; `home-cards.test.mjs:200-249` re-runs the same module. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 38-43 | T2 | Hand-rolled loader with a `require` stub that throws on any new import; the module could simply be imported with `tsx`. | Delete the loader. | Low |
| 2 | 30-37 | C3 | Re-implements `calendarSourceKey` as a local `JSON.stringify` stub: the test passes even if the real key changes. | — | Medium |
| 3 | 99-127, 164-178, 190-298 | — | The "verified empty" rules protect a user-visible honesty claim and have several boundary cases no journey has. | Carry to `journeys/home-shell.spec.ts` with a seeded Agent Calendar feed: (a) complete empty feed → "Nothing planned"; (b) feed not covering the week → neutral "Calendar"; (c) unknown-source event in period → not verified; (d) failed reread keeps neither event nor empty claim; (e) saved rows shown while loading but not verified; (f) all-day event in a negative-offset zone. Use `page.clock` for "now". | Medium: (b)-(f) have no browser case found |
| 4 | 76-98, 179-189 | T3 | Fallback ordering cases. | Carry one ordering case (finished event does not displace the next upcoming one); drop the rest. | Low |

## Proposed end state
File deleted. Six to seven Home-card cases in `journeys/home-shell.spec.ts` driven by the resident stub's Agent Calendar
feed and a fixed `page.clock`, asserting the card title/`data-alpha-home-calendar-*` attributes only.
