# scripts/upstream-mobile-build.ts
- Lines: 43 | Kind: data (mobile bundle build policy: Bun version, builder script hash, `uuid` package file digests; JSON in a TS wrapper) | Verdict: SIMPLIFY → `scripts/upstream-mobile-build.json`
- Covers: pins the upstream mobile bundle builder, Bun 1.4.2 and the exact `uuid@14.0.2` files that `mobile-uuid-adapter.ts` transforms. Duplicates: Bun version `1.4.2` also hard-coded in `.github/workflows/android.yml:73`, `browser.yml:64`. Callers/importers: `mobile-uuid-adapter.ts:5,11` (type import + `MOBILE_UUID_POLICY` path), `verify-packaged-runtime.py:138-160`, `source-snapshot.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 43 | D4 | JSON in a TS wrapper, parsed as text by `parseBuildPolicy` and Python `read_build_policy_source`. | `.json`; `import type` becomes a `typeof` of a JSON import or a small interface. | Medium: `policySha256` in the staged receipt changes once (re-stage). |
| 2 | 5–6 | C6 | Bun version duplicated in two workflows. | Workflows read it from this file (`jq -r .bun.version`). | Low |
| 3 | 42 | — | `lockSha256` pins the upstream bun lockfile. Keep. | — | — |

## Proposed end state
`scripts/upstream-mobile-build.json`, the single source of the Bun version for CI and the mobile builder; `build-policy-source.ts` deleted.
