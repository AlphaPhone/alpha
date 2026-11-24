# Duplicated-helper ledger

Global ledger for pattern **C3** (copy-pasted micro-helpers), **C4** (per-feature re-implementation of one
mechanism) and **C6** (same literal in many places) from [`PATTERNS.md`](PATTERNS.md). It merges the §4 tables of the
area reports in [`research/`](research/) and the "Local types and helpers" tables of the 44 chunk summaries in
[`chunks/`](chunks/), and it was re-checked by grepping `apps/app/src` and `android/` on this branch. All line numbers
are from the tree at the time of the audit (before any formatter run, D8). After Prettier/google-java-format, re-find the
sites with the search expression given for each entry, not by line number.

Types are out of scope here (they belong in `types.md`, C1/C2). Scripts helpers (`git()`, arg parsers, upstream-lock
readers, directory walkers, `readJson`) are listed in [`research/scripts.md`](research/scripts.md) and go to
`scripts/lib/`. This document covers the renderer (`apps/app/src`) and Android (`android/`).

## Ground rules for every merge

1. **Delete before you merge.** Several sites below sit in files that A1/A2/A3/A4 already delete
   (`legacy-calendar-preservation.ts`, `native-recovery-backup.ts`, `calendar-linked-local.ts`, `calendar-sync-fields.ts`,
   `calendar-backup.ts`, `calendar-sync-settings.ts`, `legacy-notes-access.ts`, `LegacyCloudRecovery.java`). They are marked
   **(delete)**. Do not port them to the new helper.
2. **Persisted bytes stay byte-for-byte.** Many hashes name secure slots or browser documents
   (`assistant-draft:v1:<sha>`, `connected-read-cache:v1:<sha>`, the calendar retention key, etc.), and many literals are
   installed storage keys. The shared helper must produce the same string as each site it replaces. Where sites differ in
   *input encoding* (raw text vs `JSON.stringify` vs `canonical()`), keep that choice at the call site and only share the
   hash step.
3. **Validate at trust boundaries only (B3).** Shared validators are for native-bridge, storage, network and CLI input.
   Don't add calls to them for values the module just produced.
4. **No dev code in `lib/` (D5).** Dev-bridge helpers go to the `dev/` folder, not the shared lib.
5. **Use upstream when it already ships the helper** and the semantics match exactly (`validateUuid`, `workflowSha`,
   `DocumentBytes.sha256`). When they don't match, keep the local helper and say why in its doc comment.

---

## 1. Proposed homes

### 1.1 Renderer shared lib: `apps/app/src/lib/`

The folder doesn't exist yet. Everything below is framework-free TypeScript with no Capacitor import unless the file
name says `platform`. Each file is one concept, and the barrel is deliberately left out so imports stay explicit.

```
apps/app/src/lib/
  hash.ts               sha256Hex(input: string | BufferSource): Promise<string>
                        randomHex(bytes: number): string
  ids.ts                UUID_PATTERN, isUuid(v), isUuidV4(v), isUuidRfc(v)       (re-export upstream validateUuid)
                        SHA256_HEX, isSha256Hex(v), OPERATION_ID, isOperationId(v),
                        OPAQUE_ID_36 (/^[a-f0-9-]{36}$/), isOpaque36(v)
  parse.ts              isRecord(v): v is Record<string, unknown>
                        expectRecord(v, fail: () => never | Error | string): Record<string, unknown>
                        expectString / optionalString / expectTimestamp / oneOf   (moved from cloud-protocol.ts)
  json.ts               canonicalJson(value: unknown): string
                        sameJson(a: unknown, b: unknown): boolean
  abort.ts              abortError(message?: string): DOMException
                        isAbortError(e: unknown): boolean
                        delay(ms: number, signal: AbortSignal): Promise<void>
                        raceAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T>
                        anyAbortSignal(signals)                                   (moved from runtime/abort-signal.ts)
  error-text.ts         errorText(error: unknown, fallback: string): string
                        errorCode(error: unknown): string | undefined
  session-key.ts        sessionKey(...parts: unknown[]): string                   (JSON.stringify([...]) tuples)
  civil-date.ts         DAY_MS, civilDay(date, zone), civilDayDiff, parseCivilDate, deviceTimeZone()
  storage-keys.ts       every installed localStorage / BroadcastChannel / document key, one const each
  platform.ts           isAndroid, pluginHeader(name), pluginHasMethod(name, method)   (Capacitor-aware)
  foreground.ts         screenLocked(), devBackground(), foregroundBlocked()      (DOM-aware)
  durable-slot.ts       durableSlot<T>(slot, browserDocument): { read, edit, capture?, reset? }
  observed-document.ts  observedDocument(key, event, guard?): { read, readRaw, capture, reset, edit }
  owned-dialog.ts       openOwnedDialog(options): { dialog, signal, close }
  owned-operation.ts    ownedOperation(options): { signal, check, dispose }        (staleness fence)
```

Placement notes:

- `durable-slot.ts`, `observed-document.ts` and `owned-dialog.ts` depend on product modules
  (`secureConnectionStore`, `BrowserDomainDocument`, `.os` theme root). If the team wants `lib/` to stay dependency-free,
  put these three in `runtime/storage/` and `browser/dialog/` instead. Either way there should be **one** home each.
- `owned-operation.ts` needs `connectionController`. Put it next to the connection owner once D1 splits
  `connection-ui.tsx` (`runtime/connection/fence.ts`). Until then, put it in `lib/` and take the subscription as a parameter.
- `ids.ts` replaces the "operation id regex / hex-64 regex constants module" that several chunks propose, plus the chunk
  proposals `lib/opaque-id.ts` and `lib/ids.ts`.

### 1.2 Android util: one class plus two small companions

Most product classes are package-private in `ai.alphacompute.alphaphone`. A sub-package (`.util`) would force those
helpers and their callers to become `public`, so the helpers stay **in the same package**:

```
android/app/src/main/java/ai/alphacompute/alphaphone/
  AlphaUtil.java        final class, private ctor, static methods only:
                          String sha256Hex(byte[] data)
                          String sha256Hex(String utf8)
                          String sha256Hex(InputStream in) throws IOException      // streamed, 64 KiB buffer
                          String hex(byte[] bytes)
                          byte[] readBounded(InputStream in, int limit) throws IOException
                          boolean isSha256Hex(String v)            // [a-f0-9]{64}
                          boolean isUuid(String v)                 // canonical lower-case 8-4-4-4-12
                          boolean isOpaque36(String v)             // [a-f0-9-]{36} (legacy-loose form, see J2)
                          boolean isOpaqueId(String v)             // [A-Za-z0-9][A-Za-z0-9_-]{0,127}
                          HttpURLConnection openNoCache(URL url, int connectMs, int readMs) throws IOException
                          int httpStatus(int status)               // 100..599 else 0
                          String exceptionFamily(Throwable t)
                          boolean calendarReadWrite(Context c)
                          boolean ownerForeground(Activity a, Foreground mode)
                          boolean submit(Executor e, Runnable work, Runnable refused)   // from PluginWorkers
                          void schedulePeriodic(Context c, String name, Class<? extends ListenableWorker> w,
                                                Data data, boolean network)
                          interface Guard { void check() throws Exception; }
                          enum Foreground { SURFACE, FOCUSED, UNLOCKED_FOCUSED }
  Slots.java            final class of slot-name constants, caps and renderer policy (C6, android P6):
                          CLOUD_PRODUCTION = "cloud:production", LOCAL_AGENT_PROVIDER = "local-agent-provider:v1", …
                          static SecureSlots of(AlphaCredentialStore)   // the one adapter (J6)
  AlphaPlugin.java      abstract base Plugin: owns one ExecutorService, shuts it down in handleOnDestroy,
                        background(PluginCall call, Callable<JSObject> work, String closedMessage)
```

`PluginWorkers.java` and `SerialStorageTasks.java` fold into `AlphaUtil.submit` / `AlphaPlugin.background`. Keep a
separate serial executor only where strict ordering is required (document it at that site).

---

## 2. Renderer ledger (`apps/app/src`)

Paths are relative to `apps/app/src/`.

### R1. SHA-256 → lower-case hex (C3)

**Sites (25 digests in 21 files):**

| input encoding | sites |
|---|---|
| raw UTF-8 text | `runtime/agent-calendar.ts:27`, `runtime/assistant-draft-store.ts:14`, `runtime/note-origin.ts:32-33`, `runtime/service-read-cache-store.ts:18`, `runtime/sms-agent-contract.ts:4`, `prototype/agent-calendar-adapter.ts:64`, `prototype/inbox-unsaved.ts:35`, `prototype/note-recorder.ts:179-182`, `browser/hosted-results.ts:15` |
| `JSON.stringify(value)` (= upstream `workflowSha`) | `runtime/inbox-local-store.ts:13`, `runtime/native-calendar-sync.ts:34`, `runtime/google-accounts.ts:337-338` (adds the prefix `alpha-calendar-connect:`), `prototype/reminder-adapter.ts:256`, `:378`, `:428`, `browser/calendar.ts:50`, `:242`, `browser/deletions.ts:20`, `browser/workflow-trigger-runtime.ts:15`, `runtime/legacy-calendar-preservation.ts:13` **(delete, A1)** |
| `JSON.stringify(string)` (hashes the *quoted* string) | `browser/workflow-notices.ts:13` |
| `canonical(value)` | `runtime/owner-reminder-notification-protocol.ts:29` |
| raw bytes | `runtime/native-recovery-backup.ts:11` **(delete, A3)** |

