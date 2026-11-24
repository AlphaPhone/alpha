# apps/app/src/runtime/view-focus.ts
- Lines: 93 | Role: binds upstream `createScreenFocus` (`@elizaos/ui/accessibility/screen-focus`) to Alpha's screen-name targets and screen-change signals; keyboard-only focus ring. | Verdict: KEEP (minor; MOVE to `ui/`)
- Importers: `main.tsx:90` (`installViewFocus()` at L407).
- Text/path pins: Quint `specs/quint/refinement/application/screen-focus-ownership.mjs:12,168` (runs stripped text, reads `installed`), `specs/quint/application/manifest.json`, `test/accessibility-coverage.test.mjs:189`, `test/browser/view-focus.spec.ts` (uses the uninstaller and idempotence), `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28 | D10 | `SELF_FOCUSED` includes `[aria-label="Voice conversation"]` — behaviour keyed on label text. | Use a data attribute (`[data-alpha-voice-conversation]`). | Low |
| 2 | 61 | D12 | focus-ring CSS injected as a `<style>` string. | Move to `phone.css`. | Low |
| 3 | 22 | — | Already uses the `@elizaos/*` alias (good reference for D13). | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| selectors `TITLE`, `HOME`, `APP` | const | 24-26 | `data-alpha-layer` selectors in prototype adapters | keep |

## Proposed end state
~85 lines; CSS in the stylesheet, data-attribute selector.

## Verification
`test/browser/view-focus.spec.ts`, Quint `screen-focus-ownership`, `test/accessibility-coverage.test.mjs`, TalkBack acceptance (device).
