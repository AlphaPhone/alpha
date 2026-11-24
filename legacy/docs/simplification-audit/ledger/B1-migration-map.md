# B1 migration map: renderer `lib/` helpers

Line numbers are from this branch before stage C (other stage-A/B units edit concurrently). Re-find each site by
the quoted local name or expression. Paths are relative to `apps/app/src/`. Import from `../lib/<file>` (or `./lib/`
from the `src/` root). Files marked **(delete)** are removed by stage A; do not port them. If a file no longer exists
when you migrate, skip its rows.

General rules for every row:

- "Identical" means same output for every input the site can receive today. Where a caveat says otherwise, either
  accept the stated difference explicitly in your ledger or keep the site local.
- Keep each site's input encoding (raw text, `JSON.stringify`, `canonicalJson`), message text, slot and key strings.
- Where a report marks the check as B3 re-validation of the module's own data, delete it instead of converting it.

---

## `lib/hash.ts`

### `sha256Hex(input: string | BufferSource): Promise<string>` (R1)

Hash step is identical at every site (`Array.from(u8, fn)`, `Array.from(u8).map(fn)` and `[...u8].map(fn)` all give
the same string). Only the encoding argument differs; keep it.

| file | local name / expression | replacement | caveat |
|---|---|---|---|
| `runtime/agent-calendar.ts:27` | inline in `calendarSourceRevisions` | `await sha256Hex(calendarSourceKey(source))` | |
| `runtime/assistant-draft-store.ts:14` | `hash` | `await sha256Hex(binding)` | slot `assistant-draft:v1:<hash>` unchanged |
| `runtime/note-origin.ts:32-33` | `digest` + return | `return sha256Hex(content)` | |
| `runtime/service-read-cache-store.ts:18` | `hash` | `await sha256Hex(identity)` | slot `connected-read-cache:v1:` unchanged |
| `runtime/sms-agent-contract.ts:4` | `smsAgentHash` body | `return sha256Hex(smsBindingText(operation))` | |
| `prototype/agent-calendar-adapter.ts:64` | `markerKey` | `'alpha.calendar.retention.v1.'+await sha256Hex(ownerKey)` | persisted key |
| `prototype/inbox-unsaved.ts:35` | `hash` | `await sha256Hex(binding)` | |
| `prototype/note-recorder.ts:179-182` | `bytes` / `ownerDigest` | `const digest = await sha256Hex(owner.identity);` then `this.ownerDigest = digest` | keep the epoch/owner check between the await and the assignment |
| `browser/hosted-results.ts:15` | `hash` | delete; callers use `sha256Hex(value)` | |
| `runtime/inbox-local-store.ts:13` | `hash` | `await sha256Hex(JSON.stringify(owner))` | |
| `runtime/native-calendar-sync.ts:34` | `operationId(value)` | `const operationId = (value: unknown) => sha256Hex(JSON.stringify(value))` or inline | |
| `runtime/google-accounts.ts:337-338` | `linkOperationKey(...parts)` | `'alpha-calendar-connect:'+await sha256Hex(JSON.stringify(parts))` | prefix kept |
| `prototype/reminder-adapter.ts:256`, `:378`, `:428` | `bindingHash` | `await sha256Hex(JSON.stringify(operation))` | |
| `browser/calendar.ts:50` | `operationHash` | `await sha256Hex(JSON.stringify(operation))` | |
| `browser/calendar.ts:242` | `binding` | `await sha256Hex(JSON.stringify(fields))` | |
| `browser/deletions.ts:20` | `operationHash` | `await sha256Hex(JSON.stringify(input.operation))` | |
| `browser/workflow-trigger-runtime.ts:15` | `sha(value)` | delete; callers `sha256Hex(JSON.stringify(value))` | |
| `browser/workflow-notices.ts:13` | `digest(text)` | `sha256Hex(JSON.stringify(text))` | hashes the **quoted** string; persisted, keep `JSON.stringify` |
| `runtime/owner-reminder-notification-protocol.ts:29` | `reminderDigest` body | `return sha256Hex(canonical(value))` (or `canonicalJson`, see json.ts) | |
| `runtime/legacy-calendar-preservation.ts:13` | **(delete, A1)** | — | |
| `runtime/native-recovery-backup.ts:11` | **(delete, A3)** | — | |

Upstream `workflowSha` (`.eliza/.../contracts/src/workflow-device.ts:174`) equals `sha256Hex(JSON.stringify(x))`; files
already importing it (`workflow-reminder-read.ts`, `prototype/workflow-authoring.ts`, `prototype/agent-adapter.ts`,
`browser/workflow-drafts.ts`, `browser/development-workflows.ts`) keep it. Do not mix both styles inside one file.

Grep-zero check after migration: `grep -rn "padStart(2,'0')" apps/app/src` should list only `lib/hash.ts` plus the
non-hash sites below (R2 leftovers, time formatting).

