# apps/app/src/browser/workflow-notices.ts
- Lines: 71 | Role: product (web) store of workflow notifications the agent posts in the browser: publish, list for the shade/Inbox, act (open/dismiss), compact into digests, receipt lookup | Verdict: SIMPLIFY
- Importers: 5 — `browser/notifications.ts:6` (list/act), `prototype/agent-adapter.ts:53,1146` (product `post_notification` effect), `runtime/local-agent-storage.ts:32` (dynamic, receipt), `browser/simulated-workflows.ts:15`, `browser/workflow-history.ts:2`. **Not dev-only.** Persisted: document `alpha.browser.workflow-notices.v1` `{rows,archived?}` with `Row`/`Receipt` shapes — keep exactly. Text/path pins: 13 browser specs import `/src/browser/workflow-notices.ts` (`workflow-notices.spec.ts`, `workflow-notice-history.spec.ts`, `workflow-notice-lifecycle.spec.ts`, `workflow-notification-recovery.spec.ts`, `browser-foreground.spec.ts`, `dev-workflow-*.spec.ts`, `workflow-presentation-execution.spec.ts`); `dev-workflow-history.spec.ts:13` reads the localStorage key; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 24, 29, 65 (history), 70 | A1 | Legacy envelope: `new BrowserDomainDocument(browserDocuments,key,()=>localStorage.getItem(key))`; `recovery.format!=='domain'||recovery.legacyChanged`; `current.legacy!==expected.legacy||current.legacyChanged`; "Download both saved copies" copy | Remove legacy reader and every `legacy*` comparison with the envelope (research P2) | owner sign-off; recovery specs |
| 2 | 8-9, 37 | C4 / B2 | Observable-document facade copy: `typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('alpha.browser.documents.v1')`, key filter, `changed()` broadcast — 8th copy (calendar-store, reminder-store, preference-documents, notification-store, hosted-results, digest-authorization-document, development-account-document) | `observedDocument(key,{event})` generalised from `preference-documents.ts`; BroadcastChannel exists in every target WebView | medium: `changed()` signals by dispatching `window 'focus'` (D3 — consumers listen on `focus`); keep that event or migrate listeners together |
| 3 | 13 | C3 | `digest` SHA-256 hex — same as `workflow-trigger-runtime.ts:15`, `deletions.ts:20`, `calendar.ts:50,242`, `hosted-results.ts:15` (+19 in src) | shared `sha256Hex(JSON.stringify(text))` beside `revision.ts` | none: keep the `JSON.stringify(text)` input so stored digests still match |
| 4 | 36 | C3 / P5 | `blocked=()=>document.hidden||…devBackground==='true'||!!browserScreenLocked()` is exactly `notice-action.ts:2 noticeActionBlocked` | import `noticeActionBlocked` | none |
| 5 | 51-61 | C3 | `actOnWorkflowNotice` re-implements `beginNoticeAction()` (`notice-action.ts:4-9`, same six events, same capture flag) | `const {signal,dispose}=beginNoticeAction()` | low (beginNoticeAction also calls `hidden()` immediately — equivalent since edit checks `blocked()`) |
| 6 | 16, 18, 22 | B3 | One validator `validate(state)` with 15+ `||` clauses, re-run on every edit callback (42, 56) and on read (24, 49) | Keep it at read (`workflowNoticeHistory`/`listWorkflowNotices`) where the document crosses the storage boundary; edits trust the read value | low |
| 7 | 39-40, 66 | B3 | `typeof title!=='string'` on a typed parameter; id regex re-checked in publish and receipt | drop the `typeof`; keep length/regex (input from agent operations) | none |
| 8 | 25 | A7 / D7 | `savedWorkflowNoticeHistory` — no `apps/` caller (grep: definition only); used by 3 browser specs via page.evaluate | delete; specs read `workflowNoticesDocument.capture()` | low |
| 9 | 24, 26-35 | D8 | `workflowNoticeHistory` one 420-char line | format | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Row`, `Receipt`, `State` | type | 5, 10-11 | none | keep (persisted shape) |
| `digest` | helper | 13 | ~25 SHA-256 hex sites | `sha256Hex` in `browser/revision.ts` |
| `blocked` | helper | 36 | `notice-action.ts:2`, `notifications.ts:21`, `hosted-results.ts:17` | `noticeActionBlocked` |
| `channel`/`changed` | facade | 8-9, 37 | 8 document facades | `observedDocument()` |

## Proposed end state
~55 lines: store via `observedDocument`, one validator at read, `noticeActionBlocked`/`beginNoticeAction`/`sha256Hex` imported, no legacy comparisons, no test-only export. Persisted key/shape and all copy unchanged.

## Verification
All 13 specs listed above, especially `workflow-notices.spec.ts`, `workflow-notification-recovery.spec.ts`, `browser-foreground.spec.ts`; agent `post_notification` path via `workflow-presentation-execution.spec.ts`; `npm run verify`.
