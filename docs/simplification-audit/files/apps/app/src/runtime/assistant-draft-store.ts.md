# apps/app/src/runtime/assistant-draft-store.ts
- Lines: 25 | Role: picks the installed durable-draft store per binding: Android encrypted slot `assistant-draft:v1:<sha256>` or browser document `alpha.browser.assistant-draft:v1:<sha256>` | Verdict: SIMPLIFY (minor)
- Importers: browser/calendar-editor-draft.ts, prototype/agent-adapter.ts, prototype/calendar-edit-draft-adapter.ts, prototype/calendar-form-draft-adapter.ts, prototype/canonical-calendar-drafts.ts. Text/path pins: manifest `sources` (application); quint `calendar-adapter-fixture.mjs`, `canonical-calendar-draft-handoff.mjs`, `canonical-calendar-editor-close.mjs`; Playwright `assistant-draft-recovery.spec.ts`, `assistant-draft-storage.spec.ts`, `calendar-form-draft.spec.ts`, `composer-dispatch.spec.ts`, `note-calendar-handoff.spec.ts`, …; `test/fixtures/calendar-mounted-editor.mjs`, `canonical-calendar-draft-owner.mjs`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | C3 | Inline SHA-256→hex (`Array.from(new Uint8Array(await crypto.subtle.digest(...)),n=>n.toString(16).padStart(2,'0')).join('')`). | `sha256Hex(binding)` from the shared lib. | None (same output). |
| 2 | 13 | B3 | `if(!binding||binding.length>4096)throw` — every caller builds the binding in-process from verified session data. | Keep the empty check (a programming error guard is cheap) or drop both; low value either way. | None. |
| 3 | 16 | style | `Capacitor.getPlatform()==='android'` while sibling stores use `Capacitor.isNativePlatform()` (calendar-linked-storage.ts:14). | Use one platform helper (`isAndroid` from native.ts). | None. |
| 4 | 23 | keep | `{raw:JSON.stringify(emptyDurableDraft(binding))}` is the persisted browser recovery envelope. | Keep byte-for-byte. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| sha256 hex | helper | 14 | agent-calendar.ts:27, sms-agent-contract.ts:4, native-recovery-backup.ts:11, ~24 more | `lib/sha256.ts` |
| slot prefix `'assistant-draft:v1:'` | const | 15 | Java slot allowlist (native-secure-slots test) | keep |

## Proposed end state
~22 lines, same slot names and envelope, shared hash helper.

## Verification
`test/browser/assistant-draft-recovery.spec.ts`, `assistant-draft-storage.spec.ts`, `test/native-secure-slots.test.mjs` (slot allowlist), calendar draft specs.
