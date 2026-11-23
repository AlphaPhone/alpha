# Research: `apps/app/src/runtime/` files a–m, plus `main.tsx` wiring

Scope: the 121 files in `apps/app/src/runtime/` whose names start with a–m (15,237 lines, 1.18 MB of source), plus how `apps/app/src/main.tsx` wires them together. I went deep on `connection-ui.tsx`, `cloud-protocol.ts`, `alpha-client.ts`, `local-agent.ts`, `hosted-digest-ui.tsx`, `calendar-sync-*.ts`, `agent-calendar.ts` and `diagnostics-export.ts`, and skimmed the rest. This was read-only; nothing else was changed.

Method: I read the large files in chunks and skimmed every small file. I counted with `grep`/`awk` over `apps/app/src`. Every "dead" or "test-only" claim was checked by grepping `apps android scripts test specs .github package.json vite.config.ts`. Some claims are marked **(suspicion)**: they need a product decision or a runtime check before acting.

---

## 1. Area overview

`runtime/` is the renderer's service layer under the prototype UI (`prototype/model.js` `Component` plus about 50 `install*Adapter` monkey-patches). The a–m half holds:

- **The connection hub.** `connection-ui.tsx` is 4,206 lines and 389 KB, the largest file in the app. It holds the whole connection, sign-in, plan, provider, conversation-history, device-action and voice-binding state machine. That state lives in 51 top-level `let` variables plus one `state: ConnectionSnapshot` (≈45 fields). It exports `connectionController`, a 1,400-line object literal (lines 2198–3600) with **133 methods**. Other files use 131 distinct `connectionController.*` members from 40 files. It also renders `ConnectionChooser`, a 430-line component (3646–4074) that covers the sign-in page, account sheet, provider keys, dev chooser and QA.
- **Transports and protocols.**
  - `alpha-client.ts`: a session-bound chat/approve client.
  - `local-agent.ts`: the resident-agent bridge (native Capacitor `Agent` plugin, or the dev `/__alpha-local-agent` HTTP bridge).
  - `local-agent-stream.ts`, `local-agent-native-*.ts`: streaming and event parsing.
  - `cloud-protocol.ts`: Eliza Cloud auth, billing, Google, Maps, Calendar and Gmail in one class.
  - `automations-protocol.ts`, `development-cloud-agents.ts`: the latter is the test-mocks-only hosted-agent extension.
- **Feature controllers.**
  - Calendar: `agent-calendar*.ts`, `calendar-*.ts`, `canonical-calendar-draft.ts`, `home-calendar-selection.ts`.
  - Google: `google-*.ts(x)`.
  - Digests: `hosted-digest*.ts(x)`, `hosted-*`.
  - Inbox and mail: `inbox-*`, `gmail-*`, `mail-*`.
  - Voice: `cloud-voice*`, `local-voice`, `local-speech-text`, `local-reply-speech`, `live-voice`, `app-speech`, `development-cartesia-*`.
  - Device actions: `device-actions.ts`, `device-record-presentation.ts`.
  - Diagnostics: `crash-log.ts`, `diagnostics-export.ts`, `error-boundary.tsx`.
- **Thin re-export shims** over the generated upstream tree `../../../../.eliza/client-features/...`. There are 364 deep-relative imports of that tree in `apps/app/src`.

How it hangs together: `main.tsx` imports `connection-ui` (the singleton), `google-connection-ui` and `hosted-digest-ui`. It then mounts the prototype `Component` after running about 50 `install*` functions, each of which patches `Component.prototype` (for example `installBrowserCapabilityTiles` replaces `p.renderVals`, `main.tsx:196-204`). Cross-module signalling uses a window `CustomEvent` bus: 246 distinct `'alpha:*'` event or key strings. Examples are `alpha:connection-toast` (`main.tsx:433`) and `alpha:calendar-sync-source-changed` (`connection-ui.tsx:460`). Every feature reaches back into `connectionController.getSnapshot()` or `getCloudClient()` for identity.

In production the real architecture is one path: a resident on-device agent, an optional Cloud account for inference and Google, and native Capacitor plugins. Beside that one path the code still carries:

1. A test-mocks-only remote, paired and hosted-Cloud agent path.
2. A dev browser bridge.
3. A "browser Cloud resident" dev mode.
4. A private local preview mode.
5. A Cartesia dev voice mode.
6. Mock and fixture mode.

These are threaded through the same production functions as constant-folded flags.

---

## 2. Pattern taxonomy

### P1. Minified-style "statement soup" lines

**What it looks like:** whole functions on one line. Statements are joined by `;`, have no spaces and run to hundreds or thousands of characters.

**Evidence:**
- In `connection-ui.tsx`, **315 lines are over 200 characters, 35 are over 500, and the longest is 1,892** (line 3688).
- `hosted-digest-ui.tsx`: 51 lines over 200, longest 1,308 (line 541).
- `cloud-personal-setup.tsx`: 14 lines but 3.4 KB, one line of 1,573 characters.
- `agent-calendar.ts:36` is 908 characters: a single boolean expression that validates a whole persisted calendar feed.
- `development-cartesia-conversation.ts:151` is 1,055 characters.

Examples:
- `connection-ui.tsx:530`: `function detachService() { stopEntitlementRefresh();redeemedPlanEnd=null; clearEntitlementKeyCache(); retireReadReplies();for(const request of appRequests)request.abort(...); clearPersonalSetup(); membershipRead?.abort();membershipRead=null;service = null; update({ cloudAccount: null,membershipBalance:undefined,... }); }`
- `connection-ui.tsx:3688`: `recoverDevelopment` puts three `openDomainRecovery(...)` calls, each carrying a paragraph of user copy, in one ternary chain on one line.
- `connection-ui.tsx:3685`: a `useEffect` that adds 4 window listeners and a visibility listener, and cleans them up, all on one line.
- `connection-ui.tsx:3895`: the whole "Actions" `<details>` JSX tree is one 1,452-character line.
- `hosted-digest-ui.tsx:100`: a native listener plus a callback read plus cleanup, on one line.
- `local-agent.ts:153` and `:157`: the WebSocket message and error handlers as one-liners.
- `alpha-client.ts:448`: receipt validation as a 400+ character boolean expression.

**Why it hurts:** reviews and diffs cannot be read, blame is useless, cyclomatic complexity is hidden, and it hides the duplication listed below. The same repo is also formatted three ways:
- `alpha-client.ts` and `calendar-sync-host.ts` look Prettier-formatted.
- `connection-ui.tsx` uses 1-space or 2-space minified style.
- `hosted-digest-ui.tsx` mixes tabs and spaces (569 tab lines and 257 space lines). `calendar-sync-settings.ts` does too (184 / 54).

No formatter config exists at the repo root.

**Treatment:** adopt one formatter (Biome or Prettier) and run it repo-wide as a mechanical first commit. Then split by responsibility.

