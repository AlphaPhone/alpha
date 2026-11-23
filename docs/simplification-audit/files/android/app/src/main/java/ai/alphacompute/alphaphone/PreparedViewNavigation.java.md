# android/app/src/main/java/ai/alphacompute/alphaphone/PreparedViewNavigation.java
- Lines: 21 | Role: allowlist for the one renderer→resident `POST /api/views/<id>/navigate` "prepareOnly completed-action" request passed through the Agent request gate | Verdict: KEEP (move with the request-gate split)
- Importers: `AlphaLocalAgentPlugin:1220`. Text/path pins: `test/prepared-navigation-route.test.mjs`, `test/fixtures/ResidentRequestDeadlineTest.java`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-21 | D1 | One rule of the 1,097-char request gate (`AlphaLocalAgentPlugin:1224`) lives in its own class while the others are inline. | When the gate is extracted to `ResidentRequestGate` (research §5), move this method there as a named rule; until then keep. | Low. |
| 2 | 14-15 | C3 | Exact-key check via `length()!=5` + `has` loop — twin of `NativeDigestSources.keys`. | Use the shared `Json.requireExactKeys`. | None. |
| 3 | 11 | D8 | 230-char condition. | Split into `safePath(path)` + regex. | None. |
| 4 | 19 | B1 | `catch(Exception invalid){return false;}` — specified (malformed body = not allowed). | Narrow to `JSONException`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `identifier` | helper | 7-9 | printable-ASCII id checks in `HostedInbox.id`, `NativeDigestSources.id` | `Ids` |

## Proposed end state
~20 lines, later a method of `ResidentRequestGate`.

## Verification
`test/prepared-navigation-route.test.mjs`, completed-action hand-off journey.
