# apps/app/src/prototype/model.d.ts
- Lines: 8 | Role: TypeScript declarations for the untyped `model.js` exports used from TS (`Component`, `VIEWS`, `ORDER`, `mockAttentionRows`, `HOME_DEFAULTS`). | Verdict: KEEP (strengthen types later)
- Importers: implicit – TS resolves it for `main.tsx:56` (`Component, VIEWS, ORDER`), `data-adapter.ts:3` (`HOME_DEFAULTS`), `mock-attention.ts:4` (`mockAttentionRows`). No text/path pins found (`git grep model.d.ts` outside docs: 0).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | C1 | `Component: ComponentType<any>`, `VIEWS: Record<string, any>` – the root of the untyped-shell problem (research P4): every adapter re-declares `Bag`/`Shell = any` because this gives nothing. | Declare `Component` as `ComponentType<ShellProps> & { prototype: ShellHost }` and `VIEWS: Record<ViewId, ViewDefinition>` from the proposed `prototype/shell-types.ts`; adapters then drop local `Bag`/`Shell`. | None at runtime; surfaces type errors to fix per adapter |
| 2 | 6 | — | `mockAttentionRows` stays declared after `mock-attention.ts` is deleted (data-adapter imports it from `./model.js` directly). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| attention row shape `{ ini, who, text, icon, go }` | type (inline) | 6 | Home attention row consumers in `data-adapter.ts`, `home-cards.ts` | export `AttentionRow` here or in `shell-types.ts` |

## Proposed end state
~10 lines importing real shell types; no `any`.

## Verification
`npx tsc --noEmit` (whole renderer), `npm run verify`.