**Differences:** the hash step is the same everywhere: Web Crypto, then `toString(16).padStart(2,'0')`, either through
`Array.from(…, fn)` or `.map(fn)`, with identical output. Only the input encoding differs. `workflow-notices.ts:13` hashes
`JSON.stringify(text)` of a string, so it includes the quotes. That is persisted, so keep it.

**Proposal:** `sha256Hex(input: string | BufferSource): Promise<string>` in `lib/hash.ts`. A string is UTF-8 encoded and
bytes are hashed as given. Call sites keep their encoding: `sha256Hex(JSON.stringify(x))`,
`sha256Hex(canonicalJson(x))`. Where a site is exactly `workflowSha(x)`, importing upstream `workflowSha` is equally
fine. Pick one style per area and don't mix them.

**Files to update:** the 19 surviving files above. Delete the two A1/A3 files first.

### R2. Random hex identifiers (C3)

**Sites:** `browser/revision.ts:2` (32 bytes, exported as `revision()`), `runtime/connection-ui.tsx:1158`, `:1488`,
`:1555` (32 bytes, device key), `prototype/context-selection.ts:52` (6 bytes).
Not the same concept, so leave them alone: `prototype/photo-library-adapter.ts:34` (base-36), and `prototype/browser-camera.ts:106`,
`:197` (decimal digits: `photoId`/`mediaId`, which merge with each other into `mediaId()` in that file).

**Differences:** none apart from the byte length.

**Proposal:** `randomHex(bytes: number): string` in `lib/hash.ts`. `browser/revision.ts` becomes
`export const revision = () => randomHex(32)`, or callers call `randomHex(32)` and the file is deleted (D4).

**Files:** `browser/revision.ts`, `runtime/connection-ui.tsx`, `prototype/context-selection.ts`.

### R3. Plain-object guard (C3)

**Sites: 14 named copies plus about 70 inline copies.**

Named, in predicate form (`v is Record`): `runtime/agent-calendar.ts:25` `record`, `runtime/calendar-approval.ts:34` `object`,
`runtime/cloud-voice-limit.ts:13` `record` (returns the record or `null`), `prototype/calendar-approval-fields.ts:5`,
`browser/simulator-recovery.ts:9`, `browser/workflow-history.ts:5`, and `browser/calendar-editor-draft.ts:9` (`keys()`,
which adds an allowed-keys check).

Named, in assert-or-throw form: `runtime/cloud-protocol.ts:124` (exported `object`, throws `CloudProtocolError`),
`runtime/automations-protocol.ts:22`, `runtime/cloud-personal-protocol.ts:20` `obj`, `runtime/device-view-profile.ts:8`,
`runtime/local-agent.ts:163` `record`, `runtime/native-calendar-sync.ts:14`,
`runtime/owner-reminder-notification-protocol.ts:24`, `runtime/remote-protocol.ts:65`, `runtime/view-navigation.ts:22`.

Inline positive form (`typeof x==='object'&&!Array.isArray(x)`, 23): `maps/resident-relay.ts:15`,
`runtime/client-observation-support.ts:71`, `runtime/diagnostics-export.ts:167,175,183,203,208,224,259`,
`runtime/local-agent-storage.ts:59`, `runtime/local-agent.ts:153,258`, `runtime/owner-reminder-notification-port.ts:82`,
`runtime/phone-workflow-authoring.ts:17,18`, `browser/hosted-results.ts:16`, plus the named ones above.

Inline negated form (`typeof x!=='object'||Array.isArray(x)`, 49): `runtime/action-message-presentation.ts:232`,
`runtime/browser-cloud-resident.ts:49`, `runtime/calendar-edit-draft.ts:6`, `runtime/cloud-protocol.ts:303`,
`runtime/cloud-service-info.ts:5`, `runtime/connection-ui.tsx:417,419`, `runtime/conversation-selection.ts:9`,
`runtime/crash-log.ts:39`, `runtime/diagnostics-export.ts:40,48,132,138,164,219`,
`runtime/google-calendar-selection.ts:24,49`, `runtime/local-agent-stream.ts:13,146`, `runtime/notes-folders-model.ts:27`,
`runtime/notes-organize-contract.ts:29`, `runtime/prepared-view-navigation.ts:3`, `runtime/remote-protocol.ts:311`,
`runtime/view-navigation.ts:229`, `prototype/canonical-notes-ui.ts:36,175`, `prototype/settings-adapter.ts:164,173`,
`browser/calendar-backup.ts:33` **(delete)**, `browser/cloud-connection.ts:79` (dev), `browser/development-digest-document.ts:12`
(dev), `browser/development-execution-document.ts:17` (dev), `browser/device-preferences.ts:7,11`, `browser/device.ts:38`,
`browser/digest-storage.ts:37,43`, `browser/focus-state.ts:12`, `browser/notification-store.ts:23,24`.

**Differences:** some forms accept class instances and some don't (none uses `getPrototypeOf`, so in practice they are
all the same). The real differences are the return shape (a predicate, a `null` return, or a throw) and the error type
thrown (`CloudProtocolError`, `PersonalProtocolError`, `RemoteProtocolError`, plain `Error`).

**Proposal:** in `lib/parse.ts`:

```ts
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function expectRecord(v: unknown, fail: () => Error): Record<string, unknown>;
```

Protocol modules pass their own error: `expectRecord(v, () => new CloudProtocolError('invalid-response'))`. Move
`string`/`optionalString`/`uuid`/`timestamp` from `cloud-protocol.ts:128-142` to the same file, with the same `fail`
parameter. Many inline sites are B3 re-validation of the module's own data, so delete those instead of converting them.
`zod` is already a root dependency and is an alternative for the protocol parsers. Decide that once, not per file.

**Files:** the 30 or so surviving files listed above.

### R4. UUID check (C3)

**Sites (21 regex sites, plus upstream `validateUuid` used in 2 files):**

| variant | sites |
|---|---|
| any version, `/i` (= upstream `UUID_PATTERN`) | `runtime/remote-protocol.ts:316` (`uuidPattern`), `runtime/google-calendar-selection.ts:9`, `runtime/google-accounts.ts:52`, `runtime/connection-ui.tsx:1949`, `:2436` (×2), `runtime/owner-reminder-notification-protocol.ts:5`, `:8`, `runtime/local-agent-stream.ts:44`, `runtime/action-message-presentation.ts:10`, `product/owner-route-table.ts:45` (string form, `A-F` allowed) |
| any version, lower-case only | `runtime/diagnostics-export.ts:73`, `runtime/local-agent.ts:183`, `runtime/resident-recovery.ts:33`, `runtime/calendar-approval.ts:3` (string fragment) |
| RFC version 1–5 plus variant nibble, `/i` | `runtime/cloud-protocol.ts:135` (`uuid()`), `runtime/cloud-personal-protocol.ts:22`, `:23` (with `personal:` prefix, v5), `runtime/power-launch-state.ts:9` (lower-cases the result), `runtime/development-cartesia-conversation.ts:68` (dev) |
| v4 only | `runtime/device-view-profile.ts:4`, `prototype/note-origin-adapter.ts:28`, `browser/calendar.ts:240`, `browser/development-workflows.ts:58,64,77` (dev) |
| loose `[a-f0-9-]{36}` | `runtime/connection-ui.tsx:1132` (`/i`), `:1161`, `:1489`, `:1556`, `:1566`, `runtime/cloud-personal-intent.ts:9`, `runtime/media-copy-intent.ts:8`, `runtime/native-calendar-sync.ts:20`, `runtime/diagnostics-export.ts:60`, `runtime/local-agent-stream.ts:42`, `runtime/cloud-protocol.ts:381`, `runtime/browser-cloud-resident.ts:75`, `prototype/browser-camera.ts:107`, `browser/files.ts:29,30`, `browser/digest-authorization-document.ts:13`, `browser/digest-delegation.ts:11`, `browser/development-account-document.ts:17` (dev), `browser/cloud-connection.ts:36` (dev) |
| upstream `validateUuid` | `runtime/connection-ui.tsx:25` (+7 uses), `runtime/development-cartesia-conversation.ts:3` |

**Differences:** these are real and deliberate in places. The server mints v4 (or v5 for `personal:`) and elizaOS
derives version-0 ids. Case sensitivity differs. The loose form accepts 36 dashes.

**Proposal:** in `lib/ids.ts`:
`export { UUID_PATTERN, validateUuid } from '<upstream core uuid>'` (any version, `/i`);
`isUuid = (v): v is string => validateUuid(v) !== null`;
`isUuidV4(v)` (lower-case v4 plus variant), used for ids this app mints with `crypto.randomUUID()`;
`isUuidRfc(v)` (versions 1–5, `/i`), used for Cloud server ids; and
`OPAQUE_36 = /^[a-f0-9-]{36}$/` for slot ids the native side writes with the loose form (keep it loose to match the Java
writers, see J2).
Each site picks the variant that matches what it accepts today. Don't tighten or loosen as part of the merge.

**Files:** the 27 files above. Import upstream through the single `@eliza/*` alias (D13), not
`../../../../vendor/eliza/...`.

### R5. Other identifier regexes (C6)

