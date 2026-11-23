# apps/app/src/prototype/automations-adapter.ts
- Lines: 240 | Role: Unified Workflows list (agent triggers, LifeOps reminders/schedules/routines, device reminders) layered over `views.workflows`, plus the Home workflow card values. | Verdict: SIMPLIFY (then MERGE into a `views/workflows/` owner with workflow-adapter.ts and clock-adapter.ts)
- Importers: 1 — `apps/app/src/main.tsx:51` (installed twice: `:168` under `!browserDevProfile` and `:175` under `developmentAgentWorkflows`). Imports `./automations.css`.
- Text/path pins: `test/automations-unified.test.mjs:75` (T2: transforms and `vm.runInNewContext` the whole file); `test/home-cards.test.mjs:285-289` (T1: regex `homeWorkflowDescription:loaded\.description`, `presentHomeWorkflowFreshness\(`); `test/fixtures/reminder-open-intent.mjs:9`, `test/fixtures/scheduled-task-controls.mjs:10` (read the source); `test/locale-time-usage.test.mjs:16` (in the `pending` set — the test fails once the file has no bare time call, so converting it requires removing the entry); `specs/quint/services/manifest.json:4947-4981` (9 path/text pins), `specs/quint/application/manifest.json:663,1141,2604`; `specs/quint/refinement/services/automation-request-settlement.mjs:9`, `specs/quint/refinement/application/workflow-request-recovery-admission.mjs:7`, `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:358` (T10 text-anchored harnesses); `test/support/feature-parity.mjs:341`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62 | B2/C1 | `(connectionController as typeof connectionController & {getAutomationsClient():Binding\|null}).getAutomationsClient()` — `getAutomationsClient` is already a member of the `connectionController` object literal (`runtime/connection-ui.tsx:2198,2460`), so the cast is dead weight; local `Binding` type duplicates its return type. | `const binding=()=>connectionController.getAutomationsClient();` and `type Binding=ReturnType<typeof connectionController.getAutomationsClient>`. | None (type-only). |
| 2 | 63-65 | C3 | `reminderBlock`, `automationBlock`, `scheduleBlock` are the same expression differing only in the issue filter (`issue.source==='reminders'` / `'automations'&&unavailable` / `'schedules'`). | One `block(match:(i:AutomationIssue)=>boolean)` and three one-line partials, or a `blockFor(source)` lookup. Keeps the strings `'Refresh first'`. | Low. |
| 3 | 19-21, 154 | D4 | Alias renames `const dateInput=automationLocalDateInput`, `const timeZone=workflowDeviceTimeZone`; `future()` duplicates the inline `Date.now()+3600000` on line 154. | Import under the real names; use `future()` on 154. | None. |
| 4 | 28, 54, 55, 208, 229 | C3 | The `HH:MM` regex `/^([01]\d\|2[0-3]):([0-5]\d)$/` appears 4 times plus a 12-hour variant; `workflow-local-time.ts` already owns clock parsing. | One `isClockTime()` exported from `runtime/workflow-local-time.ts`. | Low. |
| 5 | 99 | B2 | `view.refreshManagement?.(abort.signal,valid)` — always set by `workflow-adapter.ts:106`, which `main.tsx` installs immediately before this adapter at both call sites. Same for `workflow.waitingFor?.(…)` (177; always returned by `workflow-adapter.ts:479`) and `values?.call(this)\|\|{}` (172; `renderVals` always exists). | Call directly. | Low; breaks if install order changes (it is fixed in main.tsx). |
| 6 | 170-172 | D3/A7 | `p.cachedAutomationsHome` is added to `Component.prototype` but is only ever called from this file's own `renderVals` wrapper (`git grep cachedAutomationsHome`: 0 hits elsewhere in apps/test/specs). | Make it a closure function `cachedHome(shell)`; drop the prototype member. | None. |
| 7 | 176 | A7 | `workflowDetail:workflow.detail` — no template binding, no reader (`git grep workflowDetail` → only this line). | Delete the key. | None. |
| 8 | 238-239 | D3/D2 | Five listener handles stored as shell fields (`this.automationCommitted`, `automationConnection`, `automationSuspend`, `automationResume`, `automationVisibility`) only so unmount can remove them; module already captures `owner`. Mount wrapper is one 1,100-character line. | Hold the handles in closure variables (one shell per page) or an `AbortController` whose `signal` is passed to every `addEventListener`; one `controller.abort()` in unmount. | Low. |
| 9 | 175 | P17/D9 | Render starts a load: `queueMicrotask(()=>void refresh(true))` inside `view.render`, after mutating `state='loading'`. | Move to a "view became active" hook (componentDidUpdate when `S().view==='workflows'`) once the hook registry (D2) lands. | Medium (load timing); covered by workflow browser specs. |
| 10 | 36-37, 130, 132, 172, 177, 192, 206, 208-209, 212-215, 238 | D8/D9 | Minified statement soup; `rowStatus` and `rowPasses` are nested ternaries; `work()`'s request port (130) and its catch (132, an inline HTTP status table) are single lines. | Format; split `rowStatus` into a lookup table plus fallback; name the "rejected" predicate (`definitelyRejected(error,sent)`). | None (format) / low. |
| 11 | 105, 132 | B1 | `catch{await store.load(abort.signal).catch(()=>undefined);break;}` and `catch{/* Keep unconfirmed requests in the existing journal. */}` swallow acknowledgement failures. The second has a reason (keep the journal entry); the first double-swallows. | Keep the commented one; in 105 drop the inner `.catch(()=>undefined)` or comment why the reload failure is ignorable. | Low. |
| 12 | 149, 215 | NEW (locale bypass) | `new Date(...).toLocaleString(undefined,{dateStyle,timeStyle})` ignores the Android 12/24-hour preference that `locale-time.ts` applies (this file is on the `pending` list in `test/locale-time-usage.test.mjs`). | Use `formatDateTime`/`formatFullDateTime` from `./locale-time`; remove the file from the `pending` set. | User-visible: times follow the phone's hour cycle (the intended behaviour). |
| 13 | 184-186 | D6/A3? | "Recovery · Back up or reset" management card, web only (`!Capacitor.isNativePlatform()`), opening `browser/domain-recovery` via `createWorkflowRequestRecovery` (60). The web build is a development preview (README:50), so this never renders in an APK. | Move the card and the recovery import behind the dev module boundary (D6). Owner question whether web intent-journal recovery is wanted at all. | Low. |
| 14 | 181 | D3 | `open:()=>window.dispatchEvent(new Event('alpha:hosted-digests'))` — window custom event as a bus to `runtime/hosted-digest-ui.tsx:135`. | Import and call an exported `openHostedDigests()` from hosted-digest-ui. | Low. |
| 15 | 42-50, 168-169, 171-173, 237-239 | D2/P6 | Wraps `views.workflows.render/back/onLeave` and `Component.prototype.renderVals/componentDidMount/componentWillUnmount`; module-level `owner`/`api` captures; coordinates with workflow-adapter through `view.automationsManaged=true` (44, read at `workflow-adapter.ts:462`). | When building the workflows owner (C5/P11): one module composes workflow + automations + clock decorators explicitly; replace the `automationsManaged` flag with the owner choosing the renderer. | Medium; whole-view refactor. |
| 16 | 16, 45, 87, 192, 208-209 | C1 | `type Bag=Record<string,any>` and `owner:any`. | Use the shared `ShellHost`/`ViewApi` types (types.md). | None. |
| 17 | 61 | C1 | Inline object type of `homeCache` (8 fields) duplicated in spirit by the Home card presenter in `home-cards.ts`. | Name it `HomeWorkflowSnapshot` next to `presentHomeWorkflowFreshness` in `home-cards.ts`. | None. |

