# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaFilesPlugin.java
- Lines: 234 | Role: Capacitor `AlphaFiles` bridge for the Files browser over shared storage (list, category/query, transfer, rename, trash/restore/empty, share, open/select, watch) on top of upstream `StorageBrowser`/`StorageCatalog`. | Verdict: SIMPLIFY
- Importers: `MainActivity.java:341`; renderer `apps/app/src/browser/files.ts` and `apps/app/src/startup-permissions.tsx`, upstream `.eliza/client-features/plugins/plugin-files/src/browser/{storage-volume.ts,files-browser-adapter.ts}` — every `storage*` method has a renderer caller (checked each of the 18 names). Text/path pins: `test/files-browser.test.mjs:245,259,269,284,343,379` (regex on source, e.g. `/b\.emptyTrash\(strings\(call,"ids",StorageBrowser\.BATCH_MAX\)\)/`), `test/files-legacy-storage.test.mjs:11`, `test/files-storage-refusal.test.mjs:10` + `test/fixtures/FilesStorageRefusalTest.java` (executes the storage/denial methods), `test/native-plugin-teardown.test.mjs:272,283`, `test/plugin-worker-guard.test.mjs:23` (`AlphaFilesPlugin:['worker','storageWorker']` — `worker` no longer exists), `test/browser/flag-off-android.ts:260`, `test/support/feature-parity.mjs:60`, `specs/quint/application/manifest.json:960`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-18, 21-29 | A1 | `/** Preference used by earlier installs to record their selected SAF folder. */ static final String PREF="alpha-files-tree";` and `load()` submitting `releaseRetiredTree` on every start. `git grep alpha-files-tree`: only this line; no writer exists in the repo. The new package (renamed 2026-11-10) cannot hold an old install's grant. | Delete `PREF`, `load()`, `releaseRetiredTree()` (9 lines) and the sentence "A retired SAF folder grant is released on load" from the Javadoc. Remove the `DocumentFolderTree` import if `result()` moves (see 3). | Low; owner P5 decision covers it (only early new-package builds could have the preference). |
| 2 | 56-72 | C3 | Two JSON-array-of-strings readers: `strings(call,key,max)` (rejects duplicates, coerces via `optString`) and `reviewedTokens(call)` (optional, `instanceof String`, no duplicate check). | One `stringArray(call,key,max,boolean optional,boolean unique)`; keep each call site's current semantics via the flags. | Low; refusal tests (`FilesStorageRefusalTest`) cover invalid input. |
| 3 | 89, 104, 107 | C3 | `JSObject out=new JSObject();out.put("status","ready");out.put("access",StorageCatalog.access(getContext()));` built three times; `storageState` (81) a fourth variant. | `private JSObject accessState()`. | none |
| 4 | 36-38 | C1, P10 | Local `interface StorageWork {JSObject run(StorageBrowser)}`; per-plugin worker wrapper `storage(call,task,failed)`. | Keep the storage-specific exception→status mapping (46-50 is the specified product copy); move only the executor/refusal plumbing to the shared base helper when it exists. | low |
| 5 | 201-205 | C3 | `startOnUi`: latch + `boolean[]` holder to run on the UI thread and wait 5 s. Same mechanism as `AlphaHostedResultsPlugin.sourceForeground` (lines 35-39). | Shared `MainThread.await(activity, Callable<Boolean>, 5s)` util. | low |
| 6 | 127 | P8 | `filesReviewVisible()` = `activity!=null&&activity.hasWindowFocus()` — a sixth foreground variant (no keyguard check). | Use `OwnerSurface.check(activity, true)` once it exists; confirm whether Files intentionally skips the lock check. | Medium (behaviour) — owner check. |
| 7 | 32-35 | D8 | Fields declared mid-class after methods (`// ---- Storage browser ---- ` banner left from a removed SAF section). | Move fields to the top; drop the banner. | none |
| 8 | 228 | D8 | Comment sits between `return new JSObject();` and `},()->watch.fail(ticket));}` — reads as dead code. | Move it above `storageWatch`. | none |
| 9 | 53 | B1 | `catch(RuntimeException ignored){/* Resources attempted all cleanup... */}` — documented, the refusal must still answer. | Keep. | — |
| 10 | 233 | — | `handleOnDestroy` does not call `super.handleOnDestroy()` while the other plugins in this chunk do. | Add `super.handleOnDestroy()` for consistency (Capacitor base is a no-op today). | none |
| 11 | 77, 118, 172, 176, 186, 196, 212 | D8 | `java.io.File`, `android.os.Environment`, `android.media.MediaScannerConnection` fully qualified inline. | Import. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `StorageWork` | interface | 36 | `AlphaGmailPlugin.Work`, `AlphaDeletionsPlugin.Task`, `AlphaLocalAgentPlugin.ProviderChange` | base-plugin background helper |
| `strings` / `reviewedTokens` | helper | 56-72 | each other | one `stringArray` here |
| `startOnUi` | helper | 201-205 | `AlphaHostedResultsPlugin.sourceForeground` latch | `MainThread` util |
| `filesReviewVisible` | helper | 127 | P8 foreground family | `OwnerSurface` |
| `PREF` | const | 22 | none (no writer) | delete |

## Proposed end state
~215 lines: no retired-tree cleanup, one string-array reader, `accessState()`, fields at top, UI-thread helper shared. All `storage*` methods, the exception→status mapping, MediaStore scans and the watch slot stay unchanged.

## Verification
`test/files-storage-refusal.test.mjs` (runs real methods), `test/files-browser.test.mjs` and `test/files-legacy-storage.test.mjs` (source regex — update or drop per T1), fix the stale `worker` entry in `test/plugin-worker-guard.test.mjs:23`, Files Playwright journeys (`flag-off-android.ts`), Android build, emulator run of Files with all-files access.