**Risk:** about 197 test and script files reference `connection-ui.tsx` by path. Many of them are source-text tests (for example `test/calendar-sync-settings-navigation.test.mjs:8` does `fs.readFileSync(... calendar-sync-settings.ts)` and evaluates it in `vm`). Reformatting will break those tests. They should be deleted or replaced, not preserved.

### P2. God module plus global mutable state (the "connection hub")

**What it looks like:** one module owns unrelated concerns through module-level `let`s, and exposes them through a giant object literal.

**Evidence:**
- 51 top-level `let`s in `connection-ui.tsx`: `state`, `active`, `operation`, `startup`, `epoch`, `sending`, `cloud`, `service`, `residentBinding`, `planManagementReturn`, `networkLostUnder`, `inAppGoogle`, `personalSetup`, `stoppedReply`, … (lines 290–1416).
- 148 named functions in the file.
- `connectionController` has 133 methods spanning:
  - sign-in (`signInGoogle`, `verifySignInCode`)
  - billing (`residentRedeem`, `openFunding`)
  - provider keys (`removeProvider`, `selectSavedProvider`)
  - conversations (`listHistory`, `truncateMessage`)
  - device actions (`execute`, `reconcileAction`)
  - workflows (`workflowPhoneActions`)
  - calendar approvals (`readCalendarApproval`)
  - SMS drafting (`draftSmsReply`, line 2283)
  - voice (`prepareVoiceConversation`, `getResidentLiveVoice`)
  - dev (`authorDevelopment`, `mock`, `pair`, `cloudPersonal*`)
- Setter injection to break import cycles: `setDeviceExecutor`, `setForegroundExecutor`, `setDeviceReadReview`, `setNavigationContext`, `setViewInteractionExecutor`, `setDeviceRecovery` (lines 2225–2258). These are mutable hooks that other modules must call before use. Hence defaults like `deviceExecutor = async () => ({status:'failed', summary:'Device action executor is unavailable.'})` (line 447).
- `CloudProtocol` (`cloud-protocol.ts:152-626`) mixes:
  - auth (`login`, `signInWithGoogle`, `verifyMfaSignIn`)
  - billing (`membershipCredits`, `redeemSubscriptionCode`)
  - Google OAuth, Maps (`mapsRequest`, `mapsTile`) and Calendar
  - about 15 Gmail pass-through one-liners: `gmailAccounts(signal) { return this.gmail.gmailAccounts(signal); }` (lines 586–625).

**Treatment:** split `connection-ui.tsx` into these pieces, using explicit dependencies instead of setter hooks:
1. `connection/state.ts`, a typed store.
2. `connection/resident.ts`, lifecycle and rebind.
3. `connection/cloud-account.ts`, sign-in, plan and membership.
4. `connection/provider-keys.ts`.
5. `connection/conversation.ts`, history and delivery.
6. `connection/device-actions.ts`.
7. One React file per panel.

Expose the Gmail client directly (`cloud.gmail`) instead of delegating method by method.

**Risk:** behaviour is coupled through the shared `epoch` and `state`. Extract one concern at a time, behind the existing e2e specs.

### P3. Hand-rolled staleness fences everywhere ("generation/epoch guard closures")

**What it looks like:** each async function captures `selected=active, session=state.session, generation=epoch, …`. It then defines `const current=()=>{signal.throwIfAborted(); if(generation!==epoch||active!==selected||state.session!==session||…) throw Error(…)}` and calls `current()` after every `await`.

**Counts:** in `connection-ui.tsx`, `const current=` appears 26 times, `generation!==epoch` 35, `active!==selected` 26, and `throwIfAborted` **115**. Across a–m, `throwIfAborted` appears 253 times, `const current=` 52, and ad-hoc `*Generation` / `*Epoch` counters 27.

**Examples:**
- `connection-ui.tsx:2195`: `const current=()=>{signal.throwIfAborted();if(generation!==epoch||active!==selected||state.session!==session||state.history!==history||service!==account||state.open||state.busy||document.hidden)throw Error(...)}`
- `connection-ui.tsx:2245`: the same pattern, but it also compares `JSON.stringify(navigationContext?.())!==JSON.stringify(context)`.
- `connection-ui.tsx:2301`: `pendingActions` uses yet another variant.
- `local-agent.ts:233`, `:252`, `:274`: `if(generation!==this.generation||...)throw new Error('Local agent connection changed.')` three times in one loop.
- `agent-calendar.ts:60`, `:66`: `current` and `check` closures.
- `alpha-client.ts:348-357`: `epoch !== this.epoch || revision !== this.context.revision || transport !== this.transport`.

**Why it hurts:** every function must remember which pieces of global state to fence on. Variants drift: some fence on `document.hidden`, some do not. The fences make up most of each function's branches.

**Treatment:** one `ConnectionScope` object created per connection. It carries an `AbortController` that `retire()` aborts. Callers pass `scope.signal` and use `scope.assertCurrent()`. Bumping `epoch` then reduces to aborting that signal.

**Risk:** some guards add view conditions (`state.open`, `document.hidden`). Those must stay explicit.

### P4. Retired hosted / paired / Cloud-agent path kept alive for test mocks ("legacy beside new")

**What it looks like:** the PRD says "No hosted-agent pairing" and "it never hosts Alpha's agent". The code itself says the path is retired: `connection-ui.tsx:1609` reads *"Saved selection kinds of the retired hosted and paired agents"*, and `cloud-protocol.ts:27` reads *"this adapter has no hosted-agent discovery … The development-only hosted-agent fixture extends it"*. Yet the full implementation remains, gated by `testMocksEnabled`:
- `connectCloud` (`connection-ui.tsx:1527-1592`, 65 dense lines with device enrollment)
- `connectRemote` (1136), `pair` (2055), `restoreHosted` (2058), `pairedRequest` (2115), `cloudList` and `cloudManage`
- the personal Cloud agent onboarding: `personalAccept`, `personalPoll`, `personalFinalize`, `personalRecoveryOpen`, `personalConnect` (2079–2113)
- `const hosted = testMocksEnabled ? {...} : null` (2126)

Supporting files total about 780 lines and 76 KB:
- `cloud-personal-protocol.ts` (95 lines, 13.7 KB)
- `cloud-personal-intent.ts`
- `cloud-personal-setup.tsx`
- `development-cloud-agents.ts` (149)
- `remote-protocol.ts`'s `RemoteProtocol` class (n–z half)
- `browser/development-cloud*.ts(x)`

Further traces of the retired path:
- The `Selection`, `Active` and `ConnectionSnapshot.kind` unions still carry `'remote'|'local'|'cloud'` (`connection-ui.tsx:84`, `:179`, `:203`). There are 46 `kind==='remote'|'local'|'cloud'` comparisons.
- `diagnostics-export.ts:27`: `CONNECTIONS=['starting','recovering','offline','resident','remote','local','cloud']`.
- `diagnostics-export.ts:31`: `VOICE_ROUTES=[…,'paired-agent','development-agent',…]`.
- User copy forks: `NO_AGENT_SEND = testMocksEnabled ? 'Connect your remote agent in Settings…' : 'Use on phone · not sent'` (line 229). There are four such constants (227–230) plus `NO_PROVIDER_DEVELOPMENT` (1748) and `RESIDENT_UNPACKAGED` (1413).