### `randomHex(bytes: number): string` (R2)

| file | local name | replacement | caveat |
|---|---|---|---|
| `browser/revision.ts:2` | `revision` | `export const revision = () => randomHex(32)` (or callers call `randomHex(32)` and the file goes, D4) | |
| `runtime/connection-ui.tsx:1158`, `:1488`, `:1555` | `key:` in new credential | `key: randomHex(32)` | |
| `prototype/context-selection.ts:52` | `sessionMarker` | `const sessionMarker = () => randomHex(6)` | |

Not migrated (different concept): `prototype/photo-library-adapter.ts:34` (base 36), `prototype/browser-camera.ts:106`,
`:197` (decimal digits), `runtime/native-connection.ts:109` (raw IV bytes).

---

## `lib/ids.ts`

All predicates are `(value: unknown): value is string` and check `typeof value === 'string'` first. A bare
`/re/.test(x)` coerces non-strings (a one-element array `['<hex>']` passes the regex, `isX` rejects it). Where `x` is
already typed or checked as a string the replacement is identical; where it is `unknown`/`any`, the predicate is
stricter by that coercion only. Embedded patterns (prefix, path or surrounding text in the same regex) are **not**
migrated: `cloud-protocol.ts:381` (`browser-cloud-reference:`), `local-agent-stream.ts:42` (path),
`browser/files.ts:29-30` (`b1:`), `action-message-presentation.ts:10`, `google-accounts.ts:53` (`alpha-google:`),
`inbox-local-store.ts:8-9`, `calendar-form-draft.ts:16` (`agent:`), `calendar-linked-storage.ts:6`,
`cloud-delegation-ui.tsx:34`, `prototype/agent-calendar-adapter.ts:29`, `calendar-approval.ts:3` (string fragment),
`product/owner-route-table.ts:45` (JSON-schema string), `owner-reminder-notification-protocol.ts:8` (path),
`browser-cloud-resident.ts:75` (path), `cloud-personal-protocol.ts:23` (`personal:` v5).

### `UUID_PATTERN`, `validateUuid`, `isUuid` (any version, `/i`) (R4)

| file | local name | replacement |
|---|---|---|
| `runtime/connection-ui.tsx:25` | `import {validateUuid} from '../../../../vendor/...'` | `import { validateUuid } from '../lib/ids'` |
| `runtime/development-cartesia-conversation.ts:3` (dev) | same import | same |
| `runtime/remote-protocol.ts:316` | `uuidPattern` | `UUID_PATTERN` / `isUuid(v)` |
| `runtime/google-calendar-selection.ts:9` | regex | `UUID_PATTERN` / `isUuid` |
| `runtime/google-accounts.ts:52` | `[a-f0-9]…/i` regex | `UUID_PATTERN` / `isUuid` |
| `runtime/connection-ui.tsx:1949` | regex | `isUuid` |
| `runtime/connection-ui.tsx:2436` (×2) | `(?:-[0-9a-f]{4}){3}` form, `/i` | `isUuid` (same language) |
| `runtime/owner-reminder-notification-protocol.ts:5` | `uuid` | `UUID_PATTERN` (used as `uuid.test(...)` after `text()`; same) |

### `UUID_LOWER_PATTERN`, `isLowerUuid` (any version, lower case only)

| file | local name | replacement |
|---|---|---|
| `runtime/local-agent.ts:183` | regex in `identifier` | `isLowerUuid(v)` |
| `runtime/resident-recovery.ts:33` | regex | `isLowerUuid(v)` |
| `runtime/diagnostics-export.ts:73` | regex constant | `UUID_LOWER_PATTERN` |
| `runtime/local-agent-stream.ts:44` | `[a-f0-9]{8}(?:-…){3}…/i` | **not this variant**: it is `/i`, so `isUuid` |

### `UUID_V4_PATTERN`, `isUuidV4` (lower-case v4)

| file | local name | replacement |
|---|---|---|
| `runtime/device-view-profile.ts:4` | regex | `UUID_V4_PATTERN` / `isUuidV4` |
| `prototype/note-origin-adapter.ts:28` | regex | `isUuidV4` |
| `browser/calendar.ts:240` | regex | `isUuidV4` |
| `browser/development-workflows.ts:58,64,77` (dev) | regex | `isUuidV4` |

### `UUID_RFC_PATTERN`, `isUuidRfc` (v1–v5, `/i`)

| file | local name | replacement | caveat |
|---|---|---|---|
| `runtime/cloud-protocol.ts:133-137` | exported `uuid(value)` | `expectUuidRfc(value, () => new CloudProtocolError('invalid-response'))` (parse.ts); keep `uuid` export as that one-liner or update its importers | |
| `runtime/cloud-personal-protocol.ts:22` | regex | `isUuidRfc` | |
| `runtime/power-launch-state.ts:9` | `uuid` | `const uuid=(value:unknown)=>isUuidRfc(value)?value.toLowerCase():null` | keeps lower-casing |
| `runtime/development-cartesia-conversation.ts:68` (dev) | regex | `isUuidRfc` | |

