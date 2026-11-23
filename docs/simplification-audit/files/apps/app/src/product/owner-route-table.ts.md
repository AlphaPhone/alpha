# apps/app/src/product/owner-route-table.ts
- Lines: 57 | Role: the owner-bound route allowlist shared by the renderer gate (runtime/owner-route-policy.ts) and Android's OwnerRoutes (serialised into an APK asset) | Verdict: KEEP (add a type)
- Importers: 1 app (runtime/owner-route-policy.ts:2); scripts/android-host.ts:20, scripts/apk.ts:1 (`serializeOwnerRouteTable`); tests android-host.test.mjs:14, owner-route-parity.test.mjs:13, upstream-owner-gate-compat.test.mjs:11, verify-apks.test.mjs:6; specs/quint/refinement/native/credential-coordinator-platform.mjs:1.
- Text/path pins: android/consumer-host.json:122 lists this path as a consumer-host input; test/android-host.test.mjs:107 lists it among hashed inputs; test/upstream-owner-gate-compat.test.mjs:91,205,207 cites the path in messages; specs/quint/refinement/native/credential-coordinator.mjs:28 (sources). `serializeOwnerRouteTable()` output is compared byte-for-byte with the APK asset (verify-apks) — the object key order and `JSON.stringify(...,null,2)+'\n'` format are a wire format.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C1 | `OWNER_ROUTE_TABLE` is untyped, so runtime/owner-route-policy.ts:5 casts `table.groups as Record<string, {prefixes; id?; routes:{methods;paths;query?}[]}>` and then validates at load that every `{id}` route has an id pattern (research n–z P14, B3) | Declare `type OwnerRouteTable` here and write `export const OWNER_ROUTE_TABLE = {...} satisfies OwnerRouteTable`; the policy drops its cast. The `{id}`-needs-`id` rule can become a type (`routes` with `{id}` only in groups whose `id` is set) or one assertion in test/owner-route-parity.test.mjs instead of a load-time throw | Low; must not change key order (serialisation) |
| 2 | 8 | D8 | `unsafe` is a doubly escaped regex source string (`"[\\\\#\\t\\n...]"`) consumed by both JS (`new RegExp`) and Java | Keep — the string form is what Java reads; add a one-line comment naming the characters (backslash, #, controls, Unicode spaces) | None |
| 3 | 1-6 | — | Header comment states the policy precisely | keep | — |

No dead routes can be proven from this side: each path is an Eliza service route; test/upstream-owner-gate-compat.test.mjs checks them against upstream.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OWNER_ROUTE_TABLE` | const | 7-52 | Android asset generated from it; the inline cast type in runtime/owner-route-policy.ts:5 | stays (+ `OwnerRouteTable` type here) |
| `serializeOwnerRouteTable` | helper | 55-57 | none | stays |

## Proposed end state
~65 lines: same data and serialiser plus an exported `OwnerRouteTable` type and `satisfies` clause; owner-route-policy.ts loses its cast and load-time validation.

## Verification
test/owner-route-parity.test.mjs, test/upstream-owner-gate-compat.test.mjs, test/android-host.test.mjs, test/verify-apks.test.mjs; Android build (asset bytes); quint native credential-coordinator refinement.