**Why it hurts:** this is the single largest source of branches in the hub. Every resident-path function has to rule out the other kinds.

**Treatment:** delete the hosted, paired and personal-Cloud agent path entirely, including the test-mocks fixtures, the `'remote'|'local'|'cloud'` union members and the `hosted` object. If test mocks need a fake agent, fake the resident bridge (`LocalAgentBridge`) instead.

**Risk:** check the tests and Quint specs that still drive the path: `test/cloud-personal-protocol.test.mjs`, `test/browser/cloud-personal-onboarding.spec.ts`, `scripts/test-cloud-personal-flow.ts`, `specs/quint/application/manifest.json`. Owner sign-off is needed that test-mocks builds no longer demonstrate pairing.

### P5. Persisted-preference migrations for data that cannot exist ("migrate-on-read legacy readers")

**What it looks like:** these run on every start:
- `migrateLegacyMock()` (`connection-ui.tsx:1599`)
- `migrateLegacyHostedSelection()` (1623). It appends old choices to `LEGACY_HOSTED_SELECTION = 'alpha.connection.legacy-hosted-selection.v1'` "for recovery and diagnostics", but that key is "unread by product code" (comment at 1611).
- `startResidentGate`, which rewrites the selection to `resident` (1642).
- `selection()`, which maps `'offline'|'none'|'mock'|remote|local|cloud` to `resident` (875–890).

In production, `selection()` always yields `{kind:'resident'}` or null. The whole `alpha.connection.selection.v1` machinery is effectively a constant. Even so, that raw key string is **hard-coded in 12 files**, including `main.tsx:106`, `hosted-digest-ui.tsx:84`, `hosted-live-source-ui.tsx:132` and six `browser/*` files.

Other legacy readers:
- The legacy credential path: `legacySignInRecovery` (`connection-ui.tsx:120`, `:3670-3672`, `:3880`) calls `cloudSignIn.savedSignInRecoveryStatus()`, which is backed by `AlphaCloudSignInPlugin.java:90` ("eligible encrypted legacy production credential").
- `agent-calendar.ts:6-13`, `:69-71`, `:105-107`, `:184-228`: `LegacyCalendarCapture`, statuses `'transition-required'|'legacy-recovery'`, and `confirmLegacyRetention`. These are backed by `legacy-calendar-preservation.ts`, which hashes and re-validates the old browser calendar document on every bootstrap.
- `browser-notes-document.ts:14-62`: `legacy()` archives of `LEGACY_NOTES_KEY` / v1 / v2 / daily notes, plus `assertLegacy` on every receipt.
- `clock-handoff-history.ts:12`: `clockHandoffLegacyKey`.
- `device-view-profile.ts:6`: `const legacy = ''`.
- `hosted-digest-ui.tsx:66`: "a record without a phase (older build) counts as dispatched".
- `diagnostics-export.ts:26`: "'offline' only parses older exports".

**Why it hurts:** the README and PRD say the new package ID `ai.alphacompute.alphaphone` "starts with its own private data … No app-data migration". Installed data from older builds therefore never reaches this package. Browser-only legacy archives are dev data.

**Treatment:** delete the mock and hosted migrations, the `LEGACY_HOSTED_SELECTION` key and the legacy-notes and legacy-calendar preservation. Collapse `Selection` to nothing in production. Keep one exported key constant if the dev chooser stays.

**Risk (suspicion):** confirm whether the Pixel v44 "former package" sideload ever runs this renderer with old storage. The README says the new package installs separately with its own data, so it should not. Confirm `savedSignInRecoveryStatus` with whoever owns `AlphaCloudSignInPlugin`.

### P6. Flag zoo: test-mock and dev modes threaded through production code

**What it looks like:** at least seven independent build or runtime modes, each re-derived locally from `import.meta.env`:

| flag | defined at |
| --- | --- |
| `testMocksEnabled`, `devSurfacesEnabled`, `privateLocalPreviewEnabled` | `build-flags.ts` |
| `browserCloudResidentEnabled` | `browser-cloud-resident.ts:5` |
| `browserLocalAgentEnabled` / `developmentBridgeAllowed` | `local-agent.ts:69-72`, duplicated verbatim in `local-agent-storage.ts:9` |
| `developmentCartesiaVoiceEnabled` | `development-cartesia-flag.ts:3` |
| `developmentCloudVoiceEnabled`, `developmentCloudRealtimeVoiceEnabled` | `development-cloud-voice.ts` |
| `developmentSessionsAllowed` | `alpha-client.ts:185` |
| `stagingAvailable`, `cloudSignInHandOffAvailable` | `cloud-protocol.ts:36`, `:48` |
| `residentQa()` localStorage switch | `connection-ui.tsx:256-260` |

Nine distinct `VITE_*` variables are read in `src`. `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` is read directly 11 times despite `build-flags.ts` existing.

**Counts:** flag references per file: `connection-ui.tsx` **105** (66 of them `testMocksEnabled`), `local-agent.ts` 27, `development-cartesia-conversation.ts` 10, `hosted-digest-ui.tsx` 9, `development-cloud-voice.ts` 9, `cloud-voice.ts` 8.

**Examples:**
- `connection-ui.tsx:3610` and `:3639`: `isAndroid&&!testMocksEnabled&&…` inside production gating logic.
- `connection-ui.tsx:811`: `state = isAndroid && !testMocksEnabled ? {...next, open: connectionChooserVisible(...)} : next` inside the generic `update()`.
- `connection-ui.tsx:2108`: `testMocksEnabled&&environment==='staging'?stagingCloud.agents:productionCloud.agents`.
- `local-agent.ts:551-662`: every provider function forks on `if(browserCloudResidentEnabled) … browserResidentCall(...)` before the native path.
- `main.tsx:105-121`, `:288`, `:316`, `:335`, `:408`: mock banner, fixture and simulated apps inside `Phone()` layout code.
- `alpha-client.ts:185`, `cloud-protocol.ts:36`, `:48`: `import.meta.env === undefined || …`. This exists only so Node contract tests can import the source without Vite; a test concern leaks into the production flag.

Three separate mechanisms strip dev code: constant folding, vite module stubs (`vite.config.ts:27-35`), and `scripts/audit-production-bundle.ts`.

**Why it hurts:** with 2^7 configurations, nobody can reason about what production does. Dev copy and dev branches sit inside the product state machine.

**Treatment:**
1. Move every flag into `build-flags.ts` and remove the `import.meta.env===undefined` shims (tests should run through Vite or e2e).
2. Collapse the browser dev modes (`browserCloudResident`, `privateLocalPreview`, `browserLocalAgent`, the Cartesia and Cloud-voice dev modes) to at most one dev transport, implemented as an alternative `LocalAgentBridge` registered in `browser/register`. Production modules then never branch on it.
3. Delete `residentQa` staging QA unless the owner needs it.