### `OPAQUE_ID_36`, `isOpaque36` (`[a-f0-9-]{36}`, lower case)

| file | replacement | caveat |
|---|---|---|
| `runtime/connection-ui.tsx:1161`, `:1489`, `:1556`, `:1566` | `isOpaque36(x)` | |
| `runtime/cloud-personal-intent.ts:9` | `isOpaque36` | |
| `runtime/media-copy-intent.ts:8` (`[-a-f0-9]{36}`) | `isOpaque36` | same character set |
| `runtime/native-calendar-sync.ts:20` | `isOpaque36` | |
| `runtime/diagnostics-export.ts:60` (`turnId`, `[0-9a-f-]{36}`) | `OPAQUE_ID_36` | same set |
| `prototype/browser-camera.ts:107` | `isOpaque36` | |
| `browser/digest-authorization-document.ts:13`, `browser/digest-delegation.ts:11` | `isOpaque36` | |
| `browser/development-account-document.ts:17` (dev) | `isOpaque36` | |
| `runtime/connection-ui.tsx:1132`, `browser/cloud-connection.ts:36` (dev) | **leave local** | `/i`: accepts upper case; no shared variant |

### `SHA256_HEX`, `isSha256Hex` (R5)

Replacement `isSha256Hex(x)` (or `SHA256_HEX.test(x)` where `x` is a known string) at:
`runtime/always-on-listener.ts:55`, `runtime/cloud-personal-protocol.ts:36`, `runtime/connection-ui.tsx:1161,1489,1556`,
`runtime/local-agent.ts:683,700,723` (`:683`/`:723` already check `typeof === 'string'`: becomes
`isSha256Hex(result.bindingGuard)?…`), `runtime/maps-event-return.ts:14`, `runtime/native-calendar-sync.ts:17,31,45`,
`runtime/phone-context.ts:42,50,84,87` (drop the preceding `typeof … !== 'string'` since the predicate covers it),
`runtime/diagnostics-export.ts:59` and `prototype/settings-adapter.ts:175,186,187` (written `[0-9a-f]{64}`, same set),
`browser/daily.ts:25`, `browser/deletions.ts:19`, `browser/digest-authorization-document.ts:16,21`,
`browser/digest-live-sources.ts:7`, `browser/voice.ts:122`, `browser/workflow-notices.ts:19,22,39,66`,
dev: `browser/development-actions.ts:45` (×2), `browser/development-cloud-document.ts:10`.
Not this helper: `diagnostics-export.ts:54` (`{32}`), `:58` (`{40}`), `:74`.

### `OPERATION_ID`, `isOperationId` (R5)

| file | replacement | caveat |
|---|---|---|
| `runtime/managed-service-routes.ts:11` | `isOperationId(value)` | |
| `runtime/google-workspace-return.ts:45` | `!isOperationId(result.connectionId)` | `?? ''` no longer needed: undefined/null fail either way |
| `prototype/canonical-notes-ui.ts:37`, `:214` | `isOperationId(...)` | |
| `browser/calendar.ts:41`, `:216` | `isOperationId(input.operationId)` | |
| `browser/daily.ts:25`, `browser/deletions.ts:19` | `isOperationId(input.operationId)` | |
| `browser/workflow-notices.ts:66` (`/^[\w-]{1,128}$/`) | `isOperationId(id)` | `\w` without `u` = `[A-Za-z0-9_]`: same set |

Email and HTTP(S) URL checks (R5) are **not** in `lib/` in this stage (no `lib/url.ts` requested); they stay local.

---

## `lib/parse.ts` (R3)

`isRecord(v)` = `!!v && typeof v === 'object' && !Array.isArray(v)`. Every listed site uses either `!!x&&` / `x&&`
or `!x||` so null is rejected the same way. Class instances are accepted the same way.

### Predicate form → `isRecord`

| file | local name | replacement |
|---|---|---|
| `runtime/agent-calendar.ts:25` | `record` | `isRecord` |
| `runtime/calendar-approval.ts:34` | `object` | `isRecord` |
| `prototype/calendar-approval-fields.ts:5` | `object` | `isRecord` |
| `browser/simulator-recovery.ts:9` (dev) | `object` (`value is Bag`) | `isRecord` (narrows to `Record<string, unknown>`; cast to `Bag` where fields are read as `any`) |
| `browser/workflow-history.ts:5` | `object` (`value is Bag`) | same |
| `browser/calendar-editor-draft.ts:9` | `keys()` | **leave local**: adds an allowed-keys check |