**Sites:**
- hex-64 `/^[a-f0-9]{64}$/` (39 sites): `runtime/always-on-listener.ts:55`, `runtime/calendar-form-draft.ts:16`,
  `runtime/calendar-linked-storage.ts:6`, `runtime/cloud-delegation-ui.tsx:34`, `runtime/cloud-personal-protocol.ts:36`,
  `runtime/connection-ui.tsx:1161,1489,1556`, `runtime/diagnostics-export.ts:59`, `runtime/google-accounts.ts:53`,
  `runtime/inbox-local-store.ts:8,9`, `runtime/local-agent.ts:683,700,723`, `runtime/maps-event-return.ts:14`,
  `runtime/native-calendar-sync.ts:17,31,45`, `runtime/phone-context.ts:42,50,84,87`,
  `prototype/agent-calendar-adapter.ts:29`, `prototype/settings-adapter.ts:175,186,187`, `browser/daily.ts:25`,
  `browser/deletions.ts:19`, `browser/development-actions.ts:45`, `browser/development-cloud-document.ts:10`,
  `browser/digest-authorization-document.ts:16,21`, `browser/digest-live-sources.ts:7`, `browser/voice.ts:122`,
  `browser/workflow-notices.ts:19,22,39,66`.
- Operation id `/^[A-Za-z0-9_-]{1,128}$/` (8 sites): `runtime/google-workspace-return.ts:45`,
  `runtime/managed-service-routes.ts:11`, `prototype/canonical-notes-ui.ts:37,214`, `browser/calendar.ts:41,216`,
  `browser/daily.ts:25`, `browser/deletions.ts:19`.
- Email `/^[^\s<>@,;]+@…/`: `runtime/mail-sender-image.ts:4`, `browser/simulated-inbox.ts:7,21,24` (dev),
  `browser/calendar-sync-fields.ts:10` **(delete)**.
- HTTP(S) address check: `browser/browser-surface.ts:12`, `browser/daily.ts:173`, `runtime/mail-html.ts:6,13`,
  `runtime/alpha-client.ts:189`, `runtime/remote-protocol.ts:88`.

**Differences:** none within each group, apart from anchors and case flags.

**Proposal:** `lib/ids.ts`: `SHA256_HEX`, `isSha256Hex(v)`, `OPERATION_ID`, `isOperationId(v)`. Add
`lib/url.ts`: `isHttpUrl(v)`, `domainOf(url)` (the latter from chunk proposals for `prototype/` mail/browser). Email
needs only one live production site (`mail-sender-image.ts`), so it stays local unless the dev simulator keeps its own copy.

### R6. Abortable sleep (C3)

**Sites:** `runtime/cloud-protocol.ts:143` `delay(ms, signal)` (exported; rejects with `signal.reason`),
`runtime/local-agent.ts:267-272` (inline; rejects with `signal.reason || DOMException('Cancelled','AbortError')`),
`browser/cloud-connection.ts:111` (dev), `runtime/calendar-availability.ts:7` (re-exports upstream `abortablePause`,
which rejects with `Error('Aborted')`, not with `signal.reason`).
Non-abortable fixed waits (`new Promise(r=>setTimeout(r,n))`): `runtime/connection-ui.tsx:2705,2930,2941,2976` (10 ms
polling loops, which are T8-style busy waits and should wait on a condition instead), `runtime/local-agent.ts:735`,
`prototype/agent-adapter.ts:140`, `prototype/browser-adapter.ts:138,157,280`, `prototype/canonical-notes-ui.ts:140`,
`prototype/voice-adapter.ts:739`.

**Differences:** the rejection reason. `cloud-protocol.delay` and the `local-agent` inline copy agree on
`signal.reason`. Upstream `abortablePause` does not, so it is not a drop-in replacement for those two.

**Proposal:** `delay(ms: number, signal?: AbortSignal): Promise<void>` in `lib/abort.ts`, moved from
`cloud-protocol.ts`. It rejects with `signal.reason ?? abortError()`. Keep `abortablePause` only inside the upstream
availability flow that uses it.

**Files:** `runtime/cloud-protocol.ts`, `runtime/local-agent.ts`, `runtime/connection-ui.tsx` (rewrite the polling loops),
`prototype/agent-adapter.ts`, `prototype/browser-adapter.ts`, `prototype/voice-adapter.ts`.

### R7. Abort / timeout race (C3)

**Sites:** `runtime/alpha-client.ts:321-376` (race at `:338`), `runtime/local-agent.ts:236-250` and `:282-318`,
`runtime/abort-signal.ts:21-46` (`runProviderConfiguration`), `runtime/native-connection.ts:276-287`, `:297-318`,
`runtime/voice-timing.ts:126-136`, `runtime/workflow-presentation.ts:47-51`, `runtime/native-network.ts:5-21`,
`local-speech-playback.ts:19-41` (5 races), `prototype/voice-adapter.ts:555`, `prototype/browser-camera.ts:361`,
`runtime/development-cartesia-conversation.ts:164` (dev).
Timeout-only races: `prototype/agent-adapter.ts:223`, `prototype/camera-adapter.ts:779`, `browser/audio-capture.ts:115`.

**Differences:** all share the same skeleton: a `cancelled` promise rejected from an `abort` listener, then
`Promise.race([work, cancelled])`, then remove the listener in `finally`. They differ in the rejection value
(`signal.reason`, `signal.reason || DOMException`, or a fixed message) and in whether a timeout is folded in (local-agent).

**Proposal:** in `lib/abort.ts`:

```ts
export function raceAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T>;   // rejects with signal.reason ?? abortError()
export function withTimeout<T>(work: Promise<T>, ms: number, onTimeout?: () => unknown): Promise<T>;
```

Move `anyAbortSignal` from `runtime/abort-signal.ts` here. `runProviderConfiguration` stays in `runtime/` (it is domain
logic) but uses `raceAbort`.

**Files:** the 12 files above.

### R8. `isAbortError` and constructing `AbortError` (C3)

**Detection sites (23, `name==='AbortError'`):** `maps/navigation-voice.ts:39`,
`runtime/connection-ui.tsx:342,557,907,3337`, `runtime/local-agent-stream.ts:102`, `runtime/remote-protocol.ts:327`,
`runtime/share-panel.ts:13`, `runtime/subscription-entitlement.ts:90`, `runtime/text-share.ts:23`,
`runtime/voice-selection.ts:77`, `prototype/camera-adapter.ts:464,1442,1605`, `prototype/canonical-notes-ui.ts:133`,
`prototype/local-speech-playback.ts:219`, `prototype/note-recorder.ts:81` (the only named copy, `aborted`),
`prototype/notes-share-adapter.ts:11`, `prototype/scan-pdf.ts:22`, `prototype/share-panel-adapter.ts:22`,
`prototype/voice-adapter.ts:171`, `browser/file-picker.ts:7`, `browser/simulated-workflows.ts:83` (dev).

**Construction sites (136 `new DOMException(msg,'AbortError')` in 52 files).** The heaviest are
`runtime/connection-ui.tsx` (19), `browser/voice.ts` (15), `runtime/local-agent.ts` (10), `prototype/local-speech-playback.ts`
(6), `runtime/cloud-voice.ts` (6), `prototype/browser-camera.ts` (6), `prototype/voice-adapter.ts` (4) and
`runtime/native-calendar-sync.ts` (4). The full list is `grep -rn "'AbortError')" apps/app/src`.

**Differences:** none in detection. Construction differs only in the message text, which never reaches the UI (callers
test `name`).

**Proposal:** `isAbortError(e: unknown): boolean` and `abortError(message = 'Cancelled'): DOMException` in
`lib/abort.ts`. Keep existing messages where a test asserts them, and otherwise use the default.

**Files:** the 23 detection files plus the 52 construction files. The construction swap is mechanical and can be one
commit.

### R9. Canonical JSON (C3)

**Sites:** `runtime/owner-reminder-notification-protocol.ts:28` (`canonical()`: a hand-written serialiser with sorted keys),
`browser/hosted-results.ts:16` (`canonical()`: a `JSON.stringify` replacer that sorts keys).

**Differences (real):** for `undefined` members the hand-written one emits `"k":undefined` (invalid JSON), while the
replacer drops them. The hand-written one ignores `toJSON` (Dates serialise as `{}`), while the replacer honours it. For
the values each site actually hashes (plain JSON from the wire), the outputs are identical.

**Proposal:** `canonicalJson(value: unknown): string` in `lib/json.ts`, using the replacer form (it produces valid JSON).
Before switching `owner-reminder-notification-protocol.ts`, confirm that no hashed payload contains `undefined` or a `Date`,
because the hash is compared with the agent's. If upstream exposes the agent-side canonicaliser, import that instead.
Also add `sameJson(a,b)` here for the many `JSON.stringify(a)===JSON.stringify(b)` comparisons (see R19).

**Files:** the two above.

### R10. Durable slot store: Android secure slot vs browser document (C4)

**Sites (13 files, each with its own `android()` branch and CAS/`editJson`):**
`runtime/reminder-journal-store.ts:9-19` (already generic, best instance), `runtime/notes-folders.ts:7-19`,
`runtime/note-audio-deletions.ts:16-28`, `runtime/notes-trash.ts:16-42` (two store objects),
`runtime/service-read-cache-store.ts:17-22`, `runtime/workflow-intents.ts:19-36` (localStorage on Android),
`runtime/cloud-personal-intent.ts:11-27` and `runtime/media-copy-intent.ts:13-27` (raw localStorage CAS plus a
`BrowserDomainDocument`), `runtime/conversation-selection.ts:18-31`, `runtime/assistant-draft-store.ts:16-20`,
`runtime/inbox-local-store.ts:8-14`, `prototype/inbox-unsaved.ts:36-37,76`, `prototype/note-origin-adapter.ts:9-10`.
"Read saved notes raw" is duplicated in `runtime/notes-trash.ts:49-55` and `runtime/note-audio-deletions.ts:29-33`.
Related: `secureConnectionStore.compareExchange` appears in 18 files, and `BrowserJsonDomainDocument` in 15.