**Risk:** owner decision on which dev modes are still used (see Section 7).

### P7. Swallowed errors

**What it looks like:** `catch{}`, `catch{return null;}`, `catch{/* comment */}`, `.catch(()=>{})`.

**Counts in a–m:** **79** swallowing `catch` blocks and **85** no-op `.catch(()=>…)`. `connection-ui.tsx` alone has 29 and 20, out of 121 catches. `hosted-digest-ui.tsx` has 3 and 12.

**Examples:**
- `connection-ui.tsx:321`: `writePlanAdmission … catch { /* Offline grace is a convenience… */ }`
- `connection-ui.tsx:443`: `void connectionController.cancelReadReply(binding).catch(()=>{})`
- `connection-ui.tsx:455`: `try{const info=await DailyApps.surfaceInfo()…}catch{return false;}`
- `connection-ui.tsx:476`, `:488`: `}catch{return;}`, `}catch{return undefined;}`
- `connection-ui.tsx:3597-3599`: `if (cloudSignIn?.addListener) Promise.resolve(cloudSignIn.addListener(...)).catch(() => { /* No retained return. */ })`
- `connection-ui.tsx:1604-1605`, `:1633`, `:1644`: `try{save(...)}catch{/* The resident starts either way. */}`
- `diagnostics-export.ts:39-55`: the whole sanitizer is wrapped in `try{…}catch{return;}`.
- `hosted-digest-ui.tsx:100`: `.catch(()=>null)` and `.catch(()=>{})` on native listener setup.
- `main.tsx:255-260`, `:340`, `:375`, `:380`, `:384-385`.

There are 27 `try{…localStorage…}` wrappers in `src`. `localStorage` always exists in the Android WebView and the dev browser.

**Treatment:** let errors propagate to the error boundary or crash log by default. Keep a swallow only where the code states a real expected failure (for example quota). Remove the `localStorage` try wrappers.

**Risk:** some swallows guard cleanup in `finally` paths. Review each one rather than bulk-replacing.

### P8. Optional-call and typeof guards on things that always exist ("phantom capability detection")

**What it looks like:** optional methods and existence checks for APIs or native methods that ship in the same APK.

- `LocalAgentBridge` (`local-agent.ts:35-58`) declares about 20 optional methods (`stop?`, `getStatus?`, `configureProvider?`, `clearProvider?`, `residentAttachment?`, …). Callers then guard them: `local-agent.ts` has **23** `!native.X` checks, for example:
  - line 558: `if(!native.prepareProviderConfiguration||!native.configureProvider||!native.cancelProviderConfiguration)throw Error('Update Alpha')`
  - line 662: `'Provider removal is unavailable in this version.'`
  - line 721: `'Cloud billing is unavailable in this version.'`

  The renderer and the native plugins ship in one APK, so version skew is impossible. These guards are also **ineffective**: `local-agent.ts:64-65` itself notes that *"Capacitor proxies synthesize functions for unknown methods"*, so `native.X` is always truthy. The same reasoning applies to `native.getStatus?.()` (84, 91) and `this.bridge.cancelStart?.()` (284).
- `cloudSignIn?.addListener` (`connection-ui.tsx:3597-3599`) and `!cloudSignIn?.savedSignInRecoveryStatus` (3670). `cloudSignIn` is `CloudSignInPort|undefined` only because of the web build (`native-connection.ts:29`).
- `typeof selected.remote.subscribeConversationEvents!=='function'` (`connection-ui.tsx:414`), although `LocalAgentProtocol` always defines it.
- `owner?.voiceConversationActive?.()` and `flush.some(draft => typeof draft !== 'function')` in `main.tsx:345`, `:357`, against methods of its own `Component`.
- Environment guards: 35 `typeof window|document|navigator|localStorage|BroadcastChannel|crypto === 'undefined'` checks in `src`, 13 of them on `BroadcastChannel`. Examples: `calendar-sync-host.ts:299`, `connection-ui.tsx:372`, `:460`, `:495`. These exist only so Node tests can import the modules.
- `typeof __APP_VERSION__ === 'string'` (`error-boundary.tsx:15`), although Vite always defines it.
- `CloudCredentialStore.acceptsReferences?` and `clearIfCurrent?` (`cloud-protocol.ts:75`, `:81`): dev-host capabilities exposed on the production interface.

**Treatment:** make the bridge interfaces non-optional, delete the "in this version" branches, and drop the environment guards.

**Risk:** check the browser `LocalAgentBridge` (dev). It implements fewer methods, which is a reason to give dev its own complete fake bridge rather than optional members.

### P9. Parse-everything defensive validation of our own components

**What it looks like:** hand-written structural validators for data that our own native code or our own process produced.

- `agent-calendar.ts:29-37`: `savedCalendar` validates every field of a persisted feed in one 908-character expression.
- `alpha-client.ts:409-462`: re-validates `AgentReply` from `LocalAgentProtocol` (the same app).
- `local-agent.ts:258-261`: a 4-line predicate on a 503 body.
- `diagnostics-export.ts`: 309 lines of allowlist sanitizers. This one is justified for privacy, but it is hand-written.
- `local-agent.ts:531-547`: `parseProviderStatus` and `managedProviderStatus`.
- `cloud-service-info.ts`: an exact-key-set check.

There are 23 inline plain-object guards (`typeof x==='object'&&!Array.isArray(x)`) and about 12 named re-implementations (Section 4). `zod` 4.6.7 is a root dependency (`package.json:122`) but is used **nowhere** in `apps/app/src`.

**Treatment:** validate once at the trust boundaries (Cloud HTTP, persisted storage) with shared schemas, either zod or upstream contracts. Trust in-process and native results that are typed by the plugin interface.

**Risk:** the privacy allowlists in `diagnostics-export.ts` must stay allowlists. Converting them to schemas is fine.

### P10. Thin re-export shims over upstream ("path-keeping wrappers")

**What it looks like:** modules whose whole body re-exports or renames an upstream export, kept "for existing import names" or "for tests". Several say so outright:
- `live-segment-stream.ts:5`: *"Alpha keeps this module path for its native transport and tests; it adds no behavior of its own."*
- `clock-contract.ts`: *"Alpha supplies only its brand name and existing import names"*. It defines aliases such as `export const clockDays = clockHandoffFormDays; export const isClockOperation = isClockHandoffOperation`.

Shims with five or fewer code lines: `maps-contract.ts` (1), `gmail-read-ahead.ts` (1), `mail-preview.ts` (1), `assistant-draft-record.ts` (2), `clock-agent-review.ts` (5), `inbox-attachment.ts` (5), `live-segment-stream.ts` (5), `inbox-unsaved-record.ts` (6).

