# test/browser/device-view-profile.spec.ts
- Lines: 87 | Kind: Playwright, chromium. Settings UI drive on a hand-written Capacitor bridge fake, plus asserts through an in-page `connectionController.getSnapshot()` (T6/P2) | Verdict: **MERGE into `journeys/connection-cloud.spec.ts`**
- Covers: when the resident agent is enrolled, it negotiates which views are enabled. The test checks the exact profile write, that a retained profile is not re-written, that an unsupported or malformed answer falls back to "Chat only", and that a lost committed write is not repeated on reconnect. Duplicates: none found (`grep viewProfile test/` matches only this spec). Callers: the `chromium` project, 6 tests from a scenario loop.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-59 | T7 / C4 | A 50-line inline Capacitor bridge with 7 plugin headers repeats what `flag-off-android.ts` and `resident-stub.ts` already fake (`Agent.request` routes, `AlphaConnection` secure slots, `ElizaSystem`). | Use the shared harness bridge. Keep only the `/api/client-devices/view-profile` and `/register` handlers as a per-test override. | Low |
| 2 | 63, 80 | T6 / P2 | The test asserts on `connectionController.getSnapshot()` (`phoneActionsAvailable`, `phoneCapabilityReason`, `session.ownerId`), which it imports in the page. | Assert visible state instead: "Chat only" vs the phone-actions affordance in Settings › Status. Keep the bridge-side counts (`writes`, `reads`, `contextReads`) because they sit at the real boundary. | Low |
| 3 | 13 | A3 | The supported-view list still names `'wallet'`. Wallet is deleted (D2). The list is the server's answer, so the product filters it. That is harmless but misleading. | Drop `'wallet'`, or keep it on purpose as "an unknown view the server advertises" and say so in a comment. | none |
| 4 | 6, 72 | owner | The `legacy` scenario models an older agent whose `register` reply has no `viewProfileVersion`. This is agent protocol compatibility, not app data (D1 does not cover it). | Keep it only if the agent pinned in `upstream.lock.json` can still omit the field; otherwise delete the scenario and the matching branch in `negotiateEnabledViews`. | Medium (owner question) |
| 5 | 32 | A8 | The comment "Read before every resident start since e15f0b735" is a commit-hash tombstone. | Reword it to describe current behaviour. | none |
| 6 | 7-86 | D8 | Dense one-line statements. | Formatter pass when the file moves. | none |

## Proposed end state
Five or six scenarios (supported, retained, unsupported, malformed, lost, plus legacy if the owner keeps it) become one
`test.describe('view profile negotiation')` block in `journeys/connection-cloud.spec.ts`. Each runs on the shared
`harness/bridge.ts` with an `agent.routes` override for `/api/client-devices/*`. Assertions use the visible Settings
state and the bridge-recorded writes and headers. There are no `/src` imports.
