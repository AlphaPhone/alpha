# apps/app/src/runtime/cloud-service-info.ts
- Lines: 23 | Role: strict parser for Cloud's public service-info envelope (name, terms, privacy documents). | Verdict: MOVE to `scripts/lib/cloud-service-info.ts` (D6)
- Importers: no renderer file (grep `cloud-service-info` in apps: 0). `scripts/browser-cloud-dev-bridge.ts`, `scripts/cloud-readiness.ts`.
  Text/path pins: `test/cloud-service-info.test.mjs`, `test/support/feature-parity.mjs:488`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-23 | D6 / D11 | Renderer folder holds a script-only module; comment line 1 implies a renderer surface ("sign-in screen accepts" per research — now just "Public provider text only"). | `git mv` to `scripts/lib/cloud-service-info.ts`; update the 2 scripts, the test, and remove the parity entry. | Low. |
| 2 | 4-8 | C3 | `row(value, keys)` exact-key-set object guard and `text()`; twins `cloud-protocol.ts:124-131`, `cloud-personal-protocol.ts:20-21`. | Use the shared `scripts/lib` JSON/parse helpers once they exist; keep the exact-key check (it is the trust boundary for a remote document). | Low. |
| 3 | 5, 8, 11, 14, 20 | — | Five copies of `throw Error('Service information unavailable')`. | One `fail()` helper. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudLegalDocument`, `CloudServiceInfo` | interface | 2-3 | — | move with file |
| `row` | helper | 4-7 | `cloud-protocol.ts:124 object`, `cloud-personal-protocol.ts:20 obj` | `scripts/lib/parse.ts` |
| `text` | helper | 8 | `cloud-protocol.ts:128 string` | `scripts/lib/parse.ts` |

## Proposed end state
Same 20-odd lines under `scripts/lib/`; renderer no longer carries it.

## Verification
`test/cloud-service-info.test.mjs` (or delete per T3), `test/browser-cloud-dev-bridge.test.mjs`, `node scripts/cloud-readiness.ts` smoke, `npm run typecheck:scripts`.
