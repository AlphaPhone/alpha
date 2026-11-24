# apps/app/src/runtime/deletions.ts
- Lines: 64 | Role: typed `AlphaDeletions` native bridge, view-refresh event fan-out, reminder refusal wrapper, and the Undo-notice polling policy. | Verdict: SIMPLIFY
- Importers: 6 product (`browser/register.ts`, `prototype/agent-adapter.ts`, `prototype/calendar-adapter.ts`, `prototype/reminder-adapter.ts`, `runtime/deletion-undo.tsx`, `runtime/local-agent-storage.ts`). Text/path pins: `specs/quint/native/manifest.json`, `test/deletion-notice-policy.test.mjs`, `test/native-deletion-admission.test.mjs` (source text), `test/shared-deletion-window.test.mjs`, three `test/browser/*assistant.spec.ts`, `test/support/feature-parity.mjs`; Quint fixtures `calendar-adapter-fixture.mjs`, `reminder-adapter-fixture.mjs` reference `refreshDeletionViews`/`reminderDeletionRefusal`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-64 | D10 | `createDeletionNoticePolicy` (42 lines) has one product caller, `deletion-undo.tsx`. | Move it to `deletion-undo.tsx` (see that report). | Low |
| 2 | 5 | A7 | `export type DeletionEntry`: 0 references outside this file. | Make local. | None |
| 3 | 8 | D8 | `receipt(input:{entry:import("./device-actions").JournalEntry})` inline import type in a long one-line interface literal. | Top-level `import type {JournalEntry} from './device-actions'`; declare `interface AlphaDeletionsBridge` over 6 lines. | None |
| 4 | 10 | — | `undo(...):Promise<{phase?:string}|unknown>` is just `Promise<unknown>`. | Write `Promise<unknown>` (or the shared type). | None |
| 5 | 14 | D3/C6 | `refreshDeletionViews` dispatches three window events whose names are repeated as literals in 5+ files (`'alpha:calendar-document-changed'` in 7 files). | Export the three event names as constants; long term a typed event map (research P16). | None |
| 6 | 15-20 | — | `reminderDeletionRefusal` wrapper exists so the production bundle audit passes (comment explains). | Keep; the comment is a valid *why*. | — |
| 7 | 7 | C2 | Bridge interface typed here; `browser/deletions.ts` implements the web side. | Fine: this is the one typed module for the plugin. Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `DeletionEntry` | type | 5 | no | private |
| bridge interface (anonymous) | type | 7-13 | web implementation in `browser/deletions.ts` | named `AlphaDeletionsBridge` here |
| `key` | helper | 30 | `JSON.stringify([kind,id])` pattern | moves with policy |

## Proposed end state
Named bridge interface + `deletions` plugin, `refreshDeletionViews` with exported event constants, `reminderDeletionRefusal` wrapper. ~25 lines.

## Verification
`test/deletion-notice-policy.test.mjs`, `test/native-deletion-admission.test.mjs` (reads source text: re-check after edit), `test/shared-deletion-window.test.mjs`, `test/browser/durable-delete-undo.spec.ts`, `test/browser/reminder-v2-assistant.spec.ts`, Quint native manifest.
