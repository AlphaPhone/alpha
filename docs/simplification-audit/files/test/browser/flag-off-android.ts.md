# test/browser/flag-off-android.ts
- Lines: 474 (47 KB) | Kind: Playwright support. A fake Android bridge (`window.Capacitor`, `androidBridge`) installed with `addInitScript` before the flag-off bundle loads, plus a hosted-digest agent model, a managed-Gmail Cloud model, a document picker and attachment port, and helpers (`harness`, `button`, `fenceNetwork`, `expectNoDevelopmentSurface`, `seedCompletedAccessSetup`, `completeAccessSetup`, `residentHome`, `openYourAgent`) | Verdict: **KEEP → SPLIT into `test/browser/harness/bridge.ts` + `harness/plugins/{agent,cloud,digests,documents,calendar}.ts` + `harness/app.ts`**
- Covers: the boundary every production-lane journey stands on. It fakes the shipped renderer's native plugins at the Capacitor layer, which is the correct boundary, so the bundle under test is unmodified. Duplicates: `resident-stub.ts` (29 KB, the resident agent fake), `helpers/resident-agent-plugin.ts`, 49 inline `window.Capacitor=` fakes in chromium specs, `device-apps-stub.ts`, `telephony-fixture.ts`, `helpers/photos-bridge.ts`, `helpers/native-cloud-*` (research §5). Importers: 60 files (43 `*.production.spec.ts`, plus `resident-stub.ts`, `native-speech-fixture.ts`, `voice-assistant-fixture.ts`, `helpers/{native-notes,canonical-calendar,photos-bridge}.ts` and 11 chromium specs that import only `seedCompletedAccessSetup`, `completeAccessSetup`, `button` or `fenceNetwork`). It survives every DELETE in this chunk.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 96, 98 | A7 (bug-shaped) | Line 96 already returns 503 for `GET /api/notes/state`, so the `GET /api/notes/state` → empty-notes branch on line 98 can never run. A reader would think Notes state is served. | Delete line 98, or (if a spec needs Notes state) remove `/api/notes/state` from line 96's list. Check `helpers/native-notes.ts` callers first. | Low |
| 2 | 100-101 | D8 | Two consecutive `if (path === '/api/client-devices/register')` blocks. | Merge them into one block. | none |
| 3 | 442 | D8 | `/^(All set|All set)$/` alternates the same literal twice, left over from a removed heading variant. The comment on 441 says the heading "depends on" a binding, but both arms are equal. | Use `{ name: 'All set', exact: true }` and fix the comment. | none |
| 4 | 411 | D10 | The generic `fenceNetwork` hard-codes an OpenFreeMap style response, a Maps concern inside the network fence. `global-basemap.spec.ts:9` has its own richer copy (C6). | Move the closed basemap style to `harness/maps.ts`, used by both. | Low |
| 5 | 59, 434-436 | C3 | The startup-walkthrough "completed" seed is written inline at 59 and again as `seedCompletedAccessSetup`. | Have `flagOffAndroid` call the one helper. | none |
| 6 | 213 | C3 | A local `sha` hex helper; `helpers/photos-bridge.ts:28` has another, and more exist in specs. | One `harness/util.ts` `sha256Hex` (in-page string form). | none |
| 7 | 132-208 | — / drift | The hosted-digest agent model re-implements the pinned plugin-workflow request keys, refusals and replay rules by hand ("It checks less than the pin does", 129-131). This is correct as a boundary fake, but it will drift from `upstream.lock.json`. | Keep it. Add the upstream file and commit it mirrors in a header line, so a lock bump flags it for review. Do not grow it into a second implementation. | Medium |
| 8 | 16, 18, 19 | A7 | `FlagOffMessage`, `FlagOffCalendar` and `FlagOffEvent` are exported but no other file imports them (`grep` finds 0 external uses; `FlagOffAccount` has 1). | Drop `export` on the three. | none |
| 9 | 399-401 | D10 | `button()` special-cases the label `'Inbox'` to add `[data-mobile-shell-tile]`, which is label-driven behaviour. | Give the Home tile a distinct accessible name or region, and use `page.getByRole('region',{name:'Apps'}).getByRole('button',{name:'Inbox'})` at the call site. | Low |
| 10 | 331, 218-219 | A8 | The "(#485)" issue tombstone, plus comments about what the deployed Cloud lacks "yet". | Reword them to describe the current behaviour. | none |
| 11 | 61 | B1 | `kept()` swallows a JSON parse error and returns the initial value. That is acceptable in a test fixture (sessionStorage written by itself), but it is silent. | Let it throw: the fixture writes the value itself. | none |
| 12 | 398 | — | `harness()` serialises the reader with `read.toString()` and evaluates it in the page. This works, but closures over test-scope variables silently fail. | Keep, but document "no closures". A typed `bridge.state()` accessor is preferable. | Low |
| 13 | 55-395 | D1 / T7 | One 340-line `addInitScript` closure holds seven unrelated plugin fakes. | Split per plugin as the verdict says. Each plugin fake registers its `PluginHeaders` entry and handlers with one `bridge.ts` that derives headers from the handler map (research §5). | Medium. 60 importers. Do it with a codemod-style rename of imports only. |

## Proposed end state
`harness/bridge.ts` (about 80 lines) installs `window.Capacitor` from a typed `{plugin: {method: handler}}` map and
records `calls` and `unexpected`. `harness/plugins/agent.ts` holds the resident agent: routes, conversation streams,
provider slot, merged with `resident-stub.ts`. `harness/plugins/cloud.ts` holds the managed Gmail and billing replies,
merged with `helpers/native-cloud-*`. `harness/plugins/digests.ts` holds the hosted-digest agent model and
`AlphaHostedResults`. `harness/plugins/documents.ts` holds the picker, attachments and Files storage.
`harness/plugins/calendar.ts` holds `AlphaCalendar`. `harness/app.ts` holds `fenceNetwork`,
`expectNoDevelopmentSurface`, `residentHome`, `openYourAgent` and the access-setup helpers as `test.extend` fixtures.
`flagOffAndroid(page, options)` remains as a thin composition, so the 43 production journeys change only their import
path.
