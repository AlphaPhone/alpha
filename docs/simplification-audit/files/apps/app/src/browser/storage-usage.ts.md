# apps/app/src/browser/storage-usage.ts
- Lines: 7 | Role: storage usage text for settings (StorageManager estimate, fallback to AlphaFiles usage) | Verdict: KEEP
- Importers: 2 (prototype/data-adapter.ts, prototype/inbox-cloud-adapter.ts). Text/path pins: scripts/storage-specs.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | B2/B1 | `navigator.storage?.estimate?.()` inside `try{}catch{}` — estimate exists in all supported browsers/WebViews; the catch is the specified fallback. | Call `navigator.storage.estimate()` directly; keep the catch with a comment. | Low. |
| 2 | 2 | C2 | Inline AlphaFiles plugin type. | Typed AlphaFiles module. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| formatBytes | helper | 3 | check prototype/* for byte formatters | lib/format.ts |

## Proposed end state
Unchanged behaviour. Estimated lines after: 7 (current 7).

## Verification
settings storage specs.
