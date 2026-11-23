# apps/app/src/runtime/native-connection.ts
- Lines: 326 | Role: AlphaConnection bridge: browser IndexedDB+AES-GCM secret vault, browser managed-HTTPS connection port, Cloud sign-in port selection, secure slot store, Cloud/remote credential stores, native request and external-browser open. | Verdict: SPLIT (+ delete test-only and legacy parts)
- Importers: 18 app files (`browser/register.ts:3` must stay first, `connection-ui.tsx:76`, `agent-adapter.ts:67`, `notes-folders.ts`, `notes-trash.ts`, `note-audio-deletions.ts`, `reminder-journal-store.ts`, `service-read-cache-store.ts`, `inbox-local-store.ts`, `assistant-draft-store.ts`, …) + `scripts/test-cloud-delegation.ts:20`, `scripts/test-inbox-saved-drafts.ts:11`.
- Text/path pins: 34 test/spec files. Source-slicing (T2): `test/connection-step-contracts.test.mjs:88` (slices between `'export function memorySecretBackend()'` and `'const SECRET_DATABASE'`), `test/managed-service-routes.test.mjs:36` (slices `'export function createBrowserConnection('`), `test/native-connection-headers.test.mjs:14` (runs whole stripped source), `test/native-secure-slots.test.mjs`, `test/connection-browser-return.test.mjs`, `test/native-google-port-capability.test.mjs`. Browser specs import it by path (`browser-credential-cas`, `browser-secret-retirement`, …). `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-67, 125-138 | A7/D7 | `memorySecretBackend` and `durableSecretsWithFallback` are never called in this file or any product file (git grep: only definitions + `test/connection-step-contracts.test.mjs:88-103`). The "private windows" fallback described at L125-129 is not wired into `webSecrets()`. | Delete both (~22 lines) and the T2 test block. | Low (behaviour already absent) |
| 2 | 47-154 | D1/D11 | Browser secret vault lives in a file named "native". | Move `BrowserSecretBackend`, `idb`, `indexedDbSecretBackend`, `webSecrets`, `SECRET_DATABASE` to `browser/secret-store.ts`. DB name `alpha-connection-secrets.v1`, store names `keys`/`slots`, key id `aes` and AAD=slot are installed identity: keep byte-for-byte. | Medium (T2 tests slice by marker) |
| 3 | 155-210 | D1/D11 | `createBrowserConnection` (web AlphaConnection) in the same file. | Move to `browser/connection.ts`; `browser/register.ts` keeps importing first. | Medium (registration order) |
| 4 | 14, 18, 25, 217 | C3 | four `(Capacitor as typeof Capacitor&{PluginHeaders?:…}).PluginHeaders?.some(...)` casts (+`native.ts:21`, `main.tsx:369`). | `pluginHeader(name)` / `pluginHasMethod(name,m)` in `platform-plugins.ts`. | Low |
| 5 | 19-24 | A8/D8 | Two stacked doc comments; the first ("In-app Eliza Cloud sign-in host… Undefined where this build has no sign-in") describes `cloudSignIn` at L29, not `cloudSignInGoogle`. | Move it above L29. | None |
| 6 | 32-36, 218-221 | B2 | Optional bridge members `prepareGoogleWorkspaceReturn?`, `consumeGoogleWorkspaceReturn?`, `cancelGoogleWorkspaceReturn?`, `addListener?` and fallbacks `native.x?native.x(b):{supported:false}`. L27-28 itself notes Capacitor synthesizes functions, and the port is created only after `nativeGoogleWorkspaceReturnAvailable(PluginHeaders)`. | Make the members required; delete the four fallback branches. | Low |
| 7 | 17, 217 vs 15, 214, 263 | C3/P8 | `Capacitor.getPlatform()==='android'` and `isNativePlatform()` mixed for the same question. | `isAndroid` from `native.ts`. | Low |
| 8 | 156 | D7 | `import.meta.env!==undefined&&…` shim so Node tests can import. | Use `testMocksEnabled` from `build-flags.ts` (already imported, L8). | Low (T2 tests) |
| 9 | 168, 236-239 | C3 | two promise-serial queues (`serialSlot`, `serial`) + `service-read-cache.ts:38` `enqueue`. | One `serialQueue()` in `lib/`. | Low |
| 10 | 172, 199 | B3 | re-validating `requestId` and `value` types of typed in-process callers. Kept only where the port mirrors the Android plugin contract. | Drop the `typeof` checks; keep length/duplicate checks. | Low |
| 11 | 243-245 | A1 | `read` migrates on read: `if(value&&!value.credentialId){value.credentialId=crypto.randomUUID();await …write(...)}` — only records written by an older build lack `credentialId` (`write` always sets it, L249). | Delete the migration (owner: no shipped build without credentialId). | Medium |
| 12 | 256-266 | A1 | `removeStoredCloudCredential` "removes the Cloud key an earlier build stored" (caller `connection-ui.tsx:2635`, fire-and-forget). | Delete with its caller after owner confirms no shipped web build stored Cloud keys. | Medium |
| 13 | 267-271, 289-293 | A3 | `remoteCredentialStore`, `nativeRemoteRequest` serve only `connectRemote` (`connection-ui.tsx:1138` throws unless `testMocksEnabled`). | Move with RemoteProtocol to the dev/test-mocks module, or delete with remote pairing. | Medium (scripts/test-connection-history.ts) |
| 14 | 276-287, 297-301 | C3 | `let rejectAbort…;const interrupted=new Promise<never>(…)` abort race written twice (also `voice-timing.ts`, `workflow-presentation.ts`, `native-network.ts`). | `raceAbort(work,signal)` in `lib/abort.ts`. | Low |
| 15 | 278, 281, 300 | B1 | `void native.cancel({requestId}).catch(()=>{})`. | Keep (cancel is best-effort) with one shared comment/helper `bestEffortCancel`. | None |
| 16 | 56-59 | A7 | `browserConnectionSlot` exported, no external user (0 src, 0 tests). | Unexport. | None |
| 17 | 32, 49 | A7 | `ConnectionPort`, `BrowserSecretBackend` exported, no external user. | Unexport (or export from the new homes). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ConnectionPort` | interface | 32-46 | `android/.../AlphaConnectionPlugin.java` methods (contract) | `native/plugins.ts` (AlphaConnection) |
| `BrowserSecretBackend` | interface | 49-53 | — | `browser/secret-store.ts` |
| `idb` | helper | 69 | IndexedDB promisifiers in `browser/json-domain-document.ts`/`browser/domain-document.ts` (check) | `browser/idb.ts` |
| `serialSlot`, `serial` | helper | 168, 237 | `service-read-cache.ts:38` `enqueue` | `lib/serial-queue.ts` |
| abort race (`rejectAbort`/`interrupted`) | helper | 276-287, 297-301 | `voice-timing.ts:126`, `workflow-presentation.ts:47`, `local-speech-playback.ts:19`, `native-network.ts:5` | `lib/abort.ts` `raceAbort` |
| PluginHeaders casts | helper | 14,18,25,217 | `native.ts:21`, `main.tsx:369` | `platform-plugins.ts` |
| `'cloud:'+environment` slot literal | const | 243-254 | Java `"cloud:production"` 32× | `cloudSlot(env)` beside `cloudStorageSlot` |

## Proposed end state
`runtime/native-connection.ts` (~120 lines): plugin registration (web factory imported from `browser/connection.ts`), sign-in port selection with `pluginHeader()`, `googleWorkspaceReturnPort` without optional fallbacks, `secureConnectionStore`, `cloudCredentialStore` (no migrate-on-read), `nativeCloudRequest` and `openConnectionBrowser` on `raceAbort`. `browser/secret-store.ts` (~75 lines, no memory/fallback backends) and `browser/connection.ts` (~55 lines). Remote credential/request move with RemoteProtocol to dev. Net ≈ -45 lines, file 326 → ~120.

## Verification
`test/browser/browser-credential-cas.spec.ts`, `browser-secret-retirement.spec.ts`, `browser-cloud-bootstrap.spec.ts`, `connection-preference-storage.spec.ts`; host tests `native-connection-headers`, `managed-service-routes`, `connection-step-contracts`, `native-secure-slots`, `native-google-port-capability`, `cloud-resident-authority` (T2 ones must be rewritten or deleted together); `scripts/test-cloud-delegation.ts`; `npm run verify`; Android build (AlphaConnection contract unchanged).