### Null-returning form → `asRecord`

| file | expression | replacement |
|---|---|---|
| `runtime/cloud-voice-limit.ts:13` | `record` | `asRecord` |
| `maps/resident-relay.ts:15` | `value&&typeof…?value as Record:undefined` | `asRecord(value) ?? undefined` |
| `runtime/phone-workflow-authoring.ts:17` | `raw` (`Record<string,any>`) | `asRecord(value)` (keep a cast if fields are read as `any`) |
| `runtime/phone-workflow-authoring.ts:18` | `device` | `asRecord(raw?.device)` (identical: both branches give `null` for a non-record) |
| `runtime/client-observation-support.ts:71` | ternary | `isRecord(status)?…:…` |
| `runtime/diagnostics-export.ts:167,175,183,203,208,224` | `raw`/`live`/`endpoint`/`id`/`models` ternaries | `asRecord(x)` when the else-branch is `null`; check each else-branch value |
| `runtime/diagnostics-export.ts:259` | `if(value.phaseMs&&…)` | `if(isRecord(value.phaseMs))` |
| `runtime/local-agent.ts:153`, `:258` | inline in condition | `isRecord(value)&&…` / `isRecord(data)&&…` (`:258` then reads `data.code` etc.; TS narrowing needed) |
| `runtime/local-agent-storage.ts:59` | `prior!==null&&typeof…` | `isRecord(prior)&&…` |
| `runtime/owner-reminder-notification-port.ts:82` | `!!reply&&typeof…` | `isRecord(reply)&&…` |
| `browser/hosted-results.ts:16` | inside `canonical()` replacer | goes away with json.ts |

### Throw form → `expectRecord(value, () => <same error>)`

Keep each site's exact error object and message.

| file | local name | replacement |
|---|---|---|
| `runtime/cloud-protocol.ts:124` | exported `object` | `expectRecord(value, () => new CloudProtocolError('invalid-response'))`; keep the export name for its importers or update them |
| `runtime/cloud-protocol.ts:128-142` | `string`, `optionalString`, `uuid`, `timestamp` | `expectString` / `optionalString` / `expectUuidRfc` / `expectTimestamp` with `() => new CloudProtocolError('invalid-response')` |
| `runtime/automations-protocol.ts:22` | `object` | `expectRecord(value, () => Error('Invalid automation response.'))` |
| `runtime/cloud-personal-protocol.ts:20` | `obj` | `expectRecord(v, () => new PersonalProtocolError('invalid-response'))`. `str` (`:21`) is **not** `expectString`: it adds `length > 512` |
| `runtime/device-view-profile.ts:8` | `object` | `expectRecord(value, () => Error('Enabled-view profile was not verified.'))` |
| `runtime/local-agent.ts:163` | `record` | `expectRecord(value, () => new Error('Invalid local agent response.'))` |
| `runtime/native-calendar-sync.ts:14` | `object` | `expectRecord(value, () => Error('Invalid device Calendar response'))`; returns `Record<string, unknown>` (site typed `Value`; cast if needed) |
| `runtime/owner-reminder-notification-protocol.ts:24` | `record` | `expectRecord(value, () => Error('Invalid reminder response'))`; site returns `Record<string, any>`, so field reads need narrowing or a cast |
| `runtime/remote-protocol.ts:65` | `object` | `expectRecord(value, () => new RemoteProtocolError('invalid_response'))` |
| `runtime/view-navigation.ts:22` | `object` | `expectRecord(value, () => Error('Navigation reply was not verified'))` |

### Inline negated form `!x||typeof x!=='object'||Array.isArray(x)` → `!isRecord(x)`

`runtime/action-message-presentation.ts:232`, `runtime/browser-cloud-resident.ts:49`, `runtime/calendar-edit-draft.ts:6`,
`runtime/cloud-protocol.ts:302`, `runtime/cloud-service-info.ts:5`, `runtime/connection-ui.tsx:417,419`,
`runtime/conversation-selection.ts:9`, `runtime/crash-log.ts:39`, `runtime/diagnostics-export.ts:40,48,132,138,164,219`,
`runtime/local-agent-stream.ts:13,146`, `runtime/notes-organize-contract.ts:29`, `runtime/prepared-view-navigation.ts:3`,
`runtime/remote-protocol.ts:311`, `runtime/view-navigation.ts:229`, `prototype/canonical-notes-ui.ts:36,175`,
`prototype/settings-adapter.ts:164,173`, `browser/device-preferences.ts:7,11`, `browser/device.ts:38`,
`browser/digest-storage.ts:37,43`, `browser/focus-state.ts:12`, `browser/notification-store.ts:23,24`;
dev: `browser/cloud-connection.ts:79`, `browser/development-digest-document.ts:12`,
`browser/development-execution-document.ts:17`. `browser/calendar-backup.ts:33` **(delete)**.

