# eliza-os-android-system: develop → vibestack parity findings

Slice: develop `packages/os/android`, `packages/app/platforms/android/.../ElizaAgentService.java` (the resident
service the phone's host was generated from) and `plugins/plugin-native-{agent,system,secure-store,passwords,
notifications,settings,wifi,network-policy,mobile-signals,bun-runtime,gateway}`; vibestack `packages/os`
(`android/`, `native/`, `src/`) and `spec/os`.

Trees: develop `7a124190a1`; vibestack `eliza-vs` at `769b4f00d9` (vibestack-dp); Alpha port `alpha-vs` at
`3d7ca97278`; legacy Alpha `alpha-develop`. Read-only. Nothing was built or run, so every statement below is from
reading source.

Paths are relative to the tree named: `dev:` = `eliza-develop/`, `vs:` = `eliza-vs/`, `adev:` = `alpha-develop/`,
`avs:` = `alpha-vs/`. `AGENT` = `packages/os/android/agent-service/src/main/java/ai/eliza/os/agent`,
`DEVSVC` = `packages/app/platforms/android/app/src/main/java/ai/elizaos/app/ElizaAgentService.java`.

## Summary

- 27 behaviours confirmed OK, 13 not applicable to the phone, 17 gaps (2 high, 6 medium, 9 low). 2 of the 17 are
  already named in `wave3.md` (item G).
- Verdict: **not proven.** The native Java the phone compiles (notifications, passwords, secure store, Wi-Fi,
  network policy, system, calendar) is the same as develop or a superset, and the two notification PRs
  (#39953, #39954) are present with rules. The resident agent service is a rewrite, and it loses four things the
  phone had: device headers on the private socket (wave 3 G), a retry for a launch that is slow or dies before
  it is ready, a fallback when a new payload cannot be extracted, and the peer check before the token is written.
  The consumer notification and launch-hook metadata is generated but never read.
- How the slice maps: of 232 develop Java/Kotlin sources in the slice plugins (plus action-journal, browser-surface
  and calendar, which share the vibestack directory), 141 are identical apart from package and imports, 51 differ,
  40 are absent. For passwords, secure-store, notifications and Wi-Fi every difference I read is an addition on
  the vibestack side.
- Contract with Alpha's port: all 173 named imports from `@elizaos/os/*` resolve, and every `ai.eliza.os.agent.*`
  symbol the port's Java uses exists. Five mismatches are listed below; the header one is the only one that
  changes behaviour on the phone today.
- Vibestack usage: all 204 rules in this slice's spec files carry Quint. `spec/lock.json` has no `spec/os` entry
  at all, and conformance drivers exist for 7 of the roughly 20 spec files in the slice.

## Gaps

### eliza-os-android-system-01 · CHANGED · high · listed in wave 3 (G)
**The private socket carries no caller headers, so `X-Eliza-Device-Id`, `-Key` and `-Capabilities` never reach the agent.**
- develop: `dev:DEVSVC:647-672` (`buildRequestPayload`) forwards every caller header except `host`,
  `connection`, `content-length` (`:1132-1147`, `:1173-1177`). Legacy Alpha sent the device headers on it
  (`adev:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:1399`).
- vibestack: `vs:AGENT/AgentSocketClient.java:159-166` builds the frame with `authorization` and
  `content-type` only. `vs:packages/os/android/agent-service/src/capacitor/java/ai/eliza/os/agent/AgentPlugin.java:124-129`
  reads only `method`, `path`, `body`. `vs:packages/os/src/bridges/definitions/agent.ts:16-24` has no `headers`
  field. The agent transport itself admits headers (`vs:spec/agent/access/transport.md:11`).
- Impact: the device-action negotiation (`PROPOSE_DEVICE_ACTION`, capability header) cannot start from the phone.
- Fix: add a filtered header map to `AgentRoute`, `AgentPlugin.ask`, `AgentChannel.ask/request/requestStream`
  and `AgentSocketClient.HttpCall`, with a rule in `spec/os/agentService/channel.md`.

### eliza-os-android-system-02 · CHANGED · high
**A launch that is not ready in 60 s, or exits before it is ready, fails for good; develop waited 480 s and restarted.**
- develop: `dev:DEVSVC:234` (`STARTUP_HEALTH_GRACE_MS = 480_000`), `:4190-4215` (child exit before ready →
  `scheduleRestart()` unless the fatal is terminal), `:4232-4245` (deadline → `scheduleRestart(true)`).
- vibestack: `vs:AGENT/AgentPolicy.java:10` (`READY_TIMEOUT_MS = 60_000`), `:271-276` (`readyTimeout` →
  `fail(Cause.AGENT, "not ready within 60 s")`), `:286-291` (exit while `SPAWNED` → `fail`). Rule:
  `vs:spec/os/agentService/lifecycle.md:128` ("…a launch that never does fails as Agent", "never retried").
  Only an exit after readiness is restarted (`lifecycle.md:258`).
- Impact: one slow cold start (first boot after an OTA, a loaded phone) leaves the agent failed until something
  asks for a start again. On develop the service recovered by itself.
- Fix: decide the owner's intent. Either retry a pre-ready failure with the health backoff (except `Config`,
  `Storage`, `Payload`), or have Alpha's host restart on `failed/agent`. Measure the Pixel's real time to ready
  before keeping 60 s.

### eliza-os-android-system-03 · CHANGED · medium
**A new payload that cannot be extracted leaves no agent; develop kept and booted the last good extraction.**
- develop: `dev:DEVSVC:1568-1594` stages into `agent.staging`, swaps atomically, and on failure falls back to
  the existing tree and records `updateDeferred` (`:1621-1634`); `:1765` (`extractionIsBootable`) re-stages a
  broken tree. Policy in `dev:packages/app/platforms/android/app/src/main/java/ai/elizaos/app/ElizaAssetExtractionPolicy.java:36-58`.
- vibestack: `vs:AGENT/PayloadCheck.java:150-153` deletes every existing release before extracting the new one;
  `:83-88` extracts only when the release directory is missing, then verifies and returns `Failed` on any
  mismatch. An existing release with a damaged file is never extracted again. `Failed(Payload)` is not retried.
  Rules: `vs:spec/os/build/runtimePayload.md:177`, `:191`.
- Impact: a full disk during the first start after an update, or a corrupted extracted file, stops the agent
  until the app version changes or its data is cleared. Legacy Alpha did not read `updateDeferred`, so only the
  fallback itself is lost.
- Fix: delete stale releases after the new one verifies, and re-extract a release that fails verification once.

### eliza-os-android-system-04 · MISSING · medium
**The service no longer checks who is on the other end of the socket before it writes the launch token.**
- develop: `dev:DEVSVC:1058-1067` (`requireTrustedLocalAgentPeer`: peer UID must equal the app's, else
  `SecurityException` and no retry); `:183-192` checks the socket file's owner, type and mode `0600` and its
  directory's mode `0700` on every use.
- vibestack: `vs:AGENT/AgentSocketClient.java:87-100` connects and `:113-117` writes the bearer frame with no peer
  credential or `lstat` check. `vs:AGENT/AgentDirectories.java:63-72` keeps the `ipc` directory `0700`, which is
  the only protection. No rule mentions the peer (the inference host has one: `vs:spec/os/agentService/inference.md:22`).
- Impact: defence in depth only; no known exposure while the directory stays private.
- Fix: check `getPeerCredentials().getUid()` in `localSocket`, with a rule beside "The launch's root token stays
  inside the service".

### eliza-os-android-system-05 · UNIMPLEMENTED · medium
**The consumer's notification and launch-hook metadata is written to the manifest and read by nothing.**
- develop: the resident notification used the host's icon, colour and per-state words
  (`adev:android/consumer-host.json` `residentHost.notification`; `dev:DEVSVC:4738-4867`).
- vibestack: `vs:packages/os/src/build/android-host.vibe:134-146` writes `ai.eliza.os.agent.notification.*` and
  `.launchHook.*` meta-data; rule `vs:spec/os/build/androidHost.md:214-222` and `vs:spec/os/agentService/lifecycle.md:226`.
  No Java reads meta-data (`grep getMetaData|launchHook` in `vs:packages/os/android/agent-service/src` finds only
  the policy event). `vs:AGENT/AgentService.java:123-134` builds the notification from `host.json`'s three words
  and the application icon.
- Impact: the phone's ongoing notification shows the launcher icon and one fixed line ("Your agent is running on
  this phone") in every state, instead of `notification_icon`, the brand colour and "Alpha · Running / Starting /
  …". The launch hook works only because Alpha's subclass overrides `configureLaunch`.
- Fix: read the meta-data in `AgentService` (or drop it from the generator and the rule and document the
  override), and add a status-to-words mapping.

### eliza-os-android-system-06 · MISSING · medium · listed in wave 3 (G)
**Twelve agent helper classes the phone used are absent upstream; Alpha carries its own copies.**
- develop: `dev:plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/` —
  `connection/{CloudConnectionPolicy,ConnectionTransport,DelegationCallback,OwnerRoutePolicy,PendingRequests}`,
  `runtime/{CredentialRequestFence,CredentialShutdownLease,NativeProviderAdmission,NativeProviderSlot,NativeRuntimeEmbeddings,ResidentAttachment}`,
  `updater/RuntimeUpdatePause` (listed as helpers in `adev:android/consumer-host.json` `residentHost.helpers`).
  #39683 changed `NativeProviderAdmission` and `NativeProviderSlot`.
- vibestack: none of the twelve exists under `vs:packages/os/android`. Alpha's copies are in
  `avs:android/app/src/main/java/ai/alphacompute/alphaphone/{connection,runtime}/`; I diffed each against develop
  head and they match (one comment line differs in two files), so #39683 is included.
- Impact: none while Alpha keeps the copies; they are unbuilt, and upstream fixes will no longer reach them.
  The upstream replacements (`UpdateHold`, `RouteGate`, `ChannelPolicy`) are not what the port calls.
- Fix: none upstream unless the owner wants them shared; record them as Alpha-owned.

### eliza-os-android-system-07 · MISSING · medium
**#39942: the browser session no longer keeps visit times, so history cannot be grouped by day.**
- develop: `dev:plugins/plugin-native-browser-surface/android/src/main/java/ai/eliza/plugins/browsersurface/BrowserSessionStore.java:53-70`
  keeps `visitTimes` for retained history URLs. Legacy Alpha persisted and showed them
  (`adev:apps/app/src/prototype/browser-adapter.ts:533`, `:569`, `:823`).
- vibestack: `vs:packages/os/android/browser-surface/src/main/java/ai/eliza/plugins/browsersurface/BrowserSessionStore.java:53-56`
  returns `history`, `tabs`, `cur` only. No `visitTimes` or `visitedAt` anywhere in `vs:packages`, `vs:spec` or
  `avs:apps/app/src`. The ledger row for #39942 covers its core part only.
- Impact: Browser history loses its Today / Earlier sections after the move.
- Fix: port the 14 lines and a rule in `spec/os/browser/tabHost/storage.md`; Alpha's browser slice must then use it.

### eliza-os-android-system-08 · UNVERIFIED · medium
**No `spec/os` rule is in `spec/lock.json`, and most of this slice's Java has no conformance driver.**
- `vs:spec/lock.json` lists `spec/app/*` (4 files) and `spec/index.md` only, last changed 2026-11-14; `unproved`
  is empty. 88 files under `spec/os` are absent, so nothing says which os rules were accepted or how their proofs
  ended.
- Drivers under `vs:packages/os/test/drivers/` cover `agentService/{channel,lifecycle}`, `android/secureStore`,
  `android/passwords/autofill`, `appUpdate/{install,policy}` and `android/deepLinks`. None for `agentService/{health,config}`,
  `build/runtimePayload`, `android/{wifi,networkPolicy,system,noticeRoutes,notificationMirror,notificationProjection,taskKeys,bridge}`
  or `android/passwords/vault`. The Java for those is tied to its rules by header comments only.
- Impact: the "spec rule + code" citations in the table below are by reading, not by a passing check.
- Fix: run the accept step for `spec/os` and add drivers, or state that os is outside the lock.

### eliza-os-android-system-09 · UNIMPLEMENTED · low
**#40088 device half: the shared password backup approval has rules and library code but no caller.**
- develop: `dev:packages/auth/android/src/main/java/ai/eliza/auth/cloud/CloudSignInPlugin.java:678-692`
  (`startNativePasswordBackup`, `cancelNativePasswordBackup`), `:1355-1361`. Server side is #40088 in
  `packages/auth` and `packages/cloud` (another slice).
- vibestack: rules `vs:spec/os/android/passwords/vault.md:261`, `:274`, `:308`. Code
  `vs:packages/os/android/sign-in/src/main/java/ai/eliza/plugins/signin/SharedPasswordBackup.java:58-138` and
  `vs:packages/os/android/secure-store/src/main/java/ai/eliza/plugins/securestore/nativeonly/{PasswordBackupApproval,CloudPasswordBackup}.java`.
  `SharedPasswordBackup` is referenced by no other file; `CloudPasswordBackup` only by an instrumented test.
- Impact: none on the phone today. Neither Alpha tree calls password backup. A host cannot offer the backup
  control from vibestack as it stands.
- Fix: expose the approval on the sign-in or passwords plugin, or mark the story as not yet reachable.

### eliza-os-android-system-10 · CHANGED · low
**A caller can no longer lengthen a request's deadline.**
- develop: `dev:DEVSVC:193-199`, `:572-584`, `:619-632`: `timeoutMs` from 1 s to 600 s, raised to 600 s on any
  path containing `/asr`, `/tts`, `/transcription`, `/speech`, `/local-inference`, `/messages`, `/greeting`, `/voice`.
- vibestack: `vs:AGENT/AgentSocketClient.java:33-36`, `:102-107`: 10 s, or 600 s for a streamed call,
  `/api/conversations/{id}/messages` and `/api/asr/local-inference`, plus 2 s. Rule `vs:spec/agent/access/transport.md:126`.
  Alpha's shim still accepts `timeoutMs` (`avs:android/app/src/main/java/ai/alphacompute/alphaphone/ElizaAgentService.java:384-390`)
  but the socket closes at 12 s underneath it.
- Impact: legacy Alpha's 15 s, 45 s and 120 s calls were voice and renderer-channel routes that the port serves
  natively, so I found no affected call. Any new plain route slower than 10 s fails.
- Fix: none unless such a route appears; then add it to the long list in the transport rule.

### eliza-os-android-system-11 · CHANGED · low
**Event feeds: one subscriber per topic, no idle timeout, and an unknown frame ends the feed.**
- develop: `dev:DEVSVC:796-798` (45 s idle timeout, up to 16 stream names per subscription), `:874-898`
  (`dropped` frames passed on, unknown frames ignored).
- vibestack: `vs:spec/os/agentService/channel.md:234-249` (a second subscription on an open topic is `TopicInUse`),
  `vs:AGENT/AgentSocketClient.java:102-103` (no deadline for a subscription), `:181-186` (any frame type other
  than `subscribed` or `event` throws).
- Impact: a second screen or activity that subscribes to the voice transcript is refused. A feed that goes quiet
  without closing is never resubscribed. Not verified against what the port's screens actually open.
- Fix: confirm the port opens each topic once; consider an idle bound.

### eliza-os-android-system-12 · CHANGED · low
**Start at boot now depends on being signed in, not on the owner's runtime mode.**
- develop: `dev:packages/app/platforms/android/app/src/main/java/ai/elizaos/app/ElizaBootReceiver.java` starts
  only when `ElizaAgentService.shouldAutoStart` (`dev:DEVSVC:4972`, mode `local` or `cloud-hybrid`).
- vibestack: `vs:AGENT/AgentStartReceiver.java:13-25` starts when `AgentService.signedIn()`. Alpha's subclass
  keeps `shouldAutoStart` (`avs:…/ElizaAgentService.java:111-114`) but the upstream receiver never calls it.
- Impact: a signed-in phone set to a cloud-only mode would now start the resident at boot. Not verified whether
  Alpha ever sets such a mode.
- Fix: none if every signed-in phone should run the resident; otherwise give the receiver a consumer veto.

### eliza-os-android-system-13 · UNMODELED · low
**`workflowPresentationCapabilities` exists in Java with no rule and no bridge definition.**
- develop and vibestack are identical: `…/notifications/NotificationsHostPlugin.java:150` answers `{protocol: 2}`.
- No rule in `vs:spec/os/android/{noticeRoutes,notificationProjection}.md`; not in
  `vs:packages/os/src/bridges/{notices.vibe,definitions/notices.ts}`. The port calls it by name
  (`avs:apps/app/src/account/enrollment.vibe:142`, `avs:apps/app/src/platform/native-plugins.ts:159`).
- Impact: none now; the protocol number can change upstream without any check noticing.
- Fix: one rule and one definition line.

### eliza-os-android-system-14 · UNMODELED · low
**#39998 and #39841 are in code without a rule.**
- #39998 (field edits observed from document creation): `vs:packages/os/browser/src/page-command.mjs:115-144`,
  `:711`; nothing in `vs:spec/os/browser/pageCommands.md`.
- #39841 (dock resize guarded at its call): `vs:packages/os/android/browser-surface/src/main/java/ai/eliza/plugins/browsersurface/BrowserSplitResize.java`;
  nothing in `vs:spec/os/browser/surface/dock.md`.
- Impact: none now. Fix: rules, or leave to the browser slice.

### eliza-os-android-system-15 · CHANGED · low
**Device-unlocked password custody is looser than develop's.**
- develop: `dev:plugins/plugin-native-secure-store/android-nativeonly/src/main/java/ai/eliza/plugins/securestore/nativeonly/PasswordVaultStore.java:32`
  (Android 15 required), `:41-43` (secure lock required), `:91` (`setUnlockedDeviceRequired(true)` from API 28).
- vibestack: same file under `vs:packages/os/android/passwords/…`: no Android 15 check, `deviceUnlockedNow`
  drops `isDeviceSecure()` (`:44-48`, used at `:40`), the key is unlocked-device-bound only from API 35 (`:92-93`). Rules
  `vs:spec/os/android/passwords/vault.md:334`, `:366`.
- Impact: none on the phone: neither Alpha tree calls `installDeviceUnlockedCustody`, so the timed custody
  (unchanged) is what runs. It becomes relevant if a host turns it on.
- Fix: none; owner should know the mode exists before enabling it.

### eliza-os-android-system-16 · CHANGED · low
**The agent log moved and the restart diagnostics file is gone.**
- develop: `files/agent/agent.log` and `agent-restart-diagnostics.jsonl` (`dev:DEVSVC:122-124`, `:4399`),
  plus recent exit reasons (`:4436`).
- vibestack: `files/agent-runtime/agent.log` (`vs:AGENT/AgentService.java:588`); a pid and epoch journal only
  (`vs:AGENT/ChildJournal.java`). No restart diagnostics file.
- Impact: the on-device forensics recipe has to change path, and restart causes are in logcat only.
- Fix: update the recipe; add a bounded diagnostics file if the owner still wants one.

### eliza-os-android-system-17 · MISSING · low
**Grace's browser surface additions from #39775 are partly absent.**
- develop: `dev:plugins/plugin-native-browser-surface/android/src/main/java/ai/eliza/plugins/browsersurface/BrowserSurfacePlugin.kt`
  has `setTaskOrigins`, `setTextZoom`, `clearSurfaceStorage`, `captureSurface` and host-save stops;
  `BrowserCapturePolicy.java`, `ChromiumBindingDemandReplay.java`.
- vibestack: none of those names under `vs:packages/os`.
- Impact: none on the phone: neither Alpha tree names them. Listed so the browser slice can confirm.
- Fix: none for Alpha.

## Contract mismatches with Alpha's port

1. **`headers` on agent requests.** `avs:apps/app/src/platform/resident-bridge.vibe:84-97`, `:153` adds a
   `headers` field to `ElizaAgent.request` and `requestStream`. `vs:packages/os/src/bridges/definitions/agent.ts:16-24`
   has no such field and `AgentPlugin.java` ignores it. Same for the native path: `AgentService.request(method,
   path, body)` (`vs:AGENT/AgentService.java:143`) takes no headers. Wave 3 G.
2. **AOSP source paths.** `avs:android/aosp/product.json:8`, `:21` and `avs:android/aosp/pixel10a-product.json:15`
   name `vendor/eliza/packages/os/android/aosp.lock.json` and `…/android/sources/pixel10a-stallion.json`. In
   vibestack they are `packages/os/aosp/aosp.lock.json` and `packages/os/aosp/sources/pixel10a-stallion.json`
   (`avs:scripts/aosp-ota-update.ts:30` already uses the new path). The Pixel lock is byte-identical to develop's.
3. **Cuttlefish lock profile shape.** `vs:packages/os/aosp/aosp.lock.json` replaced `supportedProducts`
   (`eliza_cf_x86_64_phone`) with `targets` (`cf_x86_64_phone`) and dropped the `gsi-android17` source. Alpha's
   `product.json` still describes the old admission.
4. **Launch hook and notification words.** `avs:android/consumer-host.json` `agentService.launchHook` names
   `ElizaAgentService.configureLaunch`, an instance override; the rule says a static method named by meta-data,
   and no Java reads it. `agentService.notification.strings` (18 names) and `smallIcon` are unused. See gap 05.
5. **View feed identity.** `AgentService.subscribe(Topic, Listener)` has no client id; Alpha's shim maps
   `view-interact` to `Topic.VIEW` and drops `clientId` (`avs:…/ElizaAgentService.java:296-328`). Harmless today:
   the port subscribes natively to notices only.

Also noted, not mismatches in my packages: `avs:upstream.lock.json` pins branch
`claude/vibestack-alphaphone-migration` at `c84e5d68e3`, not the audited head (wave 3 G); `host.json` routes are
described as best effort (wave 3 G) and I did not check them against the agent's route table.

## Confirmed OK

| Behaviour | develop | vibestack rule | vibestack code |
|---|---|---|---|
| #39953 new-mail count includes capped notices | `plugins/plugin-native-notifications/…/MailHistoryReconciliation.java` | `spec/os/android/notificationProjection.md:272` | same file, identical |
| #39954 approval notice title in its receipt | `…/NoticeCoordinator.java`, `NoticeDelivery.java` | `spec/os/android/noticeRoutes.md:233` | identical |
| Notification mirror, history | `…/NotificationMirror.java` | `notificationMirror.md:17-286` | superset (pending history cleanup, `:228`) |
| Workflow taps, own notices | `…/NotificationsHostPlugin.java` | `noticeRoutes.md:147`, `:207` | identical |
| Watchdog: 600 s probe, 3 strikes, 30 s absence check | `DEVSVC:229-246` | `agentService/health.md:63`, `:112` | `AGENT/HealthPolicy.java:5-9` |
| Health is Ok only for a ready answer of this launch | `DEVSVC:4311-4356` | `health.md:22` | `HealthPolicy.java:36-44` |
| Restart backoff 1 s to 60 s, reset after 5 min | `ElizaAgentWatchdogPolicy.java` | `health.md:134`, `lifecycle.md:304` | `HealthPolicy.java:10-11` |
| Storage recovery: review, then archive by token | `DEVSVC:390-409`, `IpcStartupRecovery.java` | `lifecycle.md:416` | `AGENT/AgentService.java:209-242`, `RecoveryArchive.java` |
| #39806 re-extract after an image-only update | `ElizaAssetExtractionPolicy.java:60-112` | `build/runtimePayload.md:177` | `AGENT/PayloadCheck.java:82` (version + inventory digest) |
| Spawn only on matching digests | `DEVSVC:1765` | `runtimePayload.md:191` | `PayloadCheck.java:182-213` |
| Renderer and native route allow-lists | `plugins/plugin-native-agent/…/OwnerRoutePolicy.java` | `agentService/channel.md:30`, `:70` | `AGENT/ChannelPolicy.java`, `RouteGate.java` |
| Streamed reply, abort | `DEVSVC:707-790` | `channel.md:177`, `:192` | `AGENT/AgentChannel.java:136-170` |
| Launch token stays in the service | `DEVSVC:373`, `:647-655` | `channel.md:56` | `AgentChannel.java:203-211` |
| Feeds: voice-transcript, view-interact, notification | `DEVSVC:821-870` | `channel.md:234`, `:257` | `AgentChannel.java:149-155` |
| Start, stop, restart, status bridge | `AgentPlugin.java` (app) | `lifecycle.md:22`, `:226` | `…/capacitor/…/AgentPlugin.java:28-35` |
| Agent follows sign-in, per-account directory | `DEVSVC:320-370` | `lifecycle.md:321`, `:365` | `AgentService.java`, `AgentDirectories.java:38-40` |
| Agent held during an app update | `DEVSVC:325` + `RuntimeUpdatePause.java` | `lifecycle.md:472` | `AGENT/UpdateHold.java` (Alpha uses its own pause) |
| Slot policy: native-only names, exchange only where declared | `…/connection/SecureSlotPolicy.java:39-52` | `android/secureStore.md:25`, `:120` | `…/securestore/nativeonly/SecureSlotPolicy.java:82-151` |
| Slot write read back, absence proven | `JsonCredentialSlots.java` | `secureStore.md:61`, `:155` | `SecureSlots.java`, `JsonCredentialSlots.java` (superset) |
| Task data keys | `TaskDataKeyStore.java` | `android/taskKeys.md:28` | identical |
| Vault: unlock, list, save, reveal, copy, reset | `…/passwords/PasswordsPlugin.java` (11 methods) | `passwords/vault.md:25-228` | same 11 methods, superset |
| #39859 password clipboard lease | `PasswordClipboard.java` | `vault.md:203` | identical |
| Autofill fill and save by exact origin | `ElizaPasswordAutofillService.java` etc. | `passwords/autofill.md:27`, `:83`, `:198` | identical or superset |
| Wi-Fi scan, join, wrong password, 30 s bound | `plugins/plugin-native-wifi/…/WiFiPlugin.kt` | `android/wifi.md:18-195` | superset; adds `savedNetwork` (`wifi.md:96`, `:203`; `ApprovedJoinTracker.kt:49-63`) |
| Connectivity: validated, captive portal | `WiFiPlugin.kt`, `SystemFacts.java` | `wifi.md:258`, `system.md:159`, `:174` | `WiFiPlugin.kt:385-386`, `SystemFacts.java:119` |
| Metered hint, download only on validated unmetered link | `plugins/plugin-native-network-policy/…/NetworkPolicyReader.kt` | `android/networkPolicy.md:18`, `:54` | same logic, comments differ |
| System plugin, settings pages, launcher apps, reset, crash log | `plugins/plugin-native-system/android` (21 files) | `android/system.md`, `reset.md` | 21 of 21 identical |
| #39810, #39813 Pixel source lock | `packages/os/android/sources/pixel10a-stallion.json` | `image/sourceLock.md` | `packages/os/aosp/sources/…` byte-identical |
| #39835 no `--` in provisioning comments | `packages/os/scripts/android/launcher-provisioning.mjs` | `image/provisioning.md:28` | `packages/os/aosp/launcher-provisioning.mjs:172-179` |

Not applicable to the phone (13): #39795 embedded cloud-only agent (the phone uses `AgentService`);
`plugin-native-gateway`, `-bun-runtime`, `-mobile-signals`, `-settings` (never in Alpha's build);
`PasswordTransferPlugin` and `PasswordCsv`; the upstream app updater (`UpdateJournal`, `PackageInstallCoordinator`,
policy) which neither side wires and Alpha replaces with `AlphaDevicePlugin`; the other 14 absent
`plugin-native-agent` classes (`LocalRuntimeHttp`, `NativeOwnerTransport`, `WorkspaceAppReturn*`, OAuth and
credential brokers) that were never Alpha helpers; `DeviceCredentialSession`, `RuntimeCredentialStore`;
`NativeSecureStore`'s key rename (`session.steward_token` → `session.cloud_token`); `updateDeferred`; #39715;
the develop `/tts`, `/greeting`, `/voice` long-timeout paths.

## Not covered

- The launcher update install paths (signed-in and signed-out) are Alpha's own code (`AlphaDevicePlugin`,
  `AlphaUpdateStatusReceiver`) on both sides. I checked only that the port's copy differs from legacy by package
  renames and that its upstream pieces (`RuntimeUpdatePause`, `ConnectionTransport`) match develop. Their
  behaviour belongs to the alpha audit.
- `plugin-native-browser-surface` beyond the five PRs above (12 differing files, including 303 differing lines in
  `BrowserSurfacePlugin.kt`), `plugin-native-action-journal` (the deletion journal was restructured: 3 differing
  files) and `plugin-native-calendar` beyond file identity.
- The agent side of the socket (`packages/agent` transport, route table, health body) and whether `host.json`'s
  routes match it.
- Server side of #40088, #39912, #39991, #39803 (`packages/auth`, `packages/cloud`).
- AOSP image, signing, system updater, Sense and voice (`spec/os/{image,update,voice}`), apart from the three
  path and lock observations above.
- `packages/os/native/ota-trust` and `packages/os/src/app-update` (publication, publisher policy).
- TypeScript halves of the develop plugins (`src/*.ts`, `web.ts`) against `packages/os/src/bridges/*.vibe`, beyond
  the name-level import check.
- Anything that needs a build, an emulator or a device: no APK, Gradle, `check` or test was run.
