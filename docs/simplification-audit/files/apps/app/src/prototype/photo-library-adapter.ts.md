# apps/app/src/prototype/photo-library-adapter.ts
- Lines: 187 | Role: Photos agent bridge over the native `AlphaPhotoLibrary` plugin: identity-only reads, one pending owner review (favourite/trash/restore/share) over the main Library host, and a module-level "mounted agent" for agent-adapter. | Verdict: SIMPLIFY (small); MOVE to `prototype/views/photos/` (or `runtime/`) with camera-adapter's Photos split
- Importers: 2 — `camera-adapter.ts` (`createDeviceLibrary`, `setMainLibraryHost`, `LibraryAgentRefusal`, `HostOperation`), `agent-adapter.ts` (`deviceLibraryAgent`, `LibraryAgentRefusal`). Test: `test/fixtures/photo-library-adapter.mjs` (real import under Node via tsx).
- Text/path pins: `test/photo-library.test.mjs:15,170-172,217,235-236` slices the source between `'async function confirmReview'` and `'const visibleHost'`, and between `'const agent: LibraryAgent'` and `'mountedAgent = agent;'`, counts `port\.(share|requestChange)\(` == 2, asserts no `'device'|tile(|album(` and no `watch(|addListener(`; `specs/quint/application/manifest.json:7403-7431` symbols `createDeviceLibrary, confirmReview, validCurrent, reviewCard, LibraryAgentRefusal, reviewOpen, requestChange`; `specs/quint/legacy/manifest.json:967`, `specs/quint/native/manifest.json:442`, `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs:20`; `test/support/feature-parity.mjs:21,36,407`; browser specs `photo-agent-review-leave`, `browser-photo-edit`, `notes-photos-list-focus`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | A7 | `type Bag = Record<string, any>;` — declared, never used (only occurrence in file). | Delete. | None. |
| 2 | 27, 33 | A7 | `export function describeLibraryChange` and `export const deviceLibraryAvailable` — no importer outside this file (grep: only this file). | Drop `export`. | None. |
| 3 | 34 | B1 / B2 | `revisionSession` wraps `crypto.getRandomValues` in `try{…}catch{return Date.now().toString(36)…}` — `crypto.getRandomValues` always exists in the WebView and in Node ≥19 used by the fixture. | `const revisionSession=()=>crypto.randomUUID().replace(/-/g,'').slice(0,12);` | None. |
| 4 | 87, 185 | B2 / D7 | `if (typeof document !== 'undefined') document.addEventListener(…)` exists only because `test/fixtures/photo-library-adapter.mjs` imports the module in Node without a DOM. | Keep while that fixture exists; when T3 retires the Node fixture (or it supplies a minimal `document`), call `document.addEventListener` directly. | Low. |
| 5 | 71-72 | B1 | `readScope` swallows every bridge error: `catch { return undefined; }`, which then surfaces as "Alpha is not allowed to read the photo library" (line 134) — wrong reason for a bridge failure. | Let errors propagate from `readScope`; only `undefined` when `!available()` or stale epoch. The agent executor already reports thrown errors as failed actions. | Low; check `photo-library.test.mjs` expectations for a throwing `scope()`. |
| 6 | 94 | B1 | `try { current = await validCurrent(...) } catch { current = false; }` — the fallback (treat as changed) is the specified behaviour; keep but add a one-line reason. | Comment only. | None. |
| 7 | 113, 145 | C3 | `(failure as { code?: string })?.code` twice; same Capacitor error-code read appears across adapters. | Local `const codeOf=(e:unknown)=>(e as {code?:string})?.code;` (or a shared `runtime/plugin-error.ts`). | None. |
| 8 | 123, 151, 161, 169 | C5 | `acting || review || host.reviewOpen()` + `'Finish the open review first.'` three times. | `const busy=(host:MainLibraryHost)=>acting||!!review||host.reviewOpen();` and one `refuseBusy()`. Keep `'const agent: LibraryAgent'`…`'mountedAgent = agent;'` text intact (test slices). | Low (pinned slices). |
| 9 | 15, 76 | C1 | `{ id: string; revision: string }[]` written twice; `Items` type exists at 15. | Use `Items['items']` at 76. | None. |
| 10 | 43-45, 60-61 | D3 | Two module-level singletons (`mountedAgent`, `mainHost`) used as a service locator between camera-adapter and agent-adapter. | Keep for now (documented); fold into the typed shell state when D3 lands. | — |
| 11 | 1-5 | A8 | Header names "issue 408, policy P-24"; line 127 "(issue 408)". | Drop the issue reference, keep the policy sentence. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 14 | 45+ copies (C1) | delete (unused) |
| `Items` | type | 15 | — | here |
| `PhotoLibraryPort` | type | 16-23 | `test/fixtures/photo-library-adapter.mjs` fakePort shape | here (C2: one typed module per plugin) |
| `LibraryAgent` | type | 38-42 | — | here |
| `MainLibraryHost`, `HostOperation` | type | 49-59 | camera-adapter implements | here |
| `revisionSession` | helper | 34 | random-id helpers across renderer | `crypto.randomUUID()` |
| `codeOf` (proposed) | helper | 113, 145 | `selection-adapter.ts:148` `error?.code`, many adapters | `runtime/plugin-error.ts` |

## Proposed end state
Same structure, ~170 lines: unused `Bag` and exports removed, `revisionSession` one line, `readScope` propagates bridge errors, one busy predicate, a shared error-code reader. Later moves with Photos code out of `camera-adapter.ts` into a Photos folder.

## Verification
`node --test test/photo-library.test.mjs` (runs the Node fixture), `npm run test:browser -- photo-agent-review-leave browser-photo-edit notes-photos-list-focus`, Quint `specs/quint/application` photos-library replay (symbols listed above must keep their names).