Not this pattern (leave or treat separately): `runtime/notes-folders-model.ts:27` (no null check: `null` passes the
`typeof` test today, so `!isRecord` would change which error is thrown), `browser/development-agent-document.ts:16`,
`browser/notification-store.ts:27`, `prototype/workflow-adapter.ts:31` (no `Array.isArray` on the value itself).

`oneOf` (listed in helpers.md §1.1) was not created: `cloud-protocol.ts` has no such helper and no repeated
enum-membership helper was found; per brief, no abstraction without callers.

---

## `lib/json.ts` (R9, R19)

### `canonicalJson(value: unknown): string`

| file | local name | replacement | caveat |
|---|---|---|---|
| `browser/hosted-results.ts:16` | `canonical` | `canonicalJson` | identical (same implementation) |
| `runtime/owner-reminder-notification-protocol.ts:28` | `canonical` (hand-written) | `canonicalJson` inside `reminderDigest` | Identical only for JSON-decoded input with no integer-like object keys. The hand-written form differs for: `undefined` members (`"k":undefined` vs dropped), `undefined` array items (empty vs `null`), `toJSON`/`Date`, and integer-like keys (`"10"` before `"9"` vs numeric order). The rows that reach `reminderDigest` pass the `fields`/`dataFields` allowlists (no integer-like keys, scalar values). Confirm `binding.listUnread`/`readback` always return decoded JSON (a dev mock returning an object literal with an `undefined` member would change the revision) before switching; otherwise keep it local. |

### `sameJson(a, b): boolean`

Equality-only `JSON.stringify(a)===JSON.stringify(b)` comparisons, for example
`runtime/connection-ui.tsx:3342` and `:3427` (`target.session` vs `state.session`). Find the rest with
`grep -rnE "JSON\.stringify\([^)]*\)\s*[!=]==\s*JSON\.stringify" apps/app/src`. Replacement `sameJson(a, b)` /
`!sameJson(a, b)` is identical. Do not use it where one side is a stored string key.

---

## `lib/abort.ts`

### `anyAbortSignal` (re-export)

`runtime/abort-signal.ts` stays the implementation for now; `lib/abort.ts` re-exports it. Importers may switch to
`../lib/abort` in stage C. When `runProviderConfiguration` moves or the structural pass runs, move the implementation
into `lib/abort.ts` and make `abort-signal.ts` import it.

### `abortError(message = 'Cancelled'): DOMException` (R8 construction)

Rule: `new DOMException('<msg>','AbortError')` → `abortError('<msg>')`; `new DOMException('Cancelled','AbortError')` →
`abortError()`. Keep every message exactly (messages can reach a toast or a test). One `new DOMException(message,
'AbortError')` with a variable message → `abortError(message)`.

Files and line counts (`grep -rcE "new DOMException\(.*'AbortError'\)"`): `browser/audio-capture.ts` 1,
`browser/cloud-connection.ts` 1 (dev), `browser/local-transcription.ts` 3, `browser/mail-attachments.ts` 1,
`browser/sensor-policy.ts` 1, `browser/speech-errors.ts` 1, `browser/video-capture.ts` 1, `browser/video-transcode.ts` 1,
`browser/voice.ts` 15, `browser/workflow-focus.ts` 2, `browser/workflow-location.ts` 1, `browser/workflow-receipts.ts` 1,
`browser/workflow-result-input.ts` 1, `browser/workflow-speech.ts` 1, `browser/workflow-urgency.ts` 2,
`local-speech-playback.ts` 1, `prototype/agent-adapter.ts` 3, `prototype/browser-adapter.ts` 2,
`prototype/browser-camera.ts` 6, `prototype/canonical-notes-controller.ts` 2, `prototype/inbox-cloud-adapter.ts` 3,
`prototype/legacy-notes-access.ts` 3 **(delete)**, `prototype/local-speech-playback.ts` 6, `prototype/note-recorder.ts` 1,
`prototype/telephony-attention.ts` 1, `prototype/voice-adapter.ts` 4, `runtime/abort-signal.ts` 1,
`runtime/agent-calendar.ts` 1, `runtime/app-speech.ts` 2, `runtime/client-observation-support.ts` 1,
`runtime/cloud-protocol.ts` 2, `runtime/cloud-voice.ts` 6, `runtime/connection-ui.tsx` 17,
`runtime/development-cartesia-conversation.ts` 3 (dev), `runtime/google-accounts.ts` 2,
`runtime/google-connection-return.ts` 1, `runtime/google-connection-ui.tsx` 1, `runtime/google-workspace-return.ts` 2,
`runtime/local-agent-stream.ts` 2, `runtime/local-agent.ts` 10, `runtime/local-reply-speech.ts` 3,
`runtime/local-voice.ts` 1, `runtime/native-connection.ts` 2, `runtime/native-network.ts` 1,
`runtime/native-reading-voice.ts` 2, `runtime/paired-voice.ts` 1, `runtime/text-share.ts` 1,
`runtime/workflow-request-recovery.ts` 1 (counts are lines; some lines hold two). `DOMException(…,'TimeoutError')`
is a different name and is not migrated.

