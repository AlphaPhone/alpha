# test/own-provider-host.test.mjs
- Lines: 154 | Kind: integration over a transplanted host (via `test/fixtures/product-character-host.mjs`, which type-strips `scripts/cloud-resident-host.ts` into a `vm` and builds a real temp SDK/worker tree; uses the real upstream `createProviderKeySession` and `private-runtime-launch.mjs`; network and launches are injected) | Verdict: KEEP, PORT the fixture to import `createCloudResidentHost`; MOVE to `test/integration/cloud-resident-host.test.mjs` with its sibling host tests
- Covers: the dev Cloud-resident host's Own-provider custody: Own keys reach only the agent child env and never the profile on disk; Cloud and Own switch without probing providers needlessly; rejected key preserves Cloud; resident exit retries the same provider; cancel/back during validation saves nothing; account change or credential expiry fences late edits/reveals. Duplicates: `test/cloud-resident-host.test.mjs`, `cloud-resident-embedding-route.test.mjs`, `cloud-resident-full-profile.test.mjs`, `product-character-host.test.mjs` (same fixture, other properties); `own-provider-cancel-readback.test.mjs` (UI side). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T2 | Depends on a fixture that transplants `scripts/cloud-resident-host.ts` (fixture report: PORT to direct import). | Port the fixture; this file then needs no change. | Low |
| 2 | 6-22, 82-110 | - | Key custody (never written to profile, never in status JSON) is a security property; real modules, temp dirs. | Keep. | - |
| 3 | 134-142 | A8 | Case named "legacy Text-only edit" tests `selectOwn({apiKey})` without `cartesiaKey` keeping the saved voice key: live API shape, misleading name. | Keep; rename "Text-only key update keeps the saved Voice key". | None |
| 4 | 144-154 | T8 | Real 150 ms expiry + `setTimeout(200)` sleep. | Inject the host clock if it accepts one; otherwise keep (single short sleep). | Low |
| 5 | 37-48 | T8 | Unbounded-ish wait loop (10 × setImmediate) for status to flip. | Fine (bounded); keep. | - |
| 6 | - | Scope | Host is the dev `npm run dev:cloud` server (scripts report: KEEP). D5 keeps the harness the e2e suite drives. | Keep as long as `cloud-resident-host.ts` stays. | - |

## Proposed end state
Moved to `test/integration/cloud-resident-host.test.mjs` alongside the other three host tests sharing one ported fixture that imports `createCloudResidentHost` directly. Cases unchanged apart from the rename and, if possible, an injected clock for the expiry case.