**Differences:** the "changed" error text; whether `next===raw` short-circuits; and whether the browser side is a
`BrowserJsonDomainDocument`, a `BrowserDomainDocument` or raw `localStorage`. `workflow-intents.ts` uses localStorage
slots on Android, so it needs checking against the PRD before it is merged.

**Proposal:** generalise `reminderJournalStore` into `lib/durable-slot.ts` (or `runtime/storage/durable-slot.ts`):

```ts
export interface DurableSlot<T> {
  read(): Promise<T | null>;
  edit(update: (raw: T | null) => T | null, changedMessage?: string): Promise<void>;
}
export function durableSlot<T>(slot: string, browser: () => Promise<BrowserJsonDocument>): DurableSlot<T>;
```

Add `readSavedNotesRaw()` to `runtime/notes-secure-store.ts`. `reminderJournalStore` becomes
`durableSlot` typed as `ReminderJournalStore<T>`.

**Files:** the 13 files above. Slot and key strings stay exactly as they are.

### R11. Observable document facade (C4)

**Sites (8 copies of `new BroadcastChannel('alpha.browser.documents.v1')` plus key filter plus `window` event plus
stringify-before/after `edit`):**
`browser/preference-documents.ts:3-17` (generic `document(key,event)`, best instance), `browser/calendar-store.ts:11-34`,
`browser/reminder-store.ts:6-28`, `browser/notification-store.ts:13-39`, `browser/hosted-results.ts:12-13`,
`browser/workflow-notices.ts:7-9`, `browser/digest-authorization-document.ts:6,25-28`,
`browser/development-account-document.ts:11,29-36` (dev). The same channel name is also posted to from
`runtime/browser-notes-document.ts:33` and `browser/documents.ts:4`.
Other `BroadcastChannel`s, which are separate channels and not part of this merge: `runtime/calendar-sync-host.ts:301`,
`runtime/google-connection-ui.tsx:158`, `runtime/workflow-intents.ts:29`, `prototype/workflow-adapter.ts:482`,
`browser/voice.ts:167`.

**Differences:** the guard function each one applies on read, and the event name. Some guard
`typeof BroadcastChannel==='undefined'` (B2: always defined in the WebView).

**Proposal:** promote `document()` from `preference-documents.ts` to
`observedDocument(key: string, event: string, guard?: (v: unknown) => void)` in `lib/observed-document.ts`, using one
module-level channel. Event names are a cross-module contract, so keep every `alpha:*-document-changed` string.

**Files:** the 8 files above plus `runtime/browser-notes-document.ts` and `browser/documents.ts`. Add the channel name to
`storage-keys.ts`.

### R12. Imperative `<dialog>` lifecycle (C4)

**Sites:** `createElement('dialog')` in 38 files: `passwords/dev-vault.ts:26` (dev), `runtime/calendar-sync-settings.ts:16,204`
**(delete, A2)**, `runtime/share-panel.ts:26`, `prototype/browser-camera.ts:430`, `prototype/calendar-approval-review.ts:8`,
`prototype/file-email-review.ts:12`, `prototype/note-source-adapter.ts:53`, `prototype/note-web-source-adapter.ts:13`,
`prototype/scan-correction-review.ts:8`, `prototype/scan-document.ts:35`, `prototype/scan-page-camera.ts:12,58`,
`prototype/scan-review.ts:20`, `prototype/scan-searchable-review.ts:12`, `prototype/source-review-dialog.ts:6`
(the canonical prototype instance, `openReview`), `prototype/summary-note-review.ts:8`, `prototype/video-edit-review.ts:8`,
`prototype/workflow-filters.ts:13`, `browser/calendar-editor.ts:10`, `browser/calendar-meeting.ts:6`,
`browser/calendar-response.ts:6`, `browser/clock.ts:64`, `browser/content-question.ts:7`, `browser/device.ts:82`,
`browser/domain-recovery.ts:11`, `browser/incoming-simulation.ts:9` (dev), `browser/location-simulation.ts:24` (dev),
`browser/mail-attachments.ts:45`, `browser/notifications.ts:213,226`, `browser/password-provider.ts:25`,
`browser/reading-review.ts:10`, `browser/retained-data-notice.ts:6`, `browser/review.ts:13`,
`browser/selected-document-viewer.ts:6`, `browser/simulator-recovery.ts:32`, `browser/workflow-history.ts:31`,
`browser/workflow-receipts.ts:32`, `browser/workflow-result-input.ts:10`, `browser/workflow-urgency.ts:17`.
Theme-token copy and `#000000` dark detection (15 files): `prototype/calendar-approval-review.ts:9`,
`prototype/note-source-adapter.ts:53`, `browser/calendar-editor.ts:11`, `browser/calendar-meeting.ts:6`,
`browser/calendar-response.ts:6` (`toUpperCase`), `browser/dialog-layout.ts:6` (`toLowerCase`),
`browser/mail-attachments.ts:45`, `browser/review.ts:16`, `browser/selected-document-viewer.ts:7`,
`browser/simulator-recovery.ts:33`, `browser/incoming-simulation.ts:10`, `browser/location-simulation.ts:25`,
`browser/workflow-history.ts:32`, `browser/workflow-receipts.ts:33`, `browser/workflow-urgency.ts:18`,
`browser/workflow-result-input.ts:11`, `browser/reading-review.ts:13`, `browser/device-controls.tsx:21`.
Lifecycle listener sets: `'alpha-back'` in 51 files (95 sites) and `visibilitychange` in 84 files. The explicit
copies are `browser/selected-document-viewer.ts:12-14`, `browser/calendar-meeting.ts:14`, `browser/calendar-response.ts:7`,
`browser/retained-data-notice.ts:11-13`, `browser/domain-recovery.ts:56-59` and `browser/password-provider.ts:17-20,27-30` (twice).
Near-duplicate CSS: `mail-attachments.css` and `selected-document-viewer.css`, `calendar-response.css` and
`calendar-meeting.css`, `calendar-editor.css`, and `review.css`.

**Differences:** which tokens are copied (`bg,fg,s2,line` / `+mut` / `+acc`), the case handling in dark detection, the
mount point (`.os` vs `body`), and the back-capture flag. The token copying exists only because body-mounted dialogs
escape `.os`.

**Proposal:** `openOwnedDialog({label, className, mount = '.os', onRetire?}): {dialog, signal, close}` in
`lib/owned-dialog.ts` (or `browser/dialog/`). It mounts inside `.os`, so no token copy is needed. It owns
`alpha-back` (capture, `stopImmediatePropagation`), `pagehide`, `alpha:device-state`, `visibilitychange`, focus restore,
and the abort of `signal` on retirement. Merge the CSS into one `dialog.css` with modifiers. `prototype/source-review-dialog.ts`
`openReview` builds on it. Also merge `prototype/dom.ts` DOM factories (`notes-query-review.ts:4-6` plus 14 inline
`createElement` chains).

**Files:** the 38 files above, minus deletes and dev, plus the four CSS files.

### R13. Staleness / liveness fence (C4)

**Sites (about 15 hand-rolled `check()`/`current()` closures combining `document.hidden`, connection snapshot,
`JSON.stringify(binding)` compare, `visibilitychange` and `connectionController.subscribe` listeners, an abort link and a
timeout):**
`runtime/native-reading-voice.ts:18-25`, `runtime/paired-voice.ts:22-35`, `prototype/local-speech-playback.ts:30-39`,
`runtime/native-calendar-sync.ts:25-28`, `runtime/text-share.ts:5-7`, `runtime/view-navigation.ts:84-89,165-178,233-235`,
`runtime/source-renewal-question.ts:10-38`, `runtime/owner-reminder-notification-port.ts:19,73`,
`maps/navigation-voice.ts:50-55` (an 8-field snapshot compare), `runtime/native-connection.ts:294-326`,
`runtime/app-speech.ts:19-20`, `runtime/cloud-voice.ts:166`, `prototype/notes-query-executor.ts:17-80`
(`stable()`/`assertCurrent()` repeated 14 times), `runtime/connection-ui.tsx` (`composerBinding`).
About 30 epoch/generation counters in total (research n–z P11).

**Differences:** these are real. Some abort on hide while others defer, some require an open connection and some
require a closed one. Each site keeps its predicate. Only the plumbing is shared.

**Proposal:** in `lib/owned-operation.ts`:

```ts
export function ownedOperation(options: {
  signal?: AbortSignal; timeoutMs?: number;
  watch?: Array<'visibility' | 'connection'>; current: () => boolean; message?: string;
}): { signal: AbortSignal; check(): void; dispose(): void };
```

Upstream `createNativeSpeechRequests` (`paired-voice.ts:26`) already covers part of this for speech. Each converted site
needs its browser spec green before and after.

**Files:** the 14 files above.

### R14. Storage-key and channel literals (C6)

71 distinct versioned keys in the renderer. Keys repeated across files:

