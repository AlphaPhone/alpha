# apps/app/src/prototype/share-panel-adapter.ts
- Lines: 36 | Role: Wraps `renderVals` so the Browser, Photos, Files and Calendar share buttons open the shared share panel with staleness checks, and registers the "email this" composer for the runtime share module. | Verdict: SIMPLIFY (small)
- Importers: `apps/app/src/main.tsx:43,172`. Text/path pins: `test/share-panel-adapter.test.mjs` and `test/share-panel-watch.test.mjs` (read + strip types + run — T2; one `assert.match`), `specs/quint/application/manifest.json` (1), `test/support/feature-parity.mjs:422`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 23, 29 | A7 | `emailUnavailable` option: `bind` accepts `emailUnavailable?:null`, callers pass `emailUnavailable:null`, but L23 hard-codes `emailUnavailable:null`; and `runtime/share-panel.ts` declares `emailUnavailable?:string|null` in `SharePanelOptions` but never reads it (only occurrence is the type). | Delete the option here (3 places) and from `SharePanelOptions` in `runtime/share-panel.ts:1` (cross-file). | None |
| 2 | 12, 32 | C3 | Compose-email-in-Inbox call `api.open('inbox',{compose:{subject:…,body:…}})` written twice. | Local `composeEmail(api, snapshot)`. | None |
| 3 | 3, 7, 9 | C1 / P6 | `type Bag`, `Component:any`, `views:Record<string,Bag>` (only `views.inbox` existence is read), module `owner` capture. | Shared shell types; pass `hasInbox:boolean` instead of `views`. | None |
| 4 | 17, 26 | B2 | `typeof external!=='function'`, `typeof view.shareEmail==='function'?…` — legitimately optional per view state; keep. | Keep. | — |
| 5 | 8-13 | B2 | `mount.call`/`unmount.call` direct — fine. | — | — |
| 6 | 30 | D9 | `calendarText` module variable compares the rendered text against the click-time text — a second staleness mechanism beside `unchangedSince`. | Keep (documented reason: calendar revision stripped); fine. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 3 | ~50 files | `prototype/shell-types.ts` |
| `shareContent` | helper | 5 | — | stays |

## Proposed end state
~33 lines: no `emailUnavailable`, one compose helper, typed shell.

## Verification
`test/share-panel-adapter.test.mjs`, `test/share-panel-watch.test.mjs`, Quint application manifest entry, Playwright share journeys; `npm run verify`.