Near-shims: `calendar-availability.ts`, `calendar-linked-store.ts`, `calendar-linked-provider.ts`, `clock-handoff-history.ts`, `browser-note-documents.ts`, `automation-completion.ts`, `image-sms.ts`, `agent-calendar-client.ts`, `gmail-grants.ts`, `gmail-background.ts`, `aosp-image.ts`.

Upstream is also imported in three different styles:
- package alias (`@elizaos/core/read-memo`, `connection-ui.tsx:4`)
- deep-relative `../../../../.eliza/client-features/...` (364 times)
- deep-relative `../../../../vendor/eliza/...` (10 times, including `connection-ui.tsx:25`)

**Treatment:**
- Give the generated tree a TS path alias (for example `@eliza-client/*`) and import upstream directly.
- Delete the shims and their alias renames.
- Never import `vendor/eliza` sources directly from the renderer.

**Risk:** `test/support/feature-parity.mjs` and the `specs/quint/**/manifest.json` files pin these file paths. They must be updated together.

### P11. Superseded parallel implementation still in tree (the Calendar linked-sync stack)

**What it looks like:** a complete client-side "local-first Google Calendar sync" stack is unreachable from production:
- `calendar-sync-settings.ts` (257 lines)
- `calendar-sync-host.ts` (345)
- `calendar-linked-store.ts`, `calendar-linked-provider.ts`, `calendar-linked-storage.ts`
- `native-calendar-sync.ts` (n–z)

**How I checked:**
- `openCalendarSyncSettings` and `startCalendarSyncHost` have no importer in `apps/` (repo-wide grep).
- `calendar-sync-host.ts` is imported only by `calendar-sync-settings.ts`.
- Production imports only the *type* `CanonicalCalendarSyncSettings` from `calendar-sync-settings.ts` (`google-connection-ui.tsx:17`, `google-accounts.ts:5`).
- `specs/quint/refinement/application/google-calendar-link-publication.md:18-22` confirms it: *"The separate `openCalendarSyncSettings` export … has test callers … the browser fixture calls legacy mode."*

The live path is `agent-calendar.ts` `changeSync()` (line 263) together with `google-accounts.ts` `linkGoogleCalendar` (351), which uses the agent's canonical `LinkedCalendarControl`. Inside the dead file, `openCalendarSyncSettings(canonical?)` (line 14) itself forks between a "legacy" imperative-DOM dialog and `openCanonicalCalendarSyncSettings` (203).

**Treatment:** delete the stack. Move `CanonicalCalendarSyncSettings` into `google-accounts.ts`. Remove `CloudProtocol.googleCalendarSync` (`cloud-protocol.ts:548`) if nothing else calls it. Remove the native `CalendarSyncBridge.java` / `AlphaCalendarPlugin` sync methods after the Android owner confirms.

**Risk:** PRD AP-09 mentions "explicit local-first sync". Confirm the agent-side linked control is the accepted implementation.

### P12. Exported for tests only ("test-shaped production API")

**Evidence:** of **450** top-level exports in runtime a–m, **113** have no importer elsewhere in `apps/app/src`, and **81** of those are referenced only from `test/`, `scripts/` or `specs/`. Examples:
- `connection-ui.tsx`: `REPLY_FAILURES`, `RESTORED_FAILURES`, `PLAN_RECHECK_INTERVAL_MS`, `inferenceUnavailableReply`, `productionCloudSignInRequired`, `explicitSignedOutCloudEntry` (8 test files each), `LEGACY_HOSTED_SELECTION`, `turnReplyRow`.
- `canvas-geometry.ts`: `WIDE_CANVAS`, `canvasScale`, `canvasTop`.
- `clock-contract.ts`: `validateClockOperation`, `validateClockOutcome`.
- `cloud-protocol.ts`: `planManagementUrl`, `cloudEnvironmentAvailable`.
- `aosp-image.ts`: `detectAospImage`, `ADMITTED_AOSP_VIEW_ADAPTERS`.
- `cloud-service-info.ts` as a whole: used only by `scripts/browser-cloud-dev-bridge.ts`, `scripts/cloud-readiness.ts` and a test. Its comment saying "the sign-in screen accepts" is stale.

Exports dead even in tests: `always-on-listener.ts` `assistantInvocation` and `MODAL`. Unused in any other file and probably dead: `membershipReadDiagnostic`, `WEB_CLOUD_UNAVAILABLE`, `presentActionEntry`, `crash-log.ts` `INFERENCE_SCHEMA_KEYWORDS` / `INFERENCE_PARAMETERS` / `INFERENCE_TOOL_NAMES`, `device-actions.ts` `alphaDeviceActionProfile` / `validateReviewableDeviceOperation`. Grep each before deleting.

**Treatment:** with the owner's "essentially no unit tests" policy, delete the unit tests and the extra exports together. Move `cloud-service-info.ts` to `scripts/`.

### P13. Comment-as-changelog ("decision archaeology")

**What it looks like:** long comments that narrate owner decisions, dates, issue numbers and past states instead of describing the code. There are 132 decision or issue citations in a–m, and 2,197 comment lines out of 15,237.

- `connection-ui.tsx:299-308`: a 10-line paragraph explaining the `networkLostUnder` state machine, including "A→B→A seen by status reads alone cannot spend it".
- `connection-ui.tsx:121-127`: "(#410) … owner directive 2026-10-13 … (owner, 2026-11-03)".
- `connection-ui.tsx:1613-1622`, `:214-216`.
- `main.tsx:243-246`.

**Why it hurts:** the comments rot and restate what the PRD already says. A long justification usually signals a state machine that should be simplified instead.

**Treatment:** keep one-line *why* comments and move decision history to the PRD or git history.

### P14. Inline styles and markup duplication in React

**Evidence:**
- 49 copies of `<span aria-hidden="true" data-alpha-icon="/icons/lucide/X.svg" style={iconStyle('X')}/>`, 47 of them in `connection-ui.tsx`.
- 47 `style={{…}}` blocks in a–m TSX.
- Style constants re-declared per file: `hosted-digest-ui.tsx:5-9` (`srOnly`, `dot`, `chip`, `switchRow`) and `calendar-sync-settings.ts:10-13` (`syncDot`, `syncSwitch`).
- `error-boundary.tsx:20-25` carries CSS strings.
- `main.tsx:100` `MOCK_BANNER_STYLE` is a CSS string injected at runtime.

**Treatment:** add an `<Icon name>` component, move the shared presentation styles into CSS, and delete the per-file style helpers.

### P15. Three UI paradigms at once

**What it looks like:**
- React components (`ConnectionChooser`, `HostedDigestPanel`).
- Imperative DOM dialogs (`calendar-sync-settings.ts` builds a `<dialog>` with `document.createElement`; there are 33 `document.createElement` calls in a–m `.ts`).
- Prototype class patching (`main.tsx:196-204` overrides `Component.prototype.renderVals`; there are about 50 `install*Adapter(Component, VIEWS)` calls).

**Treatment:** an owner-level direction is needed. At minimum, new runtime UI should be React-only, and the imperative dialogs should be deleted when their features go (P11).

