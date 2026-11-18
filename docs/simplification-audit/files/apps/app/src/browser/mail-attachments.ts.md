# apps/app/src/browser/mail-attachments.ts
- Lines: 53 | Role: web AlphaMailAttachments plugin: review, open (sandboxed), and exact-copy save of attachments | Verdict: SIMPLIFY
- Importers: 1 (register.ts). Text/path pins: test/browser/summary-source-note.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45 | C3 (P4) | Theme copy with `toUpperCase()==='#000000'` dark detection (twin dialog-layout.ts:6 lowercase). | Dialog kit applyShellTheme. | None. |
| 2 | 35, 45 | C3 | `Uint8Array.from(atob(x),c=>c.charCodeAt(0))` twice; twin note-recording-journal.ts:46. | lib `base64ToBytes`. | None. |
| 3 | 15 | D10 | Error matched by message text `'Choose a file up to 5 MiB.'` to set code `too-large`. | Upstream should throw a coded error; until then keep with comment. | Low. |
| 4 | 40 | B1 | `.catch(()=>{})` on forgetSelected in finally — best-effort cleanup. | Keep with comment. | - |
| 5 | 51-53 | D8 | Trailing blank and misindented closing brace. | Formatter. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Same plugin using dialog kit + base64 helper; viewer CSS merged. Estimated lines after: 48 (current 53).

## Verification
attachment-accessibility.spec.ts, inbox-attachment-layout.spec.ts, mail-images.spec.ts, summary-source-note.spec.ts.
