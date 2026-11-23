# apps/app/src/runtime/google-agent-access.ts
- Lines: 60 | Role: owner switches for agent Gmail sends and Calendar edits, saved in device preferences and published to the phone's Google host (native) or the dev host route. | Verdict: SIMPLIFY
- Importers: 1 product (`runtime/google-connection-ui.tsx`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/refinement/application/google-access-publication.mjs`, `google-calendar-link-publication.mjs`, `test/google-agent-access.test.mjs` (source text; asserts the `/__alpha-agent-google-access` POST), `test/calendar-connect-policy.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`. `scripts/gmail-agent-dev-broker.ts`, `scripts/gmail-agent-read-host.ts` declare their own `GoogleAgentAccess`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | B2 | `if(!navigator.locks?.request)throw Error('Safe Google access changes require Web Locks.')`; Web Locks exist in the Android WebView and dev browsers. | Call `navigator.locks.request` directly. | Low |
| 2 | 9, 26, 33 | D5/D6 | Dev-host path in a production module: `GOOGLE_AGENT_ACCESS_PATH='/__alpha-agent-google-access'` and `fetch(...).catch(()=>{})` when `browserLocalAgentEnabled`. Literal duplicated in `scripts/local-agent-dev-bridge.ts:299`. | Move the browser publication into the dev bridge client in `browser/` (registered publisher), keep native path here; one shared constant for the route. | Low |
| 3 | 33 | B1 | `.catch(()=>{})` on the dev publication silently hides a failed host write, while the native path throws ("Settings never shows a state the host does not enforce"). | Let it throw like native (dev path), so the rollback at 48-57 runs. | Low |
| 4 | 9 | A7 | `GOOGLE_AGENT_ACCESS_PATH` exported, 0 importers. | Un-export / move (see #2). | None |
| 5 | 16 | B1 | `captureGoogleCalendarAccess`: `try{…}catch{return undefined;}`; caller maps `undefined` to "Edits unknown"/"Couldn’t read". | Keep (specified behaviour); add a one-line comment. | — |
| 6 | 53, 55 | B1 | Rollback `.catch(()=>{})` twice inside the failure path, then rethrow the original error. | Keep (best-effort rollback before rethrow); comment already explains. | — |
| 7 | 7 | C1 | `GoogleAgentAccess` type re-declared in two dev scripts. | Scripts import it from here. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GoogleAgentAccess` | type | 7 | `scripts/gmail-agent-dev-broker.ts`, `scripts/gmail-agent-read-host.ts` | stay; scripts import |
| `GOOGLE_AGENT_ACCESS_PATH` | const | 9 | `scripts/local-agent-dev-bridge.ts:299` literal | shared dev-bridge route constants |
| `withGoogleAccessLock` | helper | 19-22 | other Web Locks wrappers (`alpha.*` lock names) | stay |

## Proposed end state
Native publication + lock + rollback here; dev publication behind the dev bridge; no optional-chaining probe. ~50 lines.

## Verification
`test/google-agent-access.test.mjs` (text + POST assertion), `test/calendar-connect-policy.test.mjs`, Quint `google-access-publication.mjs`, Android `AlphaLocalAgentPlugin` `setGoogleAgentAccess` path on device.