### P16. Window-event bus as integration layer

**What it looks like:** modules coordinate through untyped string events: `'alpha:connection-toast'`, `'alpha:calendar-sync-source-changed'`, `'alpha:google-accounts-changed'`, `'launcher-home'`, `'alpha-back'`, `'alpha:device-state'`, `'alpha:dev-incoming-call'` (`connection-ui.tsx:3685`), and others. That makes 246 distinct `'alpha:…'` / `'alpha-…'` event or key literals in `src`.

**Treatment:** a typed event map, or direct subscriptions on the owning store.

**Risk:** the events are also used by e2e tests and the dev controls.

### P17. Duplicated inline primitives

These are inline re-implementations of tiny helpers; locations are listed in Section 4:
- SHA-256 to hex: 28 copies across 23 files.
- Abortable delay and timeout race: `cloud-protocol.ts:143` exports `delay()`, yet it is re-implemented inline at `local-agent.ts:267-272`, `alpha-client.ts:324-345`, `local-agent.ts:236-250` and `abort-signal.ts`.
- `AbortError` detection: 24 inline `name==='AbortError'` checks.
- The `/__alpha-local-agent` fetch: 5 copies in `local-agent.ts:104`, `:109`, `:117` and `local-agent-storage.ts:11`.
- `JSON.parse(localStorage.getItem(SELECTION)||'null')`.

### P18. Dormant features behind hard-coded `false`

**What it looks like:**
- `voice-entry-policy.ts:2`: `externalVoiceInvocationEnabled = false`. This keeps `always-on-listener.ts`, `main.tsx:430` and `prototype/model.js:5441` alive but unreachable. `main.tsx:424` actively runs `stopWakeListenerForChatOnly`.
- `build-flags.ts`: `updateChannelCheckEnabled = false as boolean`. The `as boolean` exists to defeat narrowing so the dead code still type-checks.

**Treatment:** owner decision. The PRD lists always-on listening as an AOSP MVP gate. Either keep it as a real feature flag with a test, or delete it and re-add it later.

### P19. Generated and dev artifacts living in `runtime/`

**What it looks like:**
- `cloud-deployment.generated.ts` is generated output checked into `runtime/`.
- Dev-only modules sit beside production modules: `development-cartesia-conversation.ts`, `development-cartesia-flag.ts`, `development-cloud-agents.ts`, `development-cloud-voice.ts`, `mock-admission.ts`, `browser-cloud-resident.ts`, and the `developmentDeviceStore` / `developmentActionJournal` in `local-agent-storage.ts:15-30`.
- `browser-*.ts` files in `runtime/` (`browser-notes-document.ts`, `browser-note-documents.ts`, `browser-cloud-resident.ts`) duplicate the role of the `browser/` folder.

---

## 3. Delete candidates

| Candidate | Evidence | Confidence |
| --- | --- | --- |
| Hosted, paired and personal-Cloud agent path: `connectCloud`, `connectRemote`, `pair`, `restoreHosted`, `pairedRequest`, `cloudList`, `cloudManage`, `personal*`, the `hosted` object, `developmentCloud()`, `detachCloudTarget` (`connection-ui.tsx:658`, `800`, `1121-1192`, `1527-1592`, `2055-2126`); the related controller methods `pair`, `cloudList`, `cloudPersonal*`, `getPairedVoiceBinding`; `cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx`, `development-cloud-agents.ts`; the `RemoteProtocol` class in `remote-protocol.ts` (keep its shared helpers, which `local-agent.ts:14` imports) | PRD: "No hosted-agent pairing"; code comments call the path "retired" (`connection-ui.tsx:1609`, `1614`); production reaches it only through `testMocksEnabled` | High (needs owner OK for test-mocks) |
| `'remote'|'local'|'cloud'|'mock'|'none'|'offline'` Selection kinds and the `Selection` persistence in production; `migrateLegacyMock`, `migrateLegacyHostedSelection`, `LEGACY_HOSTED_SELECTION`, `legacyHostedKind`, `persistOffline`, `startResidentGate`'s re-save | P5; new package starts with empty data (README "installs the new package separately, with its own private data") | High |
| `calendar-sync-settings.ts` (except the type), `calendar-sync-host.ts`, `calendar-linked-store.ts`, `calendar-linked-provider.ts`, `calendar-linked-storage.ts`, `native-calendar-sync.ts`, `CloudProtocol.googleCalendarSync` | P11; repo-wide grep shows test- and spec-only callers | High in the renderer; Android bridge needs owner |
| `legacy-calendar-preservation.ts` and the `legacy`, `transition-required` and `legacy-recovery` handling in `agent-calendar.ts` | P5; preserves an old browser calendar document; Android starts empty | Medium (suspicion: confirm no Android legacy data reaches the browser document) |
| Legacy-notes archive in `browser-notes-document.ts` (`legacy()`, `assertLegacy`, `LEGACY_NOTES_KEY`, `readLegacyDailyNotes`) | P5 | Medium |
| `legacySignInRecovery`, `restoreSavedSignIn`, `savedSignInRecoveryStatus` (TS and Java) | P5 | Medium (needs Android owner) |
| `!native.X` "in this version" / "Update Alpha" guards (23 in `local-agent.ts`) and the optional `?` on `LocalAgentBridge` and `NativeRequestPort` methods | P8; ineffective with Capacitor proxies; renderer and native ship together | High |
| Re-export shims: `maps-contract.ts`, `gmail-read-ahead.ts`, `mail-preview.ts`, `assistant-draft-record.ts`, `inbox-unsaved-record.ts`, `live-segment-stream.ts` (test-only), `calendar-availability.ts`, `clock-agent-review.ts`, the alias renames in `clock-contract.ts` | P10 | High (update importers) |
| `cloud-service-info.ts` leaves the renderer and moves to `scripts/` | P12; only scripts and tests import it | High |
| `diagnostics-export.ts` retired enum values `remote`, `local`, `cloud`, `paired-agent`, `development-agent`, `offline` | P4; "only parses older exports" | Medium (aggregator scripts may read old files) |
| `residentQa` / `RESIDENT_QA` staging-QA localStorage mode, and `stagingAvailable` in production code | P6 | Medium (owner) |
| Test-only exports (81) and probably-dead exports (`assistantInvocation`, `MODAL`, `membershipReadDiagnostic`, `WEB_CLOUD_UNAVAILABLE`, `presentActionEntry`, `INFERENCE_*` in `crash-log.ts`, `alphaDeviceActionProfile`, `validateReviewableDeviceOperation`) | P12; grep counts above | High for the probably-dead ones once grep-confirmed |
| `import.meta.env === undefined` Node shims (`alpha-client.ts:185`, `cloud-protocol.ts:36`, `:48`, `local-agent.ts:69`, `local-agent-storage.ts:9`, `browser-cloud-resident.ts:5`, `development-cloud-voice.ts`, `build-flags.ts`) | P6; exist only for Node unit tests | High once those tests go |
| `typeof BroadcastChannel / window / document / navigator / localStorage` guards (35) and the `localStorage` try wrappers (27) | P8, P7 | High |
| `ConnectionSnapshot` fields used only by dev paths: `agents` (CloudAgent list), `cloudPersonal`, `providerSignInSelection`, the `kind` values `remote`, `local`, `cloud` | P4 | High alongside P4 |
| Dormant `externalVoiceInvocationEnabled` paths and `updateChannelCheckEnabled` | P18 | Owner decision |

