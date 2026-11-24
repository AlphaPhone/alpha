# apps/app/src/runtime/text-share.ts
- Lines: 29 | Role: validated text share (Android chooser / Web Share) and copy, refused when the lock screen is showing. | Verdict: SIMPLIFY (small)
- Importers: `maps/share.ts:2`, `prototype/canonical-notes-ui.ts:10`, `prototype/notes-share-adapter.ts:1`, `prototype/share-panel-adapter.ts:2`, `prototype/voice-adapter.ts:2`.
- Text/path pins: `feature-parity.mjs` only.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D10 | lock detection by label text: `document.querySelectorAll('[aria-label="Unlock with fingerprint"], [aria-label="Wake"]')`. Renaming that copy silently disables the guard. | Read lock state from the shell (`data-alpha-locked` on the root or a lock-state export). | Medium (needs a shell attribute) |
| 2 | 3 | C2 | inline `AlphaDevice` typing (18 registrations). | `native/plugins.ts`. | Low |
| 3 | 4 | A7 | `nativeTextSharing` exported, 0 external users. | Unexport/inline `Capacitor.isNativePlatform()`. | None |
| 4 | 9 | B3 | `typeof input.title!=='string'` on a typed parameter; the size/NUL checks are a real boundary (agent-supplied text from `agent-adapter`). | Keep size/NUL/empty checks; drop typeof checks. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `visible` | helper | 5-7 | other lock/foreground checks in adapters (C4 "owner foreground") | shell lock-state helper |

## Proposed end state
~25 lines; typed plugin, lock check via shell state.

## Verification
`test/browser/share-panel.spec.ts`, notes/maps share specs, lock-screen share refusal.
