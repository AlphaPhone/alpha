# apps/app/src/prototype/use-in-email-review.ts
- Lines: 84 | Role: "Use in email" review for an agent reply while Inbox is open: decorates `renderVals` with a per-message action, an inline modal review (`emailUse*` template keys) and a fenced insert into `views.inbox.useInEmail`. | Verdict: SIMPLIFY (small)
- Importers: 1 — `apps/app/src/main.tsx:79` (installed at `:157` together with `installInboxCloudAdapter`, only when `!browserDevProfile`).
- Text/path pins: `test/fixtures/use-in-email-review.mjs:6-15` (T2 transplant: strips every `^import .*;\n` line and `export function`, then `vm` evals; requires each import to stay on one line); `test/use-in-email-review.test.mjs` (drives that fixture); `specs/quint/refinement/application/email-suggestion-review.mjs:4,11` (imports the same fixture); `specs/quint/application/manifest.json:1168` (source path); `test/support/feature-parity.mjs:434` (path list); Playwright `test/browser/use-in-email.spec.ts`, `use-in-email.production.spec.ts` (behaviour, user-driven).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 14, 17, 21, 24-28, 68-69 | C1 | `type Shell = any;` used for the component, shell, state, message rows and view map. | Import the shared `ShellHost`/`ShellState`/`ChatMessage` types (types.md); `views: ViewMap`. | None (types only). |
| 2 | 20, 54, 62 | B2 | `typeof views.inbox?.emailTarget === 'function' ? … : { ready:false, reason:'Inbox unavailable', token:'' }`, `views.inbox.useInEmail?.(…)`, `typeof views.inbox?.useInEmail === 'function'`. Both members are always assigned by `inbox-cloud-adapter.ts:808,821`, which `main.tsx:157` installs on the same line immediately before this adapter. | `const target = () => views.inbox.emailTarget() as EmailTarget;` and call `views.inbox.useInEmail(...)` directly; `inInbox = state.view === 'inbox'`. Better: have `installInboxCloudAdapter` return `{emailTarget,useInEmail}` and pass it in (D3) instead of reading the view bag. | Low; install order is fixed in main.tsx. |
| 3 | 30 | D4 | `const fit = fitEmailTarget;` alias, used 3×. | Call `fitEmailTarget` directly. | None. |
| 4 | 48, 83 | B2 | `shell.toast?.('Changed')`, `unmount?.apply(this,args)` — the shell always has `toast` and `componentWillUnmount` (model.js Component). | Plain calls. | None. |
| 5 | 21 | B3 | `eligible` re-checks `typeof entry.id === 'string' && typeof entry.text === 'string'` on rows of the shell's own `msgs` state. | Keep the semantic predicate (`from==='agent' && !card && !streaming && !interrupted && text.trim()`), drop the `typeof` checks once `msgs` is typed (#1). | Low. |
| 6 | 15-16, 60, 83 | D2 | Monkey-patches `renderVals` and `componentWillUnmount` on `Component.prototype`; per-shell state in `WeakMap`s although there is one shell per page. | When the D2 hook registry lands, register as a `renderVals` decorator + unmount hook; until then keep (behaviour is correct). | Medium (ordering) — do with the registry, not alone. |
| 7 | 23-25 | KEEP | `unlocked`/`presenting` fences are specified behaviour (MVP-14: review ends on lock, leaving Inbox or closing the sheet). | Keep. | — |

No dead code: every rendered key (`canUseInEmail`, `useInEmail`, `emailUseOpen`, `emailUseModal`, `emailUse.*`) is bound in `template.html:4251-4261,4407`.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Shell` | type (`any`) | 5 | 60+ `Bag`/`Shell = any` aliases (research app-prototype §4; `calendar-approval-adapter.ts:5`, `notes-trash-adapter.ts:15`, …) | shared `ShellHost` type (types.md) |
| `ReplySnapshot`, `Review` | type | 6-7 | none | keep local |
| `agentSession`, `cloudSession` | helper | 18-19 | session-fence strings built ad hoc in many adapters (`voice-adapter.ts:449` `composerBinding`, `inbox-cloud-adapter.ts`) | a shared `connectionFence()` in `runtime/connection-ui` if C4 fence work proceeds; else keep |

## Proposed end state
Same module, ~76 lines: typed shell/view parameters, no `typeof`/`?.` probes on members the inbox adapter always installs (or an explicit `inbox` port passed from main.tsx), `fitEmailTarget` called directly. Behaviour, copy and template keys unchanged. Delete `test/use-in-email-review.test.mjs` + `test/fixtures/use-in-email-review.mjs` (T2) only after the Quint harness `email-suggestion-review.mjs` is ported to import the module (T10); the Playwright journey `use-in-email.production.spec.ts` keeps behaviour coverage. Est. lines after: 76.

## Verification
`node --test test/use-in-email-review.test.mjs` (until deleted), Quint `email-suggestion-review` refinement (`npm run verify` quint lane), Playwright `use-in-email.production.spec.ts` / `use-in-email.spec.ts`. The fixture's `^import .*;\n` strip means imports must stay single-line until the fixture is gone.
