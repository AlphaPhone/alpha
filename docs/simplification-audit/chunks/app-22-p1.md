# Chunk app-22-p1 — `apps/app/src/runtime/connection-ui.tsx` lines 1-2103

Report: [`files/apps/app/src/runtime/connection-ui.tsx.part1.md`](../files/apps/app/src/runtime/connection-ui.tsx.part1.md)

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/connection-ui.tsx (1-2103) | SPLIT (after deleting hosted/paired/personal path and legacy migrations) | 2103 | ≈ 1550 (pre-Prettier), spread over `runtime/connection/*` |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Selection` | type | connection-ui.tsx:84 | selection-key readers in 12 files (`main.tsx:106`, `hosted-digest-ui.tsx:84`, `hosted-live-source-ui.tsx:132`, six `browser/*`, `prototype/workflow-authoring.ts`, `product/alpha-product-registration.ts`) | `runtime/connection/selection.ts` (`readSelection`, `SELECTION`) |
| `SELECTION`/`CLOUD_SERVICE`/`RESIDENT_QA`/`PLAN_ADMISSION`/`LEGACY_HOSTED_SELECTION` | const | :204, :251, :256, :288, :1612 | literals in 12 files | `runtime/storage-keys.ts` |
| `DeviceRequest` | type | :202 | `device-actions.ts` request param | import from `device-actions.ts` |
| `cloudEnvironmentAllowed` | helper | :209 | `cloud-protocol.ts:52` `cloudEnvironmentAvailable`, `cloud-environment-selection.ts` | `cloud-environment-selection.ts` |
| `signInRefused`/`errorKindOf`/`expired`/`transientIdentityRead`/`failureKindOf`/`terminalCodeOf` | helper | :324, :334, :871, :1199, :1764, :1810 | plain-object guard (~35 copies, `cloud-protocol.ts:124` `object`) | `runtime/parse.ts` `isRecord` + `runtime/connection/errors.ts` |
| inline AbortError checks | helper | :342, :557, :907 | 24 inline copies; `prototype/note-recorder.ts:81` | shared `isAbortError` |
| inline abort/timeout race | helper | :696-715 | `alpha-client.ts:321-376`, `local-agent.ts:236-250`, `abort-signal.ts` | shared `raceAbort` |
| device key generator (inline) | helper | :1158, :1488, :1555 | `browser/revision.ts:2` `revision()` | `lib/random.ts` `randomHex32()` |
| device enrollment block | helper | :1152-1185, :1482-1510, :1547-1582 (+ `DeviceActions` ctor :1195) | each other | `runtime/connection/device-actions.ts` `enrollDevice()` / `newDeviceActions()` |
| plan-end derivation | helper | :602, :1255, :1387 | each other | `subscription-entitlement.ts` `reportedPlanEnd()` |
| saved-credential assertion | helper | :533/:539, :742, :786, :1534, :1883 | each other | `cloud-account.ts` `assertSavedCredential()` |
| teardown sequence | helper | :817-836, :1055-1066 | each other | `endConnection()` |
| operation-slot release | helper | :946-950, :953-957, :1036-1039 | each other | `releaseOperation(controller, patch)` |
| `conversationKey` | helper | :1647 | `agent-calendar.ts:14`, `main.tsx:102`, `:430`, `calendar-sync-host.ts:99` | shared `sessionKey()` (byte-identical output) |
| `JSON.stringify` choice equality | helper | :628, :1887, :1913, :1981 | each other | `conversation-selection.ts` `sameChoice()` |
| UUID regex | helper | :1132, :1949 | `validateUuid` (already imported at :25) | `validateUuid` |
| `aiOffMessage` / `NEEDS_PLAN_NOTICE` | const | :1709, :345 | each other | one `AI_OFF` |
| `presentActionEntry`, `HistoryEntry`, `actionStateLabels` | helper/type | :1996-2014 | `device-record-presentation.ts` | `device-record-presentation.ts` |
| `ConnectionSnapshot`, `Active`, `RestoredMessage`, `CloudServiceSession`, `SignInView`, `ResidentAdmission` | type | :96, :203, :88, :85, :193, :1210 | subsets re-declared in test fakes | `runtime/connection/state.ts` etc. |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Hosted/paired/personal-Cloud path in range (`inspectPersonal`…`personalWork` :607-657, `detachCloudTarget` :658, `developmentCloud` :800, `remoteIdentity`/`connectRemote` :1121-1191, `connectCloud` :1527-1592, `pairingError` :1698-1707, `pair`/`restoreHosted`/`cloudList`/`personal*` :2055-2103) | every entry `throw Error(pairingRetired())` unless `testMocksEnabled`; PRD "No hosted-agent pairing"; DECISIONS D5. Still driven by e2e: `cloud-account-panel.spec.ts:40`, `view-navigation-react.spec.ts:40`, `chat-continuity.spec.ts:689` (`c.pair`), `connection-preference-storage.spec.ts:18` (`cloudList`), `cloud-personal-onboarding.spec.ts` | High, after those specs are moved to the resident dev bridge |
| `migrateLegacyMock`, `legacyHostedKind`, `LEGACY_HOSTED_SELECTION`, `migrateLegacyHostedSelection`, legacy arms of `selection()`, `persistOffline`, re-save in `startResidentGate` | A1; new package starts empty; `LEGACY_HOSTED_SELECTION` "unread by product code"; only `test/legacy-hosted-selection.test.mjs` + 2 production e2e specs seed it | High |
| `restoreSavedResidentHistory` + `void` (:1967-1968) | git grep: 0 references outside the file | High |
| `export` on `membershipReadDiagnostic` (:552), `presentActionEntry` (:1999) | git grep: no importer in apps/test/scripts/specs/.eliza | High |
| `residentQa` / `RESIDENT_QA` / gate-QA message (:256-260, :1460) | test-mocks only; referenced only by audit marker | Medium (owner) |
| test-mocks remote-agent copy (`PENDING_FALLBACK`, `NO_SESSION_FALLBACK`, test arms of `NO_AGENT_SEND`/`NO_AGENT_VOICE`, `RESIDENT_UNPACKAGED` remote arm, `NO_PROVIDER_DEVELOPMENT`) | dies with the hosted path | High with item 1 |
| `'remote'|'local'|'cloud'` arms of `Active`, `ConnectionSnapshot.kind`, `agents`, `cloudPersonal` | dies with the hosted path | High with item 1 |
| typeof window/document/navigator guards and `typeof …subscribeConversationEvents` | B2; browser-only module, method always defined | High |
| Lazy `residentRebindQueue ??=` | B4 | High |

## Cross-file actions
- **Hosted-path removal**: `connection-ui.tsx` (both parts) + `cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx`, `development-cloud-agents.ts`, `remote-protocol.ts` (`RemoteProtocol` class only), `browser/development-cloud*.ts(x)`; e2e `test/browser/{cloud-account-panel,view-navigation-react,chat-continuity,connection-preference-storage,cloud-personal-onboarding}.spec.ts`; `test/cloud-personal-protocol.test.mjs`; `scripts/test-cloud-personal-flow.ts`; `specs/quint/application/manifest.json`; `scripts/audit-production-bundle.ts` marker lists may stay.
- **Selection key**: export `SELECTION` once and replace literals in `main.tsx`, `hosted-digest-ui.tsx`, `hosted-live-source-ui.tsx`, `prototype/workflow-authoring.ts`, `product/alpha-product-registration.ts`, six `browser/*` files; delete legacy migrations with `test/legacy-hosted-selection.test.mjs`, `test/browser/connection.production.spec.ts`, `test/browser/connection-boundaries.production.spec.ts` seeding.
- **Random hex**: move `browser/revision.ts` `revision()` to `lib/random.ts`; use in enrollment.
- **Plan-end helper**: `subscription-entitlement.ts` + three call sites here; Quint `specs/quint/refinement/services/plan-admission-ports.mjs` reads this text.
- **`deviceCapabilities` move**: update 21 rows in `test/support/feature-parity.mjs`.
- **Setter hooks → host object**: part 2's `setDeviceExecutor`, `setForegroundExecutor`, `setDeviceReadReview`, `setNavigationContext`, `setViewInteractionExecutor`, `setDeviceRecovery` and their callers (`main.tsx`, prototype adapters).
- **Upstream imports**: replace `../../../../vendor/eliza/packages/core/src/utils/uuid` (:25) and deep `.eliza` imports with the `@eliza/*` alias (D13, Vite + tsconfig + test loader).
- **Formatter**: only after the 98 source-text readers are deleted/ported.

## Text/path pins
- 98 files read the source text: e.g. `scripts/test-connection-history.ts:197` (split at `export function ConnectionChooser()`, regex on `ResidentRecoveryPanel`/`productionCloudSignInRequired`), `scripts/test-agent-camera-flow.ts:82`, `scripts/test-calendar-availability-flow.ts:58`, `specs/quint/refinement/application/{account-sheet,client-observation-support,cloud-plan-recheck,resident-liveness}.mjs`, `specs/quint/refinement/services/plan-admission-ports.mjs`, `specs/quint/legacy/{sign-in,maps,notes-view,google-connect}/check-*-refinement.mjs`.
- `specs/quint/application/manifest.json` (72 references), `specs/quint/native/manifest.json`, `specs/quint/legacy/manifest.json`.
- `test/support/feature-parity.mjs` (21 rows naming `connection-ui.tsx deviceCapabilities`).
- `scripts/audit-production-bundle.ts:30-63` copy markers from this range.
- 216 `test/` files and dynamic imports `'/src/runtime/connection-ui.tsx'` in browser specs/scripts (path pin).
- `scripts/fixtures/{cloud-delegation,hosted-live-source}/entry.tsx` import `connection-ui.css` (sibling path).

## New patterns
- NEW (candidate for C3/C5 note): **in-file triplicated protocol blocks** — the same multi-step protocol (device enrollment, connection teardown, operation release, plan-end derivation) copied inside one god module per connection kind. Fix by extracting the step once before splitting the module.
- NEW (A8 variant): **orphaned doc comments** — comments whose subject was deleted or moved (lines 210, 269-272, 1694-1696, 1713, 1925-1928), now attached to an unrelated declaration.

## Owner questions
1. Can the five e2e specs that drive `pair`/`cloudList`/personal setup be rewritten on the resident development bridge so the hosted/paired/personal-Cloud path can be deleted, not just moved behind the dev boundary?
2. Is the staging "subscription gate QA" mode (`alpha.connection.resident-qa.v1`) still used? If not, delete it with its audit marker.
3. Should `calendarAgendaObservation` (browser-only AlphaCalendar source) and `connectDevelopment` move to `browser/`, injected through one host object?