| literal | files (sites) |
|---|---|
| `alpha.connection.selection.v1` | 12 (16): `main.tsx:106`, `runtime/connection-ui.tsx:204` (owner `SELECTION`), `runtime/hosted-digest-ui.tsx:84,284`, `runtime/hosted-live-source-ui.tsx:132`, `prototype/workflow-authoring.ts:98`, `product/alpha-product-registration.ts:334`, `browser/development-actions.ts:12`, `browser/development-connection.ts:18`, `browser/development-digests.ts:13,73`, `browser/development-workflows.ts:20`, `browser/digest-storage.ts:12,19`, `browser/workflow-drafts.ts:9,13` |
| `alpha.browser.documents.v1` (channel) | 10: see R11 |
| `alpha.appearance.v1` | `prototype/data-adapter.ts:183`, `prototype/settings-adapter.ts:258`, `product/alpha-product-registration.ts:333` |
| `alpha.startup-permissions.v1` | `startup-permission-flow.ts:48`, `product/alpha-product-registration.ts:335` |
| `alpha:startup-permission-walkthrough:v1` | `startup-permission-progress.ts:11`, `product/alpha-product-registration.ts:336` |
| `alpha.browser.calendar.v1` | `prototype/calendar-adapter.ts:158`, `browser/calendar-store.ts:10` |
| `alpha.browser.reminders.v1` | `browser/reminder-store.ts:5`, `browser/clock.ts:35` |
| `alpha.browser.device.v1` | `browser/device-preferences.ts:39`, `browser/preference-documents.ts:26` |
| `alpha.browser.password-provider.v1` | `browser/preference-documents.ts:23`, `browser/password-provider.ts:6` |
| `alpha.dev.location.v1` | `browser/location.ts:8`, `browser/location-simulation.ts:6` (dev) |
| capability ids `calendar.*.v1`, `notes.*.v1` | `runtime/phone-context.ts:132-154`, `product/alpha-product-registration.ts:343,345`, `runtime/connection-ui.tsx:1566` (these are contract ids, not storage) |
| `alpha.connection.{cloud-service,resident-qa,plan-admission,legacy-hosted-selection,conversations}.v1` | `runtime/connection-ui.tsx:251,256,288,1612` (single file, but they are part of the same registry) |

Secure-slot names shared with Java (`assistant-draft:v1:`, `inbox-operation:v1:`, `connected-read-cache:v1:`,
`calendar-linked-sync:v1:`, `workflow-draft:v1:`, `cloud-delegation:v1:`, `notes-*:v1:device`, `cloud:production`) are
written in the renderer (`runtime/assistant-draft-store.ts`, `runtime/inbox-local-store.ts`,
`runtime/service-read-cache-store.ts`, `runtime/calendar-linked-storage.ts`, `runtime/calendar-sync-host.ts`,
`browser/workflow-drafts.ts`, `prototype/workflow-authoring.ts`, `runtime/cloud-delegation-ui.tsx`,
`runtime/connection-ui.tsx`) and again in `RendererCredentialSlots.java:13-30` and `AlphaCredentialStore.java:32-52`.

**Proposal:** `lib/storage-keys.ts`, with one exported `const` per key (the exact string). Delete the A1 legacy ones
(`legacy-hosted-selection`) instead of registering them. Add `readConnectionSelection()` (owned by the connection module,
re-exported for `browser/`) to replace the 16 inline `JSON.parse(localStorage.getItem(SELECTION)||'null')`. For the slot
names shared with Java, extend the existing generator that already emits `runtime/cloud-deployment.generated.ts` and its
Java/Gradle twins, so that one JSON source produces `storage-keys.generated.ts` and `Slots.java` (J8). Don't drop the
`.v1` suffixes as part of this merge, because they are installed identity.

**Files:** the 25 or so files above.

### R15. Platform predicates and PluginHeaders (C3)

**Sites:**
- `Capacitor.getPlatform()==='android'` (34 sites in 21 files), although `native.ts:14` exports `isAndroid`:
  `startup-permissions.tsx:64`, `runtime/accessibility-timeout.ts:20`, `runtime/assistant-draft-store.ts:16`,
  `runtime/cloud-personal-intent.ts:12,18,23`, `runtime/connection-ui.tsx:493,2104,2307`,
  `runtime/conversation-selection.ts:20,26,31`, `runtime/media-copy-intent.ts:13,17,22,27`,
  `runtime/native-connection.ts:17,217`, `runtime/note-audio-deletions.ts:16`, `runtime/notes-folders.ts:9`,
  `runtime/notes-trash.ts:16`, `runtime/reminder-journal-store.ts:10`, `runtime/workflow-intents.ts:19,36`,
  `prototype/agent-adapter.ts:1479`, `prototype/agent-calendar-adapter.ts:49,215`, `prototype/browser-adapter.ts:582`,
  `prototype/calendar-edit-draft-adapter.ts:56`, `prototype/calendar-form-draft-adapter.ts:76`,
  `prototype/inbox-unsaved.ts:36,76`, `prototype/note-origin-adapter.ts:10`.
- `Capacitor.isNativePlatform()` (215 sites in 56 files). It is equivalent to `isAndroid` for this product (no iOS target).
- `PluginHeaders` casts (9): `main.tsx:369,370`, `native.ts:21`, `runtime/aosp-image.ts:34,36`,
  `runtime/native-connection.ts:14,18,25,217`.

**Differences:** none in effect. `isNativePlatform` is also true on iOS, which is not shipped.

**Proposal:** `lib/platform.ts`: `export const isAndroid` (moved from `native.ts`, which re-exports it until callers move),
`pluginHeader(name)` and `pluginHasMethod(name, method)` (beside `platform-plugins.ts`, or inside it). Converting the
215 `isNativePlatform()` calls is mechanical but large, so do it as a separate commit.

**Files:** the 21 plus 4 files above. `isNativePlatform` is a follow-up.

### R16. Screen-locked / foreground-blocked predicates (C3)

**Sites:**
- Lock selector `[aria-label="Unlock with fingerprint"], [aria-label="Wake"]`: `browser/screen-locked.ts:3` (owner
  `browserScreenLocked()`), plus inline copies at `runtime/cloud-voice.ts:166`, `runtime/text-share.ts:6`,
  `browser/voice.ts:275`, `browser/workflow-focus.ts:41`, `browser/workflow-speech.ts:8`,
  `browser/workflow-trigger-runtime.ts:13`.
- `dataset.devBackground==='true'` (23 sites in 21 files): `main.tsx:332,333` (writer), `runtime/app-speech.ts:20`,
  `runtime/cloud-voice.ts:166`, `runtime/hosted-digest-ui.tsx:73`, `browser/alert-audio.ts:7`, `browser/clock.ts:39`,
  `browser/hosted-results.ts:17`, `browser/location.ts:11`, `browser/notice-action.ts:2`, `browser/notifications.ts:21`,
  `browser/password-provider.ts:23`, `browser/review.ts:10,35`, `browser/voice.ts:275`, `browser/workflow-focus.ts:41`,
  `browser/workflow-location.ts:15`, `browser/workflow-notices.ts:36`, `browser/workflow-receipts.ts:44`,
  `browser/workflow-result-input.ts:7`, `browser/workflow-speech.ts:8`, `browser/workflow-trigger-runtime.ts:13`,
  `browser/workflow-urgency.ts:14`.
- The "hidden or devBackground or locked" predicate under three names: `browser/notice-action.ts:2` `noticeActionBlocked`,
  `browser/notifications.ts:21` `locked`, `browser/hosted-results.ts:17` `blocked`. Also `browser/clock.ts:39`,
  `browser/alert-audio.ts:7`, and the chunk entries `hosted-digest-ui.tsx:73` and `workflow-*`.

**Differences:** whether `document.hidden` is included, and whether test-mocks shortcuts apply (`clock.ts:39`).

**Proposal:** `lib/foreground.ts`: `screenLocked()`, `devBackground()` and `foregroundBlocked()` (hidden or devBackground or
locked). `browser/screen-locked.ts` is deleted (D4). `devBackground` is a dev signal (D5), so the shared predicate reads
it only when `build-flags.ts` says dev surfaces are on.

**Files:** the 25 or so files above.

### R17. Device time zone (C3)

**Sites (31 `Intl.DateTimeFormat().resolvedOptions().timeZone`):** `runtime/calendar-form-draft.ts:28,33`,
`runtime/connection-ui.tsx:1999`, `runtime/device-record-presentation.ts:44`, `runtime/hosted-digest-ui.tsx:107,605`,
`runtime/workflow-local-time.ts:26`, `prototype/agent-calendar-adapter.ts:118`, `prototype/calendar-adapter.ts:227,302`,
`prototype/calendar-edit-draft-adapter.ts:18,53`, `prototype/calendar-form-draft-adapter.ts:24,66`,
`prototype/clock-adapter.ts:100`, `prototype/reminder-adapter.ts:285`, `prototype/scan-event-review.ts:8`,
`prototype/voice-adapter.ts:635`, `prototype/workflow-authoring.ts:118`, `browser/calendar-agent-review.ts:19`,
`browser/calendar-alerts.ts:7`, `browser/calendar-editor.ts:9`, `browser/calendar.ts:48,103,118,193,200,256,280`,
`browser/development-digests.ts:49` (dev), `browser/calendar-linked-local.ts:49` **(delete)**.

**Differences:** some add a `|| 'UTC'` fallback.

**Proposal:** `deviceTimeZone(): string` in `lib/civil-date.ts`, with the `'UTC'` fallback.

### R18. Civil-day helpers (C3)

**Sites:** `runtime/agent-calendar-view.ts:6`, `prototype/calendar-adapter.ts:22,75,78,133,342,360`,
`prototype/calendar-edit-draft-adapter.ts:29`, `prototype/calendar-form-draft-adapter.ts:11,42`,
`prototype/calendar-form-inputs.ts:3`, `prototype/calendar-interval-presentation.ts:5,8,83`,
`browser/calendar-recurrence.ts:21`, `browser/calendar-time.ts:1-2` (`calendarWall`/`civil`), `browser/calendar.ts:205,206`,
`browser/development-digest-occurrence.ts:34,36` (dev), `browser/workflow-calendar.ts:2`, `browser/workflow-triggers.ts:20`.
Also `DAY` constants and the `pnRel`/`phAgo` day maths in `prototype/model.js` (prototype P13).