### `isAbortError(e)`: `e instanceof DOMException && e.name === 'AbortError'` (R8 detection)

| file | replacement |
|---|---|
| `runtime/connection-ui.tsx:342`, `:557`, `:907`, `:3337` | `isAbortError(error)` |
| `runtime/remote-protocol.ts:327`, `runtime/share-panel.ts:13`, `runtime/text-share.ts:23` | `isAbortError(error)` |
| `prototype/notes-share-adapter.ts:11`, `prototype/local-speech-playback.ts:219`, `prototype/scan-pdf.ts:22`, `prototype/canonical-notes-ui.ts:133`, `prototype/share-panel-adapter.ts:22` | `isAbortError(error)` |
| `prototype/camera-adapter.ts:464`, `:1442`, `:1605` | `isAbortError(error)` (keep the `browserMode&&` operand) |
| `browser/file-picker.ts:7`, `browser/simulated-workflows.ts:83` (dev) | `isAbortError(error)` |

### `isNamedAbortError(e)`: `e instanceof Error && e.name === 'AbortError'`

Upstream voice code throws `Error` subclasses named `AbortError` (`voice-session-mic-capture.ts:172`,
`voice-session-playback.ts:159`, `native-speech-request.ts:38`), which `isAbortError` rejects. Keep these sites on
this variant:

| file | replacement |
|---|---|
| `runtime/local-agent-stream.ts:102` | `!(cue.signal.aborted && isNamedAbortError(error))` |
| `prototype/voice-adapter.ts:171` | `!isNamedAbortError(error)` |
| `runtime/subscription-entitlement.ts:90` | `!(error instanceof Error) \|\| isNamedAbortError(error)` (keep the `instanceof` guard: it narrows `error` for the following lines) |

Left local (duck-typed `?.name === 'AbortError'`, accepts non-`Error` objects): `maps/navigation-voice.ts:39`,
`prototype/note-recorder.ts:81` (`aborted`), `runtime/voice-selection.ts:77` (`row.name`). `runtime/voice-states.ts:13`
compares a name string, not an error.

### `delay(ms, signal?)` (R6)

Moved semantics of `cloud-protocol.ts:143`: with a signal, synchronous `throwIfAborted()`, then reject with
`signal.reason` on abort; without a signal, a plain timer.

| file | local name | replacement | caveat |
|---|---|---|---|
| `runtime/cloud-protocol.ts:143-150` | exported `delay` | delete; `:400` imports `delay` from `../lib/abort` | identical |
| `runtime/local-agent.ts:267-272` | inline `new Promise` | `await delay(delay, signal)` (rename the local `delay` variable, e.g. `wait`) | The inline copy rejects with `signal.reason \|\| DOMException('Cancelled')`; differs only for a falsy abort reason, and no `abort(<falsy>)` exists in `apps/app/src`. Already-aborted: inline rejects, helper throws synchronously; same result at the `await`. |
| `runtime/local-agent.ts:735` (`clock.sleep` default), `prototype/agent-adapter.ts:140`, `prototype/browser-adapter.ts:138,157,280`, `prototype/canonical-notes-ui.ts:140`, `prototype/voice-adapter.ts:739` | `new Promise(r=>setTimeout(r,n))` | `delay(n)` | identical |
| `runtime/connection-ui.tsx:2705,2930,2941,2976` | 10 ms polling waits | `delay(10)` if kept; helpers.md suggests replacing the loops with a condition wait (T8), which is a separate change | |
| `browser/cloud-connection.ts:111` (dev) | `delay` | `delay(ms, signal)` after checking its rejection value | |
| `runtime/calendar-availability.ts:7` | re-exports upstream `abortablePause` | **leave**: rejects `Error('Aborted')`, not `signal.reason` | |

### `raceAbort(work, signal)` (R7)

Rejects with `signal.reason ?? abortError()`; removes its listener when the race settles.

| file | site | replacement | caveat |
|---|---|---|---|
| `runtime/voice-timing.ts:126-136` | `interrupted` + `Promise.race([work, interrupted])` | `await raceAbort(work, signal)` | original rejects `signal.reason` (always set when aborted here; the timeout aborts with `timeout`) |
| `runtime/workflow-presentation.ts:47-51` | three-way race | `await raceAbort(Promise.race([probes, timerPromise]), signal)` | keep `timer` cleanup in the existing `finally`; order of precedence unchanged |
| `runtime/local-agent.ts:236-245` | `cancelled` + race on `bounded` | `response = await raceAbort(this.bridge.request({...input,timeoutMs:remaining}, bounded), bounded)` | original uses `bounded.reason \|\| DOMException`; same note as `delay`. Keep the `finally` (timer, `attempt.abort()`). |

