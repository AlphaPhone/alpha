# apps/app/src/runtime/device-view-profile.ts
- Lines: 39 | Role: one-time enabled-view negotiation with the connected agent during device registration. | Verdict: SIMPLIFY (candidate to fold into the planned `runtime/connection/` split)
- Importers: 1 (`runtime/connection-ui.tsx`, 3 call sites at 1176, 1497, 1573). Text/path pins: `scripts/test-connection-history.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 23-24, 33, 38 | A1/A4 | `const legacy = ''` and every return path yields `''` (`return legacy`, `return ''`, `return ''`); failures throw. The `Promise<string>` result carries no information. | Return `Promise<void>`; at the three callers replace `reason = await negotiateEnabledViews(...)` with `await negotiateEnabledViews(...); reason = ''` (keeps the reset), and `profileReason` (1573) becomes unnecessary. | Low |
| 2 | 24 | A1 (owner) | `if (version === undefined) return legacy;` serves "an agent without enabled-view negotiation". The resident agent ships in the same APK, so only the dev/hosted agents can omit it. | If the hosted path is deleted, treat `undefined` as an error or as version 1. Owner question. | Medium |
| 3 | 7 | C1 | `type Request = (path, body, signal) => Promise<unknown>`. | Import the shared `OwnerRequest` type (research n–z §4). | None |
| 4 | 8-11 | C3 | Local `object()` plain-object guard. | Shared `expectRecord(value,message)`. | None |
| 5 | 4 | C3 | Local v4 UUID regex. | Shared UUID helper. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Request` | type | 7 | `view-navigation.ts:12-16`, `maps/resident-relay.ts:7`, `device-actions.ts:89` | `alpha-client.ts` `OwnerRequest` |
| `object` | helper | 8-11 | ~14 named guards (research §4) | `runtime/parse.ts` |
| `UUID` | const | 4 | many UUID regexes (`google-accounts.ts:52`, `google-calendar-selection.ts:9`, `diagnostics-export.ts:73`) | shared |
| `views`, `profile` | helper | 12-21 | no | stay |

## Proposed end state
`negotiateEnabledViews(version, request, signal): Promise<void>` using shared parse helpers; ~30 lines.

## Verification
`scripts/test-connection-history.ts`; connection registration journeys in `test/browser/*connection*.spec.ts`.
