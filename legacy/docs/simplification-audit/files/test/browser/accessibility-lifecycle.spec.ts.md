# test/browser/accessibility-lifecycle.spec.ts
- Lines: 263 | Kind: Playwright journey (`chromium`, dev server, live offline shell). It does not import product modules in the page. | Verdict: **MERGE** into `journeys/accessibility.spec.ts`
- Covers: PRD AP-15 in the renderer. Pressing HOME repeatedly, with a popup open or after a rotation, a reload, camera-permission loss or going offline, leaves every view announced (focus on the screen name), in reading order, with the composer draft kept and nothing inert. Duplicates: `home-*`/`launcher-home` HOME specs partly (owned by other chunks). The Android counterpart is `AccessibilityLifecycleInstrumentedTest` (a different layer, not a duplicate). Importers: none. It imports `accessibility-audit` (`ASSISTANT_GROUP`, audits), `accessibility-states` (`setTextScale`) and `helpers/settled`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-93, 131-158 | T4 / cost | It runs 10 views × (HOME test + rotation test) = 20 tests. Each rotation test runs four audited rotations with a 90 s timeout. The sweep's landscape lane already audits every view in landscape (`accessibility-sweep.spec.ts:91-115`). What only this file adds is focus and draft survival across a rotation. | Parametrise one test that loops over the views and rotates each once (portrait→landscape→portrait). Assert view, focus and draft, and run one `layout` audit per orientation. Remove the second round trip. | Low |
| 2 | 189-204, 241-262 | cost | "200% after reload" and "network going away" each visit all 10 views serially (120 s timeouts). | Keep both, folded into the merged journey. Treat them as one pass over the views each. | none |
| 3 | 53 | T8 | `page.waitForTimeout(120)` between HOME presses. It is commented as the intended press cadence (presses landing mid-motion), so this is a deliberate stimulus and not a wait for readiness. | Keep. Name it `HOME_PRESS_CADENCE_MS`. | none |
| 4 | 12 | C6 | It seeds `offline` by writing the `alpha.connection.selection.v1` literal inline. That is the 339× pattern. | Use the harness `app` fixture option `connection: 'offline'`. | none |
| 5 | 51 | T6-lite | HOME is delivered as `window.dispatchEvent(new Event('launcher-home'))`. This is the real product event that `MainActivity` and `main.tsx` deliver. | Keep. Move it into a harness helper `pressHome(page, n)` that other HOME specs also use. | none |
| 6 | 211-220 | T7 | A hand-written `getUserMedia` stub is installed with `addInitScript`. | Move it to `harness/plugins/camera.ts` (`camera: 'granted'|'denied'|toggle`). | none |
| 7 | 112 | – | The popup list includes `['Settings','About']`, which is a page and not a popup. It is harmless. | Keep it, or drop it if it duplicates the HOME test for Settings. | none |

## Proposed end state
Move this file into `journeys/accessibility.spec.ts` as a `describe('lifecycle')` block with five tests: HOME across views
(one loop), HOME with a popup open (one loop over five popups), rotation across views (one loop, one round trip),
reload at the largest text size and at 200% text, and offline / camera-permission loss. `focusState`, `expectScreenName`,
`openFromHome` and `pressHome` move to `harness/navigation.ts`. That removes about 15 tests and about 40% of the runtime,
and every distinct assertion is kept.