**Proposal:** `lib/civil-date.ts`: `DAY_MS`, `civilDay(date, zone)`, `civilDayDiff(a, b)`, `parseCivilDate(s)`.
`browser/calendar-time.ts` merges into it.

### R19. Session / identity tuples via `JSON.stringify([...])` (C3)

**Sites:** 150 `JSON.stringify([` sites in 62 files. The identity-key subset (chunks and research) is `main.tsx:102,430`,
`runtime/agent-calendar.ts:14` (`calendarOwnerKey`), `:15,16,60,68,73`, `runtime/calendar-sync-host.ts:99`,
`runtime/connection-ui.tsx:1647` (`conversationKey`) and others, `prototype/agent-adapter.ts:443,1429,1694`
(`canonicalNotesKey` `:542`), `prototype/agent-calendar-adapter.ts:142`, `runtime/deletion-recovery`/`deletion-owner.ts`
(`'agent:'+JSON.stringify([...])`), `browser/deletion-recovery.ts:7`, and the `binding`/`mapBinding`/`speechBinding`/
`conversationBinding` closures named in the chunk tables.

**Differences:** the tuple members differ per site (origin, owner, agent, session, extra), and some are persisted.

**Proposal:** `lib/session-key.ts`: `sessionKey(session, ...extra): string` and `sameSession(a, b)`. Persisted tuples
keep their exact member order. Equality-only uses move to `sameJson` (R9).

### R20. Error text and error code extraction (C3)

**Sites:** `error instanceof Error ? error.message : fallback` appears 81 times in 43 files (heaviest:
`prototype/agent-adapter.ts` 9, `prototype/camera-adapter.ts` 9). `(e as {code?:string})?.code` appears 19 times in 10 files:
`local-speech-playback.ts:37,40,57`, `runtime/cloud-voice.ts:174`, `runtime/note-recorder-driver.ts:48`,
`runtime/telephony-executor.ts:96`, `prototype/local-speech-playback.ts:206,215`, `prototype/note-recorder.ts:400`,
`prototype/phone-adapter.ts:131`, `prototype/photo-library-adapter.ts:113,145`, `prototype/sms-adapter.ts:162`,
`prototype/voice-adapter.ts:446,576,683,824,867,886`.

**Proposal:** `lib/error-text.ts`: `errorText(e, fallback)` and `errorCode(e)`. The chunk proposal `runtime/plugin-error.ts`
folds into this.

### R21. Smaller renderer duplicates (C3/C6, from chunk tables)

| concept | sites | home |
|---|---|---|
| Deletion journal (`journalBinding`, stage/settle/undo, history limit `500`) | `browser/calendar-deletions.ts:6,16-55`, `browser/reminder-deletions.ts:6,8-43`, `browser/daily.ts:38,41,45-49`, `browser/deletions.ts:18-22`, `browser/calendar.ts:71,274-278` | `browser/journal-retention.ts`: `JournalBinding`, `deletionJournal<Row>(equals)`, `deletionMethods()` |
| Lucide icon URL `'/icons/lucide/'+name+'.svg'` and mask style | 8 files incl. `runtime/connection-ui.tsx` (~40 uses), `passwords/password-manager.ts`, `runtime/google-connection-ui.tsx`, `prototype/camera-adapter.ts`, `prototype/native-adapter.ts`, `prototype/selection-adapter.ts` | `icon-style.ts` `lucideIconUrl()` / `.lucide-icon` class |
| Repeat list and repeat→RRULE map | `browser/calendar-recurrence.ts:10`, `browser/calendar.ts:237`, `browser/calendar-editor.ts:35`, `prototype/agent-calendar-adapter.ts:200`, `prototype/calendar-adapter.ts:36` | `browser/calendar-recurrence.ts` |
| Alert minutes `[0,10,60]` | `browser/calendar-alerts.ts:7`, `browser/calendar.ts:232`, `browser/calendar-editor.ts:36` | `browser/calendar-records.ts` |
| `devSurfacesEnabled` / `developmentBridgeAllowed` | `build-flags.ts:3`, `browser/dev-profile.ts:4`; `runtime/local-agent.ts:69`, `runtime/local-agent-storage.ts:9` | `build-flags.ts` only (D5) |
| `/__alpha-local-agent` and `/__alpha-browser-cloud` POST | `runtime/local-agent.ts:104,109,117`, `runtime/local-agent-storage.ts:11`, `runtime/browser-cloud-resident.ts:12,43`, `browser/cloud-connection.ts:8` | one dev bridge client in `dev/` (not `lib/`) |
| Cloud environment allowed | `runtime/connection-ui.tsx:209`, `runtime/cloud-protocol.ts:52`, `runtime/cloud-environment-selection.ts` | `cloud-environment-selection.ts` |
| Open reminder statuses | `runtime/workflow-reminder-read.ts:6`, `runtime/reminder-creations.ts:34` | `OPEN_REMINDER_STATUSES` in `browser/daily.ts` |
| Notes kind→label | `runtime/notes-view.ts:31`, `runtime/notes-organize-contract.ts:59` | `notes-view.ts` `KIND_LABEL` |
| Dev namespace regex | `browser/development-agent-document.ts:12`, `browser/development-digest-document.ts:15`, `browser/development-execution-document.ts:10` | `browser/development-identity.ts` (dev) |
| Owner request fn type, `LocalProviderStatus` parsing | `runtime/view-navigation.ts:12`, `maps/resident-relay.ts:7`, `runtime/device-view-profile.ts:7`; `runtime/local-agent.ts:531,572` | `alpha-client.ts` `OwnerRequest`; one parser |
| Inline style helpers (dot, chip, switch row, sr-only, toggle track) | `runtime/hosted-digest-ui.tsx:5-9`, `runtime/cloud-delegation-ui.tsx:10`, `prototype/model.js:4613,5418-5419`, `prototype/workflow-adapter.ts:463` | CSS classes (D12) |

---

## 3. Android ledger (`android/`)

Paths are relative to `android/app/src/main/java/ai/alphacompute/alphaphone/` unless they start with `android/`.

### J1. SHA-256 digest and hex (C3)

**Sites (main source, 10):**

| shape | sites |
|---|---|
| `String`→hex, `String.format("%02x")` loop | `AlphaCredentialStore.java:159-160`, `CalendarSyncSnapshot.java:140`, `HostedResultNotices.java:31` |
| `String`→hex, `Character.forDigit` loop | `GoogleWorkspaceReturnFlow.java:33-36` (wraps failures as `IllegalArgumentException`) |
| stream→hex, 64 KiB buffer | `AlphaDevicePlugin.java:212-216` (`assetSha256`), `:322-326` (`digest(path)`) |
| verified copy (digest while copying with a size cap) | `AlphaDevicePlugin.java:244-255` (`copyVerified`) |
| bytes→hex | `AlphaDevicePlugin.java:282-285` (`signingRoot`) |
| own `hex()` helpers | `AlphaDevicePlugin.java:240` (`BigInteger` `%064x`), `WorkflowWorkerAssets.java:26-27` (`hex` and `digest()` wrapping as `IOException`; streamed at `:66`, `:99`), `release/DataIntegrityProvider.java:86` (`Character.forDigit`) |
| already delegates upstream | `AlphaMailAttachmentsPlugin.java:54` → `DocumentBytes.sha256(byte[])` (`vendor/eliza/plugins/plugin-native-media/.../DocumentBytes.java:26`) |
| fixture | `android/notification-fixture/.../MediaFixtureActivity.java:32` |

**Differences:** all produce lower-case hex. The `BigInteger` `%064x` form is also correct because it zero-pads. The
differences are only the exception type each one wraps `NoSuchAlgorithmException` into.

**Proposal:** `AlphaUtil.sha256Hex(byte[])`, `sha256Hex(String)` (UTF-8) and `sha256Hex(InputStream)`, plus
`AlphaUtil.hex(byte[])`. SHA-256 is guaranteed on Android, so the helper rethrows `NoSuchAlgorithmException` as
`IllegalStateException`. Callers stop wrapping it. `copyVerified` stays in `AlphaDevicePlugin` (it is specific to that
code) but uses `hex`. `AlphaMailAttachmentsPlugin.hash` is inlined to `DocumentBytes.sha256` (D4).
`release/DataIntegrityProvider.java` is a separate APK/module and keeps its own copy unless it shares the source set.

**Files:** `AlphaCredentialStore.java`, `CalendarSyncSnapshot.java`, `HostedResultNotices.java`,
`GoogleWorkspaceReturnFlow.java`, `AlphaDevicePlugin.java`, `WorkflowWorkerAssets.java`, `AlphaMailAttachmentsPlugin.java`.

### J2. Identifier validators (C3)

**Sites:**
- `matches("[a-f0-9]{64}")` (main, 27): `AlphaActionJournal.java:76`, `AlphaActionJournalPlugin.java:89,126`,
  `AlphaCanonicalNotifications.java:60`, `AlphaCredentialStore.java:49,50,51,166`, `AlphaDevicePlugin.java:245,293`
  (`[0-9a-f]`), `AlphaLocalAgentPlugin.java:425,1063,1077`, `AlphaNoteRecorder.java:132`, `CalendarSyncBridge.java:187`,
  `HostedDelivery.java:57`, `HostedResultNotices.java:29,37,80,90`, `NativeDigestSources.java:39`,
  `NativeOwnerReminderHost.java:84`, `RendererCredentialSlots.java:26,27,30` (slot patterns), `ResidentResultSession.java:77`,
  `WorkflowWorkerAssets.java:41`.