Left local (the cancel path has side effects or a different rejection value): `runtime/alpha-client.ts:321-376`
(`AlphaClientError`), `runtime/local-agent.ts:282-318` (`connect`, cancels native start),
`runtime/abort-signal.ts` `runProviderConfiguration`, `runtime/native-connection.ts:276-287`, `:297-318` (native
cancel, timer, focus return), `runtime/native-network.ts:5-21` (timeout resolves `undefined`),
`local-speech-playback.ts:19-41` (one shared `interrupted` with dispose), `prototype/voice-adapter.ts:555` (not a race),
`prototype/browser-camera.ts:361` (fixed message plus timeout), `runtime/development-cartesia-conversation.ts:164` (dev).
`withTimeout` was not created: the three timeout-only races (`prototype/agent-adapter.ts:223`,
`prototype/camera-adapter.ts:779`, `browser/audio-capture.ts:115`) have different timeout outcomes; check them in stage
C before adding one.

---

## `lib/error-text.ts` (R20)

### `errorText(error, fallback)`: `error instanceof Error ? error.message : fallback`

Mechanical: every `X instanceof Error ? X.message : <fallback>` (79 sites in ~43 files; find with
`grep -rn "instanceof Error *? *[a-zA-Z_]*\.message" apps/app/src`) → `errorText(X, <fallback>)`. `String(error)` and
template fallbacks work as the second argument (evaluated eagerly; none has side effects). Heaviest files:
`prototype/agent-adapter.ts` (9), `prototype/camera-adapter.ts` (9).

Not this helper (extra condition before `?`): `prototype/voice-adapter.ts:1306`, `prototype/local-speech-playback.ts:101`,
`:219`, `prototype/scan-pdf.ts:23`, `prototype/camera-adapter.ts:1158` (`&&error.message`), `browser/simulated-apps.ts:54`.

### `errorCode(error)`: string `code` or `undefined`

Identical wherever the result is compared with a string literal (`===`/`!==`), which covers:
`local-speech-playback.ts:37,40,57`, `runtime/note-recorder-driver.ts:48`, `runtime/telephony-executor.ts:96`,
`runtime/notes-trash-policy.ts:57`, `runtime/local-agent.ts:315`, `runtime/connection-ui.tsx:1472,3588`,
`prototype/local-speech-playback.ts:206,215`, `prototype/note-recorder.ts:400`, `prototype/voice-adapter.ts:446,576,625,683,824,867,886,946`,
`prototype/photo-library-adapter.ts:145`, `prototype/camera-adapter.ts:868`, `maps/navigation-voice.ts:39`.
Assigned then compared: `prototype/phone-adapter.ts:131`, `prototype/photo-library-adapter.ts:113`,
`prototype/sms-adapter.ts:162`, `prototype/voice-adapter.ts:584` (check each later use is a literal comparison or a
`string` context).

Caveats: sites written without `?.` (`runtime/connection-ui.tsx:336-337`) throw on a thrown `null`; the helper does not.
**Leave local**: `runtime/cloud-voice.ts:174` (copies the raw `code` into a new error, which may be non-string), and
`connection-ui.tsx:1723`, `:1812`, `:3073` (read `code` off a reply/failure object, not a thrown value; they already
guard `typeof === 'object'` and keep `unknown`).

---

## `lib/session-key.ts` (R19)

All three produce exactly the `JSON.stringify([...])` text of the same members in the same order.

### `agentOwnerKey({origin, ownerId, agentId})`

| file | local name | replacement |
|---|---|---|
| `runtime/connection-ui.tsx:1647` | `conversationKey(session)` | `agentOwnerKey(session)` |
| `runtime/workflow-intents.ts:33` | tuple | `agentOwnerKey(owner)` |
| `runtime/hosted-digest-ui.tsx:280` | tuple | `agentOwnerKey(session)` |
| `browser/digest-storage.ts:16` | tuple | `agentOwnerKey(session)` |
| `browser/hosted-results.ts:30` | tuple | `agentOwnerKey(route)` |
| `runtime/connection-ui.tsx:1153`, `:1485` | `[remote.origin|client.origin, session.ownerId, session.agentId]` | `sessionKey(remote.origin, session.ownerId, session.agentId)` (mixed sources; do not build a temporary object) |

Not this helper: `runtime/agent-calendar.ts:14` `calendarOwnerKey` (normalises `origin` through `new URL(...).origin`).

### `agentSessionKey({origin, ownerId, agentId, sessionId})`

`runtime/alpha-client.ts:241`, `runtime/deletion-undo.tsx:10` → `agentSessionKey(session)`.