Main.tsx cross-file item: `main.tsx:168` and `:175` both call `installWorkflowAdapter`+`installAutomationsAdapter`; collapse into `if(!browserDevProfile\|\|developmentAgentWorkflows){…}` (research n–z, confirmed).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 16 | ~45 files in `prototype/` (e.g. `browser-adapter.ts:20`, `calendar-adapter.ts:15`) | `prototype/shell-types.ts` |
| `Binding` | type | 17 | return type of `connectionController.getAutomationsClient` (`runtime/connection-ui.tsx:2460`) | `ReturnType<…>` / export from connection-ui |
| `Editor` | type | 18 | none | keep local |
| `Filter` / `filters` / `filterNames` | type/const | 32-34 | `FEED_FILTERS` upstream; `workflow-filters.ts` labels (`workflowFilterLabel`) | `workflow-filters.ts` |
| `dateInput`, `timeZone` | alias const | 19, 21 | `automationLocalDateInput`, `workflowDeviceTimeZone` | delete (import directly) |
| HH:MM regex | inline helper | 28, 54, 208, 229 | `runtime/workflow-local-time.ts` clock parsing | `runtime/workflow-local-time.ts` (`isClockTime`) |
| `recurringClock`, `presetAt` | helper | 23-30 | `workflowClockSchedule/Expression` in `runtime/workflow-local-time.ts` | `runtime/workflow-local-time.ts` |
| `setClock`/`readClock`/`repeatFor` | helper | 54-56 | 12/24h conversion also in `locale-time.ts` (`formatHours`) and `clock-adapter.ts` | `runtime/workflow-local-time.ts` |
| `deviceRow` | helper | 38-40 | none | keep |
| `homeCache` shape | inline type | 61 | Home card values in `home-cards.ts` / `home-overview-cards.ts` | `home-cards.ts` (`HomeWorkflowSnapshot`) |
| `SCHEDULE_INVALID` | const | 35 | none | keep |

## Proposed end state
- Delete the cast (62), alias consts (19, 21), `workflowDetail` (176), `p.cachedAutomationsHome` (170, becomes a closure), optional calls on always-present members.
- Collapse the three `*Block` functions into one parameterised helper; move clock helpers (`recurringClock`, `presetAt`, `setClock`, `readClock`, HH:MM regex) into `runtime/workflow-local-time.ts`.
- Listener bookkeeping through one `AbortController`, not five shell fields.
- Times through `locale-time.ts`.
- Web-only recovery card moved behind the dev boundary.
- Formatted; `rowStatus`/`work()` error classification split into named functions.
- Later (with D2/P11): becomes `views/workflows/automations.ts`, composed by a workflows owner together with `workflow-adapter.ts` and `clock-adapter.ts`; `view.automationsManaged` flag removed.
- Estimated ~205 lines before formatting (≈35 removable), mostly by de-duplication.

## Verification
- `npm run verify` (host tests listed above; T1/T2 tests `automations-unified`, `home-cards:285`, fixtures `reminder-open-intent`, `scheduled-task-controls` will break on text changes and are D10 delete candidates).
- Quint: `specs/quint/services/manifest.json` automation-request-settlement and `workflow-request-recovery-admission` replays (text-anchored; update anchors or port to imports, T10).
- Browser: `test/browser/unified-automations.spec.ts` and the workflows specs (`npm run test:browser`, production variant).
- Android build per AGENTS.md; device check of Workflows list, reminder snooze and schedule edit.
