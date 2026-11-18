# apps/app/src/prototype/phone-adapter.ts
- Lines: 240 | Role: the Phone view on the verified AOSP image: recents, keypad, voicemail list/playback/transcription/delete, contact-name matching; replaces `views.phone.render` entirely; also exposes the open voicemail to the agent | Verdict: SIMPLIFY (and SPLIT the voicemail audio helpers out)
- Importers: `main.tsx:23,132` (Android only), `agent-adapter.ts:28` (`openVoicemailRead/Selection`, `deleteOpenVoicemail`), `runtime/voicemail-transcription.ts:8` (`setVoicemailTranscriber`), `runtime/aosp-image.ts` (comment/reference).
  Text/path pins: `test/phone-adapter.test.mjs` bundles it and imports `installPhoneAdapter, phoneRows, openVoicemailRead, deleteOpenVoicemail`; `specs/quint/refinement/services/phone-session-replay.mjs:21` (sourceModule); `specs/quint/application/manifest.json:8414-8440` and `specs/quint/services/manifest.json:3317` pin `async function call`, `async function refresh`, `available`, `clear`, `dialing`, `epoch`, `needsAccess`, `reading`, `session`, `sync`, `installPhoneAdapter`, `phoneRows` (T10 — renames break them); `specs/quint/native/manifest.json`; `test/quint-phone-recents.test.mjs`; `test/support/feature-parity.mjs:405`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-17, 216 | A7 | `phoneRows`/`CALL_TYPE` build `nativeRows`, which **no template binds** (grep `nativeRows` in `template.html`: 0; the template uses `recents` from `callRow`, line 221). `phoneRows` is kept alive by `test/phone-adapter.test.mjs:136` and the services manifest pin. Also `formatDateTime` import exists only for it. | Delete `CALL_TYPE`, `phoneRows`, `nativeRows` and the `formatDateTime` import (~7 lines); delete the test case and manifest entry. | Low; manifest update required. |
| 2 | 215, 219 | A7 | Output fields `nativeStatusDot` and `nativeContacts` have no template binding (grep: 0 hits in `template.html`; `nativeStatusDot` is bound nowhere, `nativeContacts` nowhere). `nativePrototype:false` **is** bound (`template.html:222`) — keep it. | Delete `nativeStatusDot` and `nativeContacts`. | Low. |
| 3 | 198-200 | A6 | `views.phone.reply=()=>null; views.phone.suggestions=()=>[]; views.phone.status=()=>undefined;` — undo layer; `reply` is already replaced globally (`agent-adapter.ts:1939`, research P7). | Delete `reply`; remove the phone fixture `suggestions/status` hooks from `model.js` at the source, then delete these lines. | Low. |
| 4 | 41-42 | C3 | `bytesOf` (base64→bytes) and `base64Of` (chunked `String.fromCharCode` → `btoa`); twins `note-source-adapter.ts:90`, `runtime/native-recovery-backup.ts:12`, `browser/mail-attachments.ts:45`. | Shared `base64ToBytes/bytesToBase64` in `lib/`. | None. |
| 5 | 36, 43-53 | D11/D6 | `wavWindows` — pure RIFF/WAV splitter (byte-level) inside a view adapter; exported but only used here (grep). | Move to `runtime/wav.ts` (with `WINDOW_SECONDS/RATE`), unexport from the adapter; testable directly. | None. |
| 6 | 23-25, 29-34 | D3 | Module-level singletons `transcriber`, `openReader`, `openSelection`, `openDeleter` set by the installer and read by `agent-adapter.ts`/`runtime/voicemail-transcription.ts` — a service locator. | Return a `PhoneSession` object from `installPhoneAdapter` and pass it to the agent adapter; `setVoicemailTranscriber` becomes an install option. | Medium: Quint replays import module exports. |
| 7 | 37-40, 212, 221, 231 | D12 | SVG path data literals for tab icons, call arrows and play/pause (`TAB_ICON`, `ARROW`, `'M9 6v12M15 6v12'`). Research P16: icons by name. | Use the lucide icon names the rest of the renderer uses. | Low (visual). |
| 8 | 65-66, 237-239 | D2/D3 | Patches `componentDidMount/DidUpdate/WillUnmount`; `owner` module-level shell capture (research P6); `this.phoneReturn`, `this.phoneHide` instance fields. | Hook registry; per-shell state. | — |
| 9 | 204, 206, 211, 219, 235, 237-239 | B2 | `viewApi.set?.(…)`, `viewApi.open?.(…)`, `viewApi.toast?.(…)`, `mount?.call`, `update?.apply`, `unmount?.call` on members that always exist; `typeof Audio!=='undefined'` (161) in browser/WebView-only code; `client!` non-null assertions 15× after `if(!client)return`. | Call directly; capture `const phone=client` after the guard to drop `!`. | None. |
| 10 | 103, 168 | B1 | `.catch(()=>{})` on contacts search and `markVoicemailHeard` — best effort; comment why. | Keep with comment. | — |
| 11 | 66-72 | D9/D8 | 20 mutable closure variables declared on 3 lines; render function is a 35-line object literal (215-236). | Group state into `recents`, `keypad`, `voicemail` sub-objects; split render into three builders. Keep Quint-pinned names (`reading`, `dialing`, `session`, `epoch`, `needsAccess`, `call`, `refresh`, `available`, `clear`, `sync`) or update the manifests. | Medium (manifest pins). |
| 12 | 10-11 | C1 | `type Bag`; local `Voicemail` record type duplicates the shape returned by `AospTelephony.listVoicemail` in the contracts package. | Import the contract type. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 10 | 60× | shared types |
| `Voicemail` | type | 11 | contract voicemail entry type (`.eliza/client-features/packages/contracts/src/native-telephony.ts`) | import contract type |
| `CALL_TYPE` | const | 12 | call-kind labels in `telephony-presenters.ts callRow` | delete (#1) |
| `VoicemailTranscriber`, `OpenVoicemailRead`, `DeleteResult` | type | 23, 27-28 | `DeleteResult` mirrors `runtime/telephony-executor.ts:47` union | export once from telephony-executor |
| `KEYS` | const | 37 | none | stays |
| `bytesOf`, `base64Of` | helper | 41-42 | `note-source-adapter.ts:90`, `runtime/native-recovery-backup.ts:12`, `browser/mail-attachments.ts:45` | `lib/base64.ts` |
| `wavWindows` | helper | 44-53 | none | `runtime/wav.ts` |

## Proposed end state
~195 lines: phone view (recents, keypad, voicemail) with grouped state, typed contract types, shared base64 helpers, WAV splitting in `runtime/wav.ts`, no `nativeRows/phoneRows`, no undo-layer hooks, a returned session object instead of module singletons.

## Verification
`node --test test/phone-adapter.test.mjs test/quint-phone-recents.test.mjs`, Quint phone-session replay and application/services/native manifests, Android build, emulator HOME-role test on the AOSP image path (device acceptance separate), feature-parity test.