---

## 4. Duplicated types and helpers

| Item | Locations | Proposed single home |
| --- | --- | --- |
| `type Bag = Record<string,any>` | 60 declarations app-wide (41 written `type Bag=Record<string,any>;`, 18 `= Record<string, any>`, 1 `= any`). In this slice only `runtime/canonical-calendar-draft.ts` and `runtime/maps-event-return.ts`; the rest are in `prototype/` (42) and `browser/` (15); `runtime/reminder-creations.ts` is n–z | Replace with the real upstream types (for example the calendar draft contract). Where the prototype shell really is untyped, use one exported `ShellState` type in `prototype/model.d.ts`. Never re-declare it. |
| Plain-object guard (`object` / `record` / `isRecord`) | `cloud-protocol.ts:124` (exported `object`), `automations-protocol.ts:22`, `calendar-approval.ts:34`, `agent-calendar.ts:25`, `local-agent.ts:163`, `device-view-profile.ts:8`, `cloud-voice-limit.ts:13`, `view-navigation.ts:22`, `remote-protocol.ts:65`, `native-calendar-sync.ts:14`, `owner-reminder-notification-protocol.ts:24`, `prototype/calendar-approval-fields.ts:5`, `browser/simulator-recovery.ts:9`, `browser/workflow-history.ts:5`, plus 23 inline copies | One `isRecord` / `expectRecord` in a shared `runtime/parse.ts`, or zod schemas |
| `string` / `uuid` / `timestamp` / `identifier` parsers | `cloud-protocol.ts:128-142`, `local-agent.ts:176`, `agent-calendar.ts:32`, `cloud-service-info.ts:7`, `diagnostics-export.ts:128` (`text`) | Same `parse.ts` or zod |
| SHA-256 to hex | 28 copies in 23 files, including `agent-calendar.ts:27`, `legacy-calendar-preservation.ts:13`, `connection-ui.tsx`, `google-accounts.ts`, `assistant-draft-store.ts`, `inbox-local-store.ts`, `native-recovery-backup.ts:11`, `browser/revision.ts`, `browser/hosted-results.ts`, `prototype/reminder-adapter.ts` | `sha256Hex(text|bytes)` in one util |
| Abortable sleep / delay | `cloud-protocol.ts:143` `delay` (exported), `local-agent.ts:267-272`, `calendar-availability.ts` re-exports upstream `abortablePause` | Upstream `abortablePause` or the one `delay` |
| Abort and timeout race (`Promise.race([op, cancelled])` plus listener cleanup) | `alpha-client.ts:321-376`, `local-agent.ts:236-250`, `:282-318`, `abort-signal.ts:21-46` | One `raceAbort(promise, signal)` helper |
| `AbortError` detection | 24 inline `name==='AbortError'`; named copy at `prototype/note-recorder.ts:81` | `isAbortError(e)` |
| `developmentBridgeAllowed` expression | `local-agent.ts:69`, `local-agent-storage.ts:9` (verbatim) | `build-flags.ts` |
| `/__alpha-local-agent` POST fetch | `local-agent.ts:104`, `:109`, `:117`, `local-agent-storage.ts:11`, plus `browserResidentCall` in `browser-cloud-resident.ts` | One dev bridge client in `browser/` |
| `'alpha.connection.selection.v1'` literal | 12 files (`main.tsx:106`, `hosted-digest-ui.tsx:84`, `hosted-live-source-ui.tsx:132`, `connection-ui.tsx:204`, `prototype/workflow-authoring.ts`, `product/alpha-product-registration.ts`, six `browser/*`) | Delete with P5, or one exported constant |
| Versioned storage keys | 52 distinct `alpha.*.vN` keys app-wide. In this slice: `alpha.connection.{selection,cloud-service,resident-qa,plan-admission,legacy-hosted-selection,conversations}.v1`, `alpha.calendar-sync-config.v1` (BroadcastChannel name), `alpha.browser.calendar-sync-config.v1`, `calendar:owner:v1`, `calendar:feed:v1`, `calendar:access-refused:v1` (`agent-calendar.ts:68`, `:73`), `alpha.crash-log.v1` | One `storage-keys.ts` registry. Drop the `.v1` suffix for new data, since nothing ever bumps or migrates it except via the legacy readers above. |
| `LocalProviderStatus` parsing | `local-agent.ts:531` `parseProviderStatus` and `:572` `managedProviderStatus` | Single parser |
| `CloudEnvironment`-allowed predicates | `connection-ui.tsx:209` `cloudEnvironmentAllowed`, `cloud-protocol.ts:52` `cloudEnvironmentAvailable`, `cloud-environment-selection.ts` `resolveCloudEnvironmentCore` | `cloud-environment-selection.ts` only |
| Session-identity tuples built with `JSON.stringify([...])` (`conversationKey` at `connection-ui.tsx:1647`; `calendarOwnerKey` at `agent-calendar.ts:14`; `main.tsx:102`, `:430`; `calendar-sync-host.ts:99`) | Many slightly different tuples of origin, owner, agent and session | One `sessionKey(session, ...extra)` helper |
| Inline style helpers (dot, chip, switch row, sr-only) | `hosted-digest-ui.tsx:5-9`, `calendar-sync-settings.ts:10-13`, `cloud-delegation-ui.tsx:10` (`small`) | CSS classes |

---

## 5. Structure and foldering

- **Monolith to split:** `connection-ui.tsx` (4,206 lines). Proposed `runtime/connection/` subfolder:
  - `store.ts`
  - `resident.ts`
  - `cloud-account.ts` (sign-in, plan, membership)
  - `provider-keys.ts`
  - `conversation.ts` (history, delivery, stopped replies)
  - `device-actions.ts` (execute, pending, workflows, calendar approvals)
  - `voice-binding.ts`
  - `ui/SignInPage.tsx`, `ui/AccountSheet.tsx`, `ui/ProviderKeys.tsx`, `ui/ResidentRecoveryPanel.tsx`
  - the dev chooser in `browser/`
- **Also split:**
  - `hosted-digest-ui.tsx` (870 lines): panel, native source consent, and missed-run logic.
  - `cloud-protocol.ts` (626): auth, billing, google and maps clients.
  - `local-agent.ts` (756): bridge transport, `LocalAgentProtocol`, and provider-key management (lines 506–725).
