# apps/app/src/runtime/agent-calendar.ts
- Lines: 289 | Role: `AgentCalendar` UI snapshot controller over the resident agent's canonical Calendar API: saved-feed bootstrap, refresh with cache/refusal handling, mutations, linked-sync control | Verdict: SIMPLIFY
- Importers: prototype/agent-calendar-adapter.ts (sole constructor, L129), runtime/agent-calendar-view.ts, runtime/calendar-sync-settings.ts, runtime/google-accounts.ts, runtime/google-connection-ui.tsx, runtime/home-calendar-selection.ts, runtime/legacy-calendar-preservation.ts. Text/path pins: `test/agent-calendar-refresh-state.test.mjs:7` and `test/canonical-maps-return.test.mjs:6` readFileSync this file (T1); quint refinements `agent-calendar-{event-return,mutation,refresh,sync-control}.mjs/.md`, `calendar-preservation-confirmation.mjs`, `saved-service-read.mjs`, `canonical-calendar-draft-handoff.mjs`, `index.mjs`, `specs/quint/legacy/google-connect/...`, `specs/quint/refinement/legacy/calendar-navigation.mjs`; manifests (application, services); `scripts/browser-cloud-dev-bridge.ts`; 25+ tests (`test/quint-agent-calendar-*.test.mjs`, `test/calendar-empty-bootstrap-repro.test.mjs`, `test/home-calendar-selection.test.mjs`, …); feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12, 13 (`'transition-required'|'legacy-recovery'`, `legacy` field), 69-71, 105-107, 184-191, 227-228 | A1 | Legacy app-calendar preservation: `LegacyCalendarCapture`, `CalendarPreservation`, two statuses, `capture()` before every bootstrap/refresh/mutation, `confirmLegacyRetention`. It protects an old browser calendar document; the renamed package starts empty (README/PRD: no migration). | Delete the preservation port, the two statuses, the `legacy` state field and `confirmLegacyRetention` together with `legacy-calendar-preservation.ts`, the transition UI in `agent-calendar-adapter.ts` (L15, 151, 219, 232, 235, 243, 251) and `settings-adapter.ts:862-866`. ~30 lines here. | Medium: owner must confirm no installed renderer holds the old browser calendar document (research Q3). |
| 2 | 53 | D7 | Constructor parameter `client: ClientFactory = agentCalendarClient` — the only constructor call passes `undefined` (agent-calendar-adapter.ts:129); the factory exists for tests. | Call `createCalendarApi(appRecordFetch(...))` directly; delete `ClientFactory`. | Low; tests that inject a client must fake the port instead. |
| 3 | 60, 94, 97, 250, 257 (×2), 266 | C3 | `JSON.stringify([calendarOwnerKey(port),port.sessionId,port.scope])` written 7 times. | `const bindingKey = (p) => …` once. | None. |
| 4 | 26, 153, 195, 215 | C3 | Four "event belongs to source" predicates: L26 requires equal `connectorAccountId`; L153/195/215 accept a missing one (`!event.connectorAccountId||…`). `['owner','writer','reader'].includes(accessRole)` repeated at L36, 148, 153, 215. | `readableSource(source)` and one `sourceMatches(source, event, {lenientConnector})`; make the leniency an explicit, named choice. | Medium: semantics differ today — keep each call site's current behaviour. |
| 5 | 68, 73, 109-110, 126, 174 | C6 | Persisted cache keys `'calendar:owner:v1'`, `'calendar:feed:v1'`, `'calendar:access-refused:v1'` written inline 3-4 times each. | Three constants (exact strings unchanged; they are persisted). | None. |
| 6 | 27 | C3 | Inline SHA-256→hex (one of ~28 copies). | `sha256Hex` from `apps/app/src/lib/`. | None. |
| 7 | 25 | C3 | `record` plain-object guard; twins calendar-approval.ts:34, automations-protocol.ts:22, local-agent.ts:163 and ~30 more. | Shared `isRecord`. | None. |
| 8 | 29-38 | D8/B3 | `savedCalendar` validates a persisted feed in one 908-char expression (L36). Storage is a trust boundary, so validation stays, but as named predicates (or a zod schema). | Split into `validSource`, `validEvent`, `validFeed`. | Low. |
| 9 | 87-183 | D9 | `refresh()` is ~95 lines mixing deferral, local snapshot restore, three live reads, 401/403 refusal persistence and publish. | Extract `restoreLocalSnapshot`, `refuseUnauthorized`, `publishLive`. | Medium: keep the ordering of `liveSettled`/`restoration`. |
| 10 | 80, 125, 126, 137, 174 | B1 (keep, document) | `catch{}` / `.catch(()=>{})` around local cache reads/writes. These are the specified "local cache never blocks a live read" fallbacks. | Keep, one comment per site; drop the bootstrap catch-all at L80 only if the diagnostic trail goes (finding 11). | — |
| 11 | 53, 64-80 | NEW? (B5-like) | `bootstrapDiagnostic` stage strings (14 calls) threaded through `restoreSaved`; supplied as `diagnose` by agent-calendar-adapter. | Keep only if the crash log/diagnostics export consumes them; otherwise delete the parameter and the 14 calls. | Low; check `diagnose` consumer. |
| 12 | 52 | D8 | Nine private fields on one line. | Format. | None. |
| 13 | 256-261 | B3 | `listLinkedEvents` bypasses the typed client and casts `port.request('/api/lifeops/calendar/links?view=events',…) as {links?:unknown}` then casts again. | Use the upstream calendar API method if one exists; otherwise one typed helper. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `record` | helper | 25 | calendar-approval.ts:34 `object`, automations-protocol.ts:22 `object`, ~30 more | `lib/is-record.ts` |
| `calendarSourceRevisions` (sha256 hex) | helper | 27 | assistant-draft-store.ts:14, sms-agent-contract.ts:4, native-recovery-backup.ts:11, ~24 more | `lib/sha256.ts` |
| `sourceMatches` | helper | 26 | inline variants L153, L195, L215 | here |
| binding key tuple | helper | 60 etc. | calendarOwnerKey L14; client-observation-support.ts:18; alpha-client.ts:241 identity tuple | here (`bindingKey`) |
| `SavedCalendar` | type | 24 | none | here |
| `CalendarReadCache` | type | 21 | `ServiceReadCache` (Pick) | keep |
| `ClientFactory` | type | 20 | none (test seam) | delete |
| `refusedCalendarCacheOwners` | module state | 23 | none | keep |

## Proposed end state
~250 formatted lines (from 289 dense): no legacy preservation port or statuses, no injectable client factory, one binding-key helper, named source predicates, persisted keys as constants, `refresh()` split into three private methods. Persisted cache keys and shapes unchanged.

## Verification
`test/agent-calendar-mutation.test.mjs`, `test/agent-calendar-refresh-state.test.mjs` (T1 — update or delete regexes), `test/canonical-maps-return.test.mjs` (T1), `test/calendar-empty-bootstrap-repro.test.mjs`, `test/quint-agent-calendar-*.test.mjs`, `test/home-calendar-selection.test.mjs`, `test/google-calendar-connect.test.mjs`, Playwright `test/browser/home-brief-result.production.spec.ts`; quint agent-calendar refinements; `npm run verify`.