- UUID (main, 18), in four shapes:
  - `UUID.fromString(v).toString().equals(v)`: `AlphaConnectionPlugin.java:219` (`equalsIgnoreCase`),
    `CalendarSyncBridge.java:115`, `PairedSpeechContract.java:9`, and the fixtures `FixtureActivity.java:17` and
    `MediaFixtureActivity.java:27`.
  - Full regex: `AlphaLocalAgentPlugin.java:910,1298`, `AlphaNoteAudioPlugin.java:71` (`OPERATION`),
    `AlphaNoteRecorder.java:55` (`ID`), `NativeNotificationSession.java:24` (`(?:-…){3}` form).
  - Loose `[a-f0-9-]{36}`: `AlphaLocalAgentPlugin.java:762,769,878`, `CalendarSyncSnapshot.java:34`,
    `HostedDelivery.java:45,57`, `NativeOwnerReminderHost.java:84`, `ResidentResultSession.java:77`.
  - Research also lists `GoogleWorkspaceReturn.java:26` and `PairedAgentCredential.java:23`.
- Opaque id `[A-Za-z0-9_-]{1,128}` / `[A-Za-z0-9][A-Za-z0-9_-]{0,127}`: `AlphaActionJournalPlugin.java:89,126`,
  `HostedResultNotices.java:37`, plus the chunk entry `id`/`sourceId`.

**Differences:** `UUID.fromString(...).equals` accepts any version but only the canonical lower-case form, which equals
the regex form. `equalsIgnoreCase` (`AlphaConnectionPlugin`) also accepts upper case. The loose `{36}` form accepts
non-UUIDs, and the renderer writes those values with the same loose check (R4), so keep it as a separate, named predicate.

**Proposal:** `AlphaUtil.isSha256Hex`, `isUuid` (canonical lower-case), `isOpaque36`, `isOpaqueId`. Keep the slot
*patterns* in `RendererCredentialSlots`/`Slots` (J8), built from one `SHA256_HEX` constant.

**Files:** the 22 main files above.

### J3. Bounded stream read (C3)

**Sites:** `AlphaDevicePlugin.java:202-205`, `AlphaLocalAgentPlugin.java:595-603`, `AlphaVoiceCloudPlugin.java:164`,
`KeyboardDictationCloud.java:92-94`, `HostedTransport.java:30`, `WorkflowWorkerAssets.java:28-30` (`bounded`, which also
handles `read()==0`), `AlphaNoteRecorder.java:121-122`, `AlphaMapsTransportPlugin.java:57-58` (adds GZIP and a deadline).

**Differences:** buffer size (4 KiB or 8 KiB), the limit value and the exception message, the `read()==0` handling in
`WorkflowWorkerAssets`, and the deadline in Maps.

**Proposal:** `AlphaUtil.readBounded(InputStream in, int limit) throws IOException`, with an 8 KiB buffer, throwing
`IOException("Response too large")` past the limit. Maps keeps its deadline loop but calls `readBounded` for the
copy-and-cap, or stays local if the deadline is per chunk.

**Files:** the 8 files above.

### J4. Executors and the rejected-after-destroy strategy (C3)

**Sites (25 executors in main):** `AlphaCalendarPlugin.java:37`, `AlphaCanonicalNotifications.java:16,17` (static),
`AlphaCloudSignInPlugin.java:77`, `AlphaConnectionPlugin.java:127` (4 threads), `AlphaDeletionsPlugin.java:14` (2),
`AlphaDevicePlugin.java:154,499`, `AlphaFilesPlugin.java:33`, `AlphaGmailPlugin.java:15`, `AlphaHostedResultsPlugin.java:20`,
`AlphaKeyboardDictationService.java:30`, `AlphaLocalAgentPlugin.java:41` (plus two more pools at `:42-43`),
`AlphaMailAttachmentsPlugin.java:34`, `AlphaMapsTransportPlugin.java:22,25` (bounded queues), `AlphaNoteAudioPlugin.java:20`,
`AlphaNoteDocumentsPlugin.java:20`, `CalendarScopedDeletionReview.java:16`, `CalendarSyncBridge.java:24`,
`DailyAppsPlugin.java:36`, `HostedTransport.java:17` (scheduled), `ResetBeforeDispatch.java:64` (raw `Thread`),
`SerialStorageTasks.java:8`.
Rejected strategies: `PluginWorkers.submit` (`PluginWorkers.java:16-19`, used in 14 files), `SerialStorageTasks.java:13`,
and raw `catch(RejectedExecutionException)` in `AlphaCalendarPlugin.java:79`, `AlphaDeletionsPlugin.java:18,32,49,66`,
`AlphaGmailPlugin.java:33,34` (silently ignored, B1), `AlphaKeyboardDictationService.java:176`,
`AlphaMapsTransportPlugin.java:65`, `CalendarScopedDeletionReview.java:52,60`, `CalendarSyncBridge.java:155`.
Per-plugin `submit(call, work)` wrappers: `AlphaGmailPlugin.java:17-21` (`Work`), `AlphaDeletionsPlugin.java:19` (`Task`),
`AlphaFilesPlugin.java:36` (`StorageWork`), `AlphaDevicePlugin.java:161-163` (`diagnostics`),
`AlphaLocalAgentPlugin` (`ProviderChange`), `HostedDelivery` (`NativeSourceWork`).

**Differences:** pool size, the bounded queue (Maps), and what a refusal does: reject the call with a message, resolve
`unavailable`/`conflict`, or ignore it.

**Proposal:** an `AlphaPlugin` base class that owns one `ExecutorService` (single-thread by default, with a size argument
for Connection/Deletions/LocalAgent), shuts it down in `handleOnDestroy`, and provides
`background(PluginCall call, Callable<JSObject> work, String closedMessage)` and
`background(Runnable work, Runnable refused)`. Each plugin's refusal outcome (`unavailable`, `conflict`, reject) is
passed in, so behaviour is unchanged. `PluginWorkers.submit` moves to `AlphaUtil.submit` for the non-plugin classes
(`CalendarScopedDeletionReview`, `CalendarSyncBridge`, `AlphaKeyboardDictationService`). Delete `SerialStorageTasks`
unless its one user needs strict ordering. Maps keeps its own bounded pools (they are deliberate backpressure).

**Files:** the 22 plugin and helper files above.

### J5. Owner-foreground check (C4)

**Sites (main, 10 definitions plus about 20 inline `hasWindowFocus`/`isFinishing` checks):**
`AlphaDevicePlugin.java:30-35` (`shareForeground`: focus, `isDeviceLocked`, `isUserUnlocked`, RESUMED),
`AlphaLocalAgentPlugin.java:512-520` (`requireProviderOwner`: not the assistant surface, focus optional,
`isKeyguardLocked` and `isDeviceLocked`), `AlphaGmailPlugin.java:22` (`foreground`), `AlphaDeletionsPlugin.java:57`, `:98`,
`CalendarSyncBridge.java:48`, `CalendarScopedDeletionReview.java:25-26`, `AlphaCalendarPlugin.java:92` (`foreground`), `:112`
(`unlocked`, `isDeviceLocked`), `ClockAgentReview.java:49-50` (focus plus `isKeyguardLocked`),
`AlphaHostedResultsPlugin.java:37`, `AlphaKeyboardDictationService.java:112` (keyguard plus interactive plus audio, which is a
different concept), `AlphaConnectionPlugin.java:35` (RESUMED or focus), `AlphaFilesPlugin.java:127` (focus only),
`AlphaMapsTransportPlugin.java:72`, `AlphaMailAttachmentsPlugin.java:68,114,167`, and
`AlphaLocalAgentPlugin.java:346,700,758,784,795,914,921`.

**Differences (real):** `isKeyguardLocked` vs `isDeviceLocked` vs both; focus vs lifecycle RESUMED; the assistant-surface
exclusion. Research flags that some may be intentional (the assistant over the lock screen).

**Proposal:** `AlphaUtil.ownerForeground(Activity a, Foreground mode)` with
`enum Foreground { SURFACE /* not finishing/destroyed, RESUMED */, FOCUSED /* + hasWindowFocus */,
UNLOCKED_FOCUSED /* + !isKeyguardLocked && !isDeviceLocked */ }`. Map each site to the mode that reproduces it today and
record the mapping in the commit message. Any site that changes mode needs its PRD flow checked. The keyboard service
(`AlphaKeyboardDictationService`) stays separate.

**Files:** the 15 files above.

### J6. Slot-store adapter glue (C4)

**Sites:** 12 anonymous adapters from `AlphaCredentialStore` to an upstream `read/write(slot)` interface:
`AlphaReminders.java:16-23`, `AlphaTelephony.java:28-32`, `AlphaActionJournal.java:16-18`,
`NativeDeletionCoordinator.java:26-28`, `AlphaNoteAudioPlugin.java:40-43`, `AlphaCloudSignInPlugin.java:59`,
`HostedDelivery.java:15` (wraps into `HostedStorageFault`), `GmailBackground.java:22-25`, `WorkflowNoticeTapsFactory.java:4`,
`SourceRenewalHost.java:6`, `AlphaNotificationsPlugin.java:41`, `NativeOwnerReminderHost.java:21`, plus
`AlphaActionJournalPlugin.java:25`, `AlphaConnectionPlugin.java:63`, `NativeDigestHost.java:11` and
`AlphaLocalAgentPlugin.java:302` (`providerSlot`).
Product-local copies of the interface: `NativeDigestSources.java:10` `Storage`, `HostedInbox.java:8` `Store`,
`HostedResultNotices.java:14` `Storage`, `SourceRenewalNotices.java:11` `Store` (single slot),
`GoogleWorkspaceReturnFlow.java:16` `Store`, `WorkflowNoticeDelivery.java:13` `Storage` (an empty re-alias of upstream
`NoticeDelivery.Storage`).