- **Dev code in the wrong folder:** `development-*.ts`, `mock-admission.ts`, `browser-cloud-resident.ts`, and the dev stores in `local-agent-storage.ts` belong in `browser/` or a `dev/` folder, so production modules never import them.
- **Misleading names:**
  - `connection-ui.tsx` is mostly not UI.
  - `local-agent-storage.ts` contains only development stores.
  - `browser-note-documents.ts` and `browser-notes-document.ts` sit side by side in `runtime/` (near-identical names).
  - `cloud-service-info.ts` is a script helper.
  - `calendar-sync-settings.ts` is a dead dialog whose only live content is a type.
  - `maps-contract.ts` is a one-line `export *`.
- **Generated file in a source folder:** `cloud-deployment.generated.ts`. Move it under a `generated/` folder, or emit it into the ignored `.eliza` / web-dist tree.
- **Tiny files to merge or delete:**
  - Re-export shims (P10).
  - `modal-inert.ts` (7 lines) and `deletion-owner.ts` (10) can live with their single caller.
  - The `calendar-linked-*` trio (delete, P11).
  - `development-cartesia-flag.ts` (3) belongs in `build-flags.ts`.
  - `clock-handoff-history.ts` and `clock-agent-review.ts` are thin wrappers.
- **`main.tsx` (438 lines):**
  - `Phone()` mixes layout geometry (lines 261–318), dev device controls (323–334) and mock banners.
  - `mountPhone()` mixes native capability reads, update gating and mock admission.
  - About 50 `install*` monkey-patches run in an order-dependent sequence (comment at 190: "Outermost so Home composes with every binding above").
  - Move the dev controls and the mock banner to a dev-only module, and move geometry into `canvas-geometry.ts`.

---

## 6. Worst offenders

1. `runtime/connection-ui.tsx`: a 4.2k-line god module. It has 51 global `let`s, a 133-method controller, 315 lines over 200 characters, 105 flag references, 29 swallowing catches, the retired hosted path and legacy migrations.
2. `runtime/hosted-digest-ui.tsx`: an 870-line component. It has mixed tab/space indentation, 1.3k-character lines, 12 no-op `.catch`, a raw storage-key read, and inline styles.
3. `runtime/local-agent.ts`: about 20 optional bridge methods, 23 ineffective native-version guards, a dev bridge inside the production transport, duplicated abort races, and provider management mixed into the transport.
4. `runtime/cloud-protocol.ts`: a god client across auth, billing, Google, Maps, Calendar and Gmail, with pass-through Gmail delegation and test-only env shims.
5. `runtime/agent-calendar.ts`: legacy-calendar preservation states, 908-character validator lines, and a bootstrap-diagnostic string trail.
6. `runtime/calendar-sync-settings.ts`: dead in production (test-only), an imperative-DOM dialog with legacy and canonical modes.
7. `runtime/calendar-sync-host.ts`: dead in production. It is reachable only through #6.
8. `runtime/cloud-personal-protocol.ts`, `cloud-personal-setup.tsx` and `cloud-personal-intent.ts`: the retired personal hosted agent. `cloud-personal-setup.tsx` is 14 lines totalling 3.4 KB.
9. `runtime/development-cloud-agents.ts`: the test-mocks hosted-agent fixture extending the production `CloudProtocol`.
10. `runtime/diagnostics-export.ts`: 309 lines of hand-rolled allowlists that still list retired connection kinds and voice routes.
11. `runtime/development-cartesia-conversation.ts`: a dev-only voice path in `runtime/` with a 1,055-character line, imported by prototype adapters.
12. `runtime/legacy-calendar-preservation.ts`: a legacy reader with no reachable data.
13. `runtime/browser-notes-document.ts`: legacy notes archive asserts on every read.
14. `runtime/alpha-client.ts`: re-validates its own agent's replies, its abort race duplicates `local-agent.ts`, and it carries a test-only `import.meta.env` shim.
15. `runtime/google-connection-ui.tsx`: 38 lines over 200 characters (up to 886), and depends on the type from the dead `calendar-sync-settings.ts`.
16. `runtime/cloud-membership-ui.tsx` and `cloud-sign-in-ui.tsx`: lines of 555–907 characters of JSX.
17. `runtime/local-agent-storage.ts`: only dev stores, plus a duplicated `developmentBridgeAllowed` expression.
18. `runtime/clock-contract.ts`: a re-export plus rename shim (10 aliases).
19. `runtime/cloud-voice.ts`: 8 flag forks (dev Cartesia, dev Cloud voice, browser resident) in the production speech path.
20. `runtime/device-actions.ts`: 7 upstream deep imports and unused exports (`alphaDeviceActionProfile`, `validateReviewableDeviceOperation`). I only skimmed this one.
21. `main.tsx`: the order-dependent sequence of about 50 monkey-patching installs, plus mock and dev UI inside `Phone()`.

---

## 7. Open questions and risks

1. **Test-mocks scope.** Do test-mocks builds still need to demonstrate remote, paired or hosted-Cloud agents and personal Cloud agent onboarding? If not, P4 removes roughly 1,500 lines of source across the hub and its supporting files.
2. **Dev modes.** Which of `browserCloudResident` (`npm run dev:cloud`), `privateLocalPreview`, `browserLocalAgent`, `VITE_ALPHA_DEV_CARTESIA`, `VITE_ALPHA_DEV_CLOUD_VOICE`, `VITE_ALPHA_DEV_CLOUD_REALTIME_VOICE` and the `residentQa` staging toggle are still used? Each multiplies branches in production modules.
3. **Legacy data.** Can any installed `ai.alphacompute.alphaphone` renderer hold data from older builds? This covers the old selection kinds, the legacy calendar document, legacy notes keys, and the legacy production credential behind `savedSignInRecoveryStatus`. The README implies no. If confirmed, every legacy reader in P5 goes.
4. **Calendar sync.** Is the agent-side `LinkedCalendarControl` (in `agent-calendar.ts` `changeSync`) the accepted AP-09 "local-first sync"? If so, the client-side linked-sync stack and its Android `CalendarSyncBridge` can be deleted.
5. **Always-on listening and the update-channel check.** Both are dormant behind `false` constants while the PRD names always-on listening as an AOSP MVP gate. Keep the code or delete it?
6. **Source-text tests and spec manifests.** About 197 test and script files reference `connection-ui.tsx` by path. `test/support/feature-parity.mjs` and `specs/quint/**/manifest.json` pin many runtime file paths, and some tests `vm`-evaluate source text (`test/calendar-sync-settings-navigation.test.mjs`). Any reformat, split or rename will break them. The test-cleanup work should land first, or together with the refactor.
7. **WebView floor.** `abort-signal.ts` polyfills `AbortSignal.any` for "WebView 113". Confirm the minimum supported WebView before removing it.
8. **Zod.** It is already a dependency. Is it acceptable in the renderer bundle as the single validation layer, or should validation use upstream contract parsers?
9. **Formatter.** Adopting one formatter repo-wide is a prerequisite for every later refactor. It needs owner agreement, because it touches every file and every source-text test.
