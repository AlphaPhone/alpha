# apps/app/src/prototype/notifications-adapter.ts
- Lines: 212 | Role: two installers — `installCanonicalNotificationTaps` (Android: open the view a tapped Alpha system notification names, then acknowledge it) and `installNotificationsAdapter` (notice rows, swipe/clear/open/ask for the **simulated** shade) — plus `ownNotificationSelection` | Verdict: SPLIT (product taps stay; simulated shade moves to dev)
- Importers: `main.tsx:47,140,142`. `agent-adapter.ts:684` calls `shell.notificationSelection?.()` (set by this file).
  Text/path pins: `scripts/test-canonical-notification-navigation.ts:6` reads the text, strips imports and evaluates it (T2), and drives `shell.alphaCanonicalTap/alphaCanonicalWake`; `scripts/test-agent-context-browser.ts:120-129` (`ownNotificationSelection`); `specs/quint/refinement/application/canonical-notification-tap-admission.mjs:147-151` (T10); `specs/quint/application/manifest.json:1230,1314,2673,3799`; `specs/quint/application/README.md`; `test/fixtures/shade-notice-question.mjs`, `test/fixtures/shade-row-custody.mjs:106-107` (reads `alphaNoticeSelection`, `alphaNoticeSelectionRendered`); `test/support/feature-parity.mjs:403`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 90-212 | A5/D6 | `installNotificationsAdapter` is installed only when `systemShade==='simulated'` (`main.tsx:141-142`: "Notice rows feed only the development stand-in shade; product builds read no notice list (#416)"), i.e. dev builds. 122 lines of dev-only code (and the `AlphaNotifications.list/open/dismiss/clear` calls) live in a product module. | Move lines 90-212 (and `Notice`, `ownNotificationSelection`) to `apps/app/src/dev/simulated-shade-notices.ts` behind the dev import; `main.tsx:142` imports from there. If the owner retires the simulated shade, delete it with `test/fixtures/shade-*.mjs` and the Quint entries. | Low for move; owner decision for delete (research §7.5). Also check `agent-adapter.ts:684` `notificationSelection?.()` stays optional only for the dev path. |
| 2 | 17 | C2 | 400-char inline `AlphaNotifications` plugin interface (canonicalPending, acknowledgeCanonical, addListener, list, open, dismiss, clear). | Typed plugin module; product keeps only `canonicalPending/acknowledgeCanonical/addListener`. | None. |
| 3 | 73-74 | D7/D3 | `this.alphaCanonicalTap=tapCurrent;this.alphaCanonicalWake=wake;` — instance fields read only by `scripts/test-canonical-notification-navigation.ts` and the Quint harness (grep: no product reader). | Keep the closures local; tests drive taps through the `canonicalNotificationTap` listener and `focus`. | Low; T2 test rewrite needed. |
| 4 | 22-89 | D9 | `tapCurrent` is a 60-line closure with 5 nested staleness predicates (`canCommit`, `canNavigate`, `originCurrent`, `exactChat`) re-reading `this.S().typing/recording/draft` 3×. | Extract `composerIdle(shell)` and `originKey()`; keep the order of checks exactly (Quint model `CanonicalNotificationTapAdmission`). | Medium: formal model pins this behaviour. |
| 5 | 53 | C6 | View alias map `{calendar, notes, automations:'workflows', clock:'calendar', reminders:'calendar','apps/tasks':'calendar'}` inline. | Hoist to a module const; check twin in `runtime/device-view-profile.ts`. | None. |
| 6 | 62, 66, 76, 83 | B1 | `catch{/* Native read status is unconfirmed. */}`, `catch{/* Native custody retains or retires the tap… */}`, `.catch(()=>undefined)`, `.catch(()=>{})`. Commented, specified. | Keep. | — |
| 7 | 21-22, 88, 92, 108-144 | D2 | Patches `componentDidMount/DidUpdate/WillUnmount/renderVals` and adds 4 prototype methods (`refreshAlphaNotices`, `publishAlphaNoticeSelection`, `notificationSelection`, `renderVals`); 9 patches in total (research worst offender #21). | Hook registry; dev part moves with #1. | — |
| 8 | 23, 88, 108, 123, 128 | B2 | `mount?.call(this)`, `update?.apply`, `unmount?.call` — base lifecycle methods always exist on `Component`. | Call directly. | None. |
| 9 | 134, 141, 208 | NEW (JSON identity) | `JSON.stringify(next)!==JSON.stringify(this.alphaNotices)` etc. | Dev-only after #1; leave. | — |
| 10 | 16 | C1 | Local `Notice` type; twin `context-selection.ts:119 Notice` (optional fields). | Use one `Notice` type from `context-selection.ts` (extend there). | None. |
| 11 | 10 | C3 | `opaque` id regex `/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/`; similar opaque-id regexes across the renderer (e.g. `native-adapter.ts:24` provider model). | Shared `isOpaqueId` if the patterns match exactly. | None. |
| 12 | 1-9 | D13 | Deep `.eliza` import for `sensitiveReadingText`. | Alias. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `opaque` | const | 10 | opaque-id regexes elsewhere | `lib/ids.ts` |
| `Notice` | type | 16 | `context-selection.ts:119` | `context-selection.ts` |
| `native` plugin | const | 17 | none | typed plugin module |
| `views` map | const | 53 | view aliasing in `device-view-profile.ts`/model deep links | module const |
| `shadeActive`, `active`, `key`, `clearableKeys`, `retireQuestion`, `retireVisit` | helper | 93-107 | none | dev module |

## Proposed end state
`prototype/notification-taps.ts` (~70 lines): `installCanonicalNotificationTaps` with a typed plugin, local closures, no test-only instance fields. `dev/simulated-shade-notices.ts` (~120 lines) or deleted. Est. product lines after: ~70.

## Verification
`scripts/test-canonical-notification-navigation.ts`, `scripts/test-agent-context-browser.ts`, Quint canonical-notification-tap admission, tests using `test/fixtures/shade-notice-question.mjs` and `shade-row-custody.mjs`, production bundle audit (dev shade code absent), Android build and emulator tap test, feature-parity test.