### `sessionKey(...parts)`

Any other identity tuple `JSON.stringify([a, b, c])` → `sessionKey(a, b, c)`, for example
`runtime/connection-ui.tsx:1195`, `:2223`, `runtime/client-observation-support.ts:18`,
`runtime/agent-calendar.ts:15,16,60,68,73`, `prototype/agent-calendar-adapter.ts:142`, `main.tsx:430`,
`prototype/agent-adapter.ts:443,1429,1694`. Use it only for identity keys; payload serialisation stays
`JSON.stringify`. The deletion owner `'agent:'+JSON.stringify([origin, ownerId, agentId, sessionId, installationId,
enrollmentId])` at `main.tsx:102` and `browser/deletion-recovery.ts:7` is one persisted format owned by
`browser/deletion-recovery.ts`; export a builder from there rather than from `lib/`.

---

## `lib/civil-date.ts` (R17, R18)

### `deviceTimeZone()`: raw `Intl.DateTimeFormat().resolvedOptions().timeZone`

Plain sites → `deviceTimeZone()`: `runtime/calendar-form-draft.ts:28,33`, `runtime/connection-ui.tsx:1999`,
`runtime/device-record-presentation.ts:44`, `runtime/hosted-digest-ui.tsx:107`, `prototype/calendar-adapter.ts:227,302`,
`prototype/calendar-edit-draft-adapter.ts:18,53`, `prototype/calendar-form-draft-adapter.ts:24,66`,
`prototype/clock-adapter.ts:100`, `prototype/reminder-adapter.ts:285`, `prototype/scan-event-review.ts:8`,
`prototype/voice-adapter.ts:635`, `prototype/workflow-authoring.ts:118`, `browser/calendar-agent-review.ts:19`,
`browser/calendar-alerts.ts:7`, `browser/calendar-editor.ts:9`, `browser/calendar.ts:48,103,118,193,200,256,280`,
`browser/development-digests.ts:49` (dev).
With fallback → `deviceTimeZone()||'UTC'`: `runtime/workflow-local-time.ts:26` (`deviceTimeZone` local: delete it,
callers use the import plus `||'UTC'` or keep a one-line local), `prototype/agent-calendar-adapter.ts:118` (`zone`).
`runtime/hosted-digest-ui.tsx:605` keeps its `try/catch` around `deviceTimeZone()`.
`browser/calendar-linked-local.ts:49` **(delete)**.

### `DAY_MS`

Local `const DAY=86400000` → `DAY_MS` in `runtime/agent-calendar-view.ts:5`, `prototype/calendar-form-inputs.ts:2`,
`prototype/agent-calendar-adapter.ts:42`, `prototype/calendar-adapter.ts:17`,
`prototype/calendar-interval-presentation.ts:4`, `browser/calendar-recurrence.ts:5`. Literal `86400000` in day maths
may use it too (57 occurrences; do not touch non-day uses).

### `civilDay(date, utc = false)`

| file | local name | replacement |
|---|---|---|
| `prototype/calendar-adapter.ts:22` | `civilDay(date, utc)` | import (same signature) |
| `prototype/calendar-interval-presentation.ts:5` | `civilDay` | import |
| `prototype/calendar-form-inputs.ts:3` | `civil` | `civilDay` |
| `browser/workflow-calendar.ts:2` | `civil` | `civilDay` |
| `prototype/calendar-edit-draft-adapter.ts:29`, `prototype/calendar-form-draft-adapter.ts:42` | `civil` | `civilDay` (and `civilDayDiff` below) |

### `civilDayDiff(a, b)` = `(civilDay(a) - civilDay(b)) / DAY_MS`

`prototype/calendar-form-draft-adapter.ts:11` (`calendarFormDayShift` body → `civilDayDiff(anchor, today)`), `:43`,
`prototype/calendar-edit-draft-adapter.ts:30` (×2), `prototype/calendar-form-inputs.ts:26`,
`prototype/calendar-interval-presentation.ts:83`. Not for `prototype/calendar-adapter.ts:75,133` (first argument uses
the `utc` flag): write `(civilDay(begin, allDay) - civilDay(today)) / DAY_MS`.

Not this helper: `runtime/agent-calendar-view.ts:6` `civil` (takes `{year, month, day}` with 1-based month),
`browser/calendar.ts:205` (zoned civil day via `Intl`, one site), `browser/calendar-recurrence.ts:21` (a variable),
`browser/workflow-triggers.ts:20` (a `Y-M-D` string), `browser/development-digest-occurrence.ts:34,36` (dev, zoned).
`browser/calendar-time.ts` (`calendarWall`, `civil`, `calendarInstant`) is dependency-free and is the natural content
of `parseCivilDate`/zoned helpers; it merges into `lib/civil-date.ts` in the structural pass (stage F, file move), not
here.
