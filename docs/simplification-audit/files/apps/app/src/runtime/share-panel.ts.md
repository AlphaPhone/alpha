# apps/app/src/runtime/share-panel.ts
- Lines: 56 | Role: imperative modal Share panel (Email/Share/Copy/Save rows), positioned over the phone frame; selection-change watcher; email composer injection. | Verdict: SIMPLIFY + MOVE (UI out of `runtime/`)
- Importers: `maps/share.ts:1`, `prototype/notes-share-adapter.ts:2`, `prototype/share-panel-adapter.ts:1`.
- Text/path pins: Quint `specs/quint/refinement/application/share-panel-admission.mjs:7` (reads this path), `specs/quint/application/manifest.json`; tests `share-panel-adapter.test.mjs`, `share-panel-watch.test.mjs` (read text); `test/browser/share-panel.spec.ts`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 28-29, 32, 42-43 | D12 | inline styles (`Object.assign(dialog.style,{border:'0',borderRadius:'24px',…})`, notice styles, `button.style.opacity='.5'`, hint font size). | `.alpha-share-panel`, `.share-row`, `.share-hint`, `.alpha-share-failure` rules in `phone.css`; keep `place()` geometry inline. | Low (visual) |
| 2 | 26-55 | C4 | own `<dialog>` lifecycle (focus trap, cancel, backdrop click, pagehide/visibility/alpha-back/launcher-home teardown, focus return) — twin of `prototype/source-review-dialog.ts` `openReview` and ~20 others. | Build on the shared dialog scaffold; keep the Share-specific rows, status line and `current()` watch. | Medium (focus semantics; share-panel spec) |
| 3 | 33, 38, 44, 49, 51, 52 | D8 | 300-450-char lines (`place`, `finish` removes 7 listeners on one line). | Format; collect listeners in an `AbortController` and remove with one `abort()`. | Low (Quint/text tests) |
| 4 | 42 | D10 | icon chosen from the visible label: `label==='Email'?'mail':label==='Share'?'share-2':label==='Save file'?'download':'copy'`. | Pass the icon id with each action. | None |
| 5 | 12-15 | C4/D12 | `destinationFailure` builds its own fixed-position toast. | Use the shell toast (`[data-alpha-toast]`). | Low |
| 6 | 16-20 | D3 | module-global `openPanel` and `emailComposer` injected via `setShareEmailComposer`. | Keep single-panel invariant; type the composer port; fine as a small module singleton. | Low |
| 7 | 36, 52 | — | 250 ms `setInterval` poll of `options.current()` — needed because `current` is pull-based; `unchangedSince` keeps it cheap. | Keep. | — |
| 8 | 54 | B1 | `catch{finish();}` around `showModal` — specified (cannot open → close). | Keep. | None |
| 9 | — | D11 | DOM UI in `runtime/`. | Move to `ui/share-panel.ts` (or `prototype/`). | Low (path pins) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SharePanelOptions` | type | 1 | — | keep |
| `unchangedSince` | helper | 8-11 | `JSON.stringify` identity fences (C4) | keep (generic) |
| dialog lifecycle | helper | 26-55 | `prototype/source-review-dialog.ts`, `summary-note-review.ts` | shared dialog scaffold |
| failure toast | helper | 12-15 | shell toast | shell toast |

## Proposed end state
~40 formatted lines in `ui/share-panel.ts` on the shared dialog scaffold, styles in CSS, icon ids explicit.

## Verification
`test/browser/share-panel.spec.ts`, `test/share-panel-adapter.test.mjs`, `test/share-panel-watch.test.mjs`, Quint `share-panel-admission`, maps/notes share flows.