**Differences:** method set (with or without `remove`, single-slot or keyed) and fault wrapping.

**Proposal:** short term, `Slots.of(AlphaCredentialStore)` returns one adapter object that implements every
product-local interface (merge the local `Storage`/`Store` interfaces into one `SecureSlots` with `read`, `write` and
`remove`). Long term (upstream change, not a vendor edit), one upstream `SecureSlots` interface that
`AlphaCredentialStore implements`. Delete `WorkflowNoticeDelivery.Storage` (D4).

**Files:** the 22 files above.

### J7. "check() throws" guard interfaces (C3)

**Sites:** `NativeDigestSources.java:15` `Guard`, `HostedInbox.java:11` `Fence`, `HostedTransport.java:11` `Guard`,
`ResidentCredentialShutdownRetry.java:5` `Guard`, `ResidentResultSession.java:14` `Guard`,
`AlphaCanonicalNotifications.java:192` `ForegroundCheck`, and `Runnable assertOwner` in `AlphaCredentialStore`.
`SourceRenewalNotices.java:12` `Guard` has a different shape (`describe`), so leave it.

**Proposal:** `AlphaUtil.Guard { void check() throws Exception; }`, used by all six. These guards are the Java side of the
staleness fence (R13). Related epoch holders: `NativeReadEpoch`, `InvocationOwnerCache`, and the `generation`/`token`
counters in `AlphaMailAttachmentsPlugin` and `AlphaLocalAgentPlugin`.

### J8. Slot names and identity literals (C6)

**Sites:**
- `"cloud:production"` (32 in 9 files): `AlphaCredentialStore.java` (11), `AlphaLocalAgentPlugin.java` (9),
  `CalendarSyncBridge.java` (4), `AlphaConnectionPlugin.java` (3), `GmailBackground.java`, `KeyboardDictationCloud.java`,
  `LegacyCloudRecovery.java` **(delete)**, `RendererCredentialSlots.java`, `ResetBeforeDispatch.java`; renderer
  `runtime/connection-ui.tsx`.
- `"local-agent-provider:v1"` (13), although `LocalAgentProviderAdmission.PROVIDER_SLOT` (`:5`) exists:
  `AlphaLocalAgentPlugin.java:190,358,460,644`, `AlphaVoiceCloudPlugin.java:52,249,254,338`, `CloudDeployment.java:26`,
  `KeyboardDictationCloud.java:33,51`, `LegacyCloudRecovery.java:12` **(delete)**; renderer
  `runtime/cloud-deployment.generated.ts`.
- Slot namespace lists maintained three times: `RendererCredentialSlots.java:13-30`, `AlphaCredentialStore.slotLimit`
  (`:32-52`), and each owner's literal.
- Provider slot readers (read plus parse): `AlphaLocalAgentPlugin` (4), `AlphaVoiceCloudPlugin` (3),
  `KeyboardDictationCloud` (2).
- Other versioned identifiers: `AlphaApplication.java:24` `"alpha-native-voice-timing-v3"`,
  `AlphaReminders.java:12` `"alpha-reminder-envelope-v1"`, `"mail-attachments"` folder, `"alpha-workflow-"` tag prefix,
  and `"alphaphone"` scheme (chunk tables; the androidTest copies should import the main constants).

**Proposal:** `Slots.java` holds every slot name and namespace as a constant, with its cap and renderer policy, and
replaces the `slotLimit` regex ladder and the `RendererCredentialSlots` arrays. Add `ProviderSelection.read(SecureSlots)`
for the 9 provider reads. Generate the slot names the renderer shares from the same source as R14.

**Files:** the 12 files above plus `RendererCredentialSlots.java` and `AlphaCredentialStore.java`.

### J9. `HttpURLConnection` setup (C3)

**Sites:** `AlphaConnectionPlugin.java:228`, `:295-296`, `AlphaDevicePlugin.java:662`, `AlphaMapsTransportPlugin.java:53`,
`AlphaVoiceCloudPlugin.java:207`, `:281`, `HostedTransport.java:26`, `KeyboardDictationCloud.java:81`.

**Differences:** the connect and read timeouts (10, 15, 20, 60 or 120 s) and the method.

**Proposal:** `AlphaUtil.openNoCache(URL, connectMs, readMs)`, which sets no redirects, no caches and both timeouts.
OkHttp 5 is already an app dependency but no product file uses it. Choosing it is a separate decision, so don't mix it into
this merge.

### J10. Diagnostics classification (C3)

**Sites:** exception family appears at `NativeNotificationDiagnostics.java:7` and `:12` (the identical expression twice) and
`AlphaLocalAgentPlugin.java:30-35` (`ResidentAttachDiagnostic`). The HTTP status clamp `status>=100&&status<=599?status:0`
appears at `NativeNotificationDiagnostics.java:23` and `AlphaLocalAgentPlugin.java:28`.

**Proposal:** `AlphaUtil.exceptionFamily(Throwable)` and `AlphaUtil.httpStatus(int)`.

### J11. Calendar READ+WRITE permission check (C3)

**Sites:** `CalendarSyncBridge.java:47`, `:219`, `CalendarScopedDeletionReview.java:24`, `NativeDigestHost.java:33`, `:35`,
`AlphaCalendarPlugin.java:111`.

**Proposal:** `AlphaUtil.calendarReadWrite(Context)`.

### J12. WorkManager periodic plus catch-up scheduling (C5)

**Sites:** `GmailDeliveryWorker.java:9` and `HostedDeliveryWorker.java:8` (the same code with different names).

**Proposal:** `AlphaUtil.schedulePeriodic(Context, String uniqueName, Class<? extends ListenableWorker>, Data, boolean network)`.
Unique work names stay byte-identical.

### J13. Photo permission aliases (C6)

**Sites:** `AlphaPhotosPlugin.java:16-20` and `AlphaPhotoLibraryPlugin.java:11-16` declare the same four `@Permission` aliases.

**Proposal:** Capacitor needs the annotation on each plugin, but the alias strings can be shared constants (in
`AlphaMediaConfig`, per the chunk table).

---

## 4. Instrumentation-test duplicates (`android/app/src/androidTest`)

These follow the same patterns at a larger scale. They are listed separately because T-series decisions
(`research/tests-host.md`, `research/tests-browser.md`) may delete many of these files first.

| concept | androidTest count | proposed test-side home |
|---|---|---|
| SHA-256 hex | 39 sites in 34 files (e.g. `ActionJournalInstrumentedTest.java:22`, `ConnectionInstrumentedTest.java:27`, `ConnectionRoutesInstrumentedTest.java:51`, `DeviceActionInstrumentedTest.java:44`, `PhotosTestFixture`, `ResidentTestFixture`) | call main `AlphaUtil.sha256Hex` (same package, visible to tests) |
| UUID checks | 14 sites in 14 files | `AlphaUtil.isUuid` |
| hex-64 checks | 6 sites in 5 files | `AlphaUtil.isSha256Hex` |
| Executors / threads | 33 sites in 25 files | one `TestThreads` helper or `InstrumentationRegistry` runOnMainSync |
| Stream read to bytes | 147 sites in 88 files | `AlphaUtil.readBounded` / one `TestIo.readAll` |
| Activity focus/finishing checks | 33 sites in 17 files | `AppNavigation` test driver |
| React value setter JS, label click, open view, `alphaIsHome`, Settings switch BFS, AccessibilityNodeInfo BFS, reflection `field()`, synthetic notice, WorkManager finish poll | 3–9 copies each (chunk tables android-01…18) | `AppNavigation`, `AccessibilityTestDriver`, `TestReflection`, `WorkTestDriver` |
| Production literals re-typed in tests (`alpha.connection.selection.v1`, `"note-origins:v1:device"`, `"alpha-workflow-"`, `"mail-attachments"`, `APP` package name) | per chunk tables | import the main constant / `BuildConfig.APPLICATION_ID` |

---

## 5. Suggested order

1. Delete the A1/A2/A3 files named **(delete)** above, so they are never ported.
2. Create `apps/app/src/lib/{hash,ids,parse,json,abort,error-text}.ts` and `AlphaUtil.java`, with no call sites yet.
   These are pure functions.
3. Run the mechanical swaps one concept per commit: R1, R2, R8 (construction), R20, J1, J2, J10, J11. Use a grep-zero check
   per concept, for example `grep -rn "padStart(2,'0')" apps/app/src` returns only `lib/hash.ts`.
4. Next, the swaps that need care: R3/R4/R5 (keep each variant), R6/R7, R9 (verify payloads), R14/J8 (generator), R15, R16,
   R17/R18, J3, J4 (`AlphaPlugin`), J6, J7, J9, J12.
5. Mechanisms, each with its browser or instrumentation spec green before and after: R10 durable slot, R11 observed
   document, R12 owned dialog, R13 owned operation, J5 owner foreground.
6. The `Capacitor.isNativePlatform()` → `isAndroid` sweep and the androidTest helpers last, after the T-series deletions.

Every step must pass `npm run verify` and both Android distribution variants (`npm run android:build:local`). An APK
build alone does not show that a mechanism merge (step 5) preserved behaviour. That needs the emulator and device
journeys for the affected flows.
