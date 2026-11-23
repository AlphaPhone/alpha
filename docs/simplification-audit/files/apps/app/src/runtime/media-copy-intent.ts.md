# apps/app/src/runtime/media-copy-intent.ts
- Lines: 29 | Role: a single durable "pending saved-copy" token for Photos (prevents a second copy while one is unresolved): plain `localStorage` on Android, a `BrowserDomainDocument` with CAS on web. | Verdict: SIMPLIFY
- Importers: 1 (`prototype/camera-adapter.ts`). Text/path pins: `scripts/storage-specs.ts` (key), `specs/quint/application/manifest.json:530,7239-7259`, `specs/quint/refinement/application/media-copy-intent.mjs:1,6`, `test/browser/media-copy-intent-storage.spec.ts:5-31`, `test/browser/browser-photo-edit.spec.ts:54,56,132`, `test/browser/video-edit.spec.ts:32,35`, `test/quint-media-copy-intent.test.mjs:13`, `test/support/feature-parity.mjs:556`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | A1 | `new BrowserDomainDocument(browserDocuments, mediaCopyIntentKey, ()=>{const raw=localStorage.getItem(mediaCopyIntentKey);return raw===null?null:JSON.stringify({raw});})` — the third argument imports a pre-document `localStorage` value on first read (legacy seed). On web the key is never written to `localStorage` any more (only the Android branch writes it). | Pass `()=>null` (or drop the parameter when `BrowserDomainDocument` loses its legacy argument, see native-assistant-draft-recovery report). | Low; web dev data only. Coordinate with `browser/domain-document.ts`. |
| 2 | 13, 17, 22, 27 | C6 / B2 | `Capacitor.getPlatform()==='android'` four times; `isAndroid` exists in `../native`. | Import `isAndroid`. | None. |
| 3 | 23 | B3 | Android branch writes `localStorage` and then reads it back to confirm (`if(localStorage.getItem(key)!==archive.raw)throw`) — check-act-check on a synchronous store. | Drop the read-back; let `setItem` throw on quota. | Low. |
| 4 | 8 | B3 / D8 | 330-char `decode` validator over the stored `{raw, revision}` archive. Storage is a trust boundary, so validation is allowed; the shape check `Object.keys(value).some(key=>!['raw','revision'].includes(key))` is stricter than needed. | Keep the token/revision regex checks; split into named lines. | Low; the persisted `{raw,revision}` format stays byte-identical. |
| 5 | 3 | A7 | `mediaCopyIntentKey` exported, no src importer (tests and `scripts/storage-specs.ts` read it). | Keep if `scripts/storage-specs.ts` is the storage-key registry; otherwise unexport. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Archive` | type | 5 | `browser/domain-document.ts` `Envelope` `{version:1,legacy,value}` | stays |
| `decode` | helper | 7-10 | — | stays |
| `document` (lazy) | const | 11 | other lazily created `BrowserDomainDocument`s (C4 family) | stays |

## Proposed end state
~25 lines: `isAndroid`, no legacy seed, no read-back, readable decoder. Key `alpha.photos.pending-copy.v1` and the archive shape unchanged.

## Verification
Quint `media-copy-intent` refinement and `test/quint-media-copy-intent.test.mjs`; `test/browser/media-copy-intent-storage.spec.ts` — lines 21 and 27-29 seed `localStorage.setItem(key,'legacy-copy')` / malformed bytes and expect them to be read through the legacy seed; delete those two cases with the seed, photo/video edit journeys.
