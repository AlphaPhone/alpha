# scripts/prepare-client-features.ts
- Lines: 469 | Kind: build step (library + CLI) | Verdict: KEEP, SIMPLIFY
- Covers: copies ~270 authenticated upstream leaves/directories from the vendor pin into `.eliza/client-features`, projects two re-export maps and rewrites seven imports so plain Node can load them, writes a provenance stamp, and races safely against concurrent preparers. Duplicates: `inventory`/walker and stamp logic twin `prepare-patched-native.ts:19-21,83-90`. Callers/importers: `npm run upstream:prepare-client` (run by `verify` and seven `pre*` hooks), `dev-cloud.ts`, `dev-local.ts`, `native-google-host-artifact.ts`; `checkClientFeatures` imported by ~20 Quint harnesses (10 of them `specs/quint/legacy`) and two host tests; `test/client-feature-preparation.test.mjs` (10 cases, with process races).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 324-329 | A8 | Refuses two "retired client patch slots"; `patches/` does not exist in the repo. | Delete; also the test at `client-feature-preparation.test.mjs:354-359`. | none |
| 2 | 320 | A7 | `CLIENT_FEATURE_PATCHES = []` has no importer. | Delete. | none |
| 3 | 14, 323, 333, 409 | D7 | `projectVoice` option (and `projectionVersion 14/0`) is `false` only in tests. | Remove the option; always project. | low (test fixture must provide projection inputs) |
| 4 | 191, 306, 392-403 | A2 | `calendar-linked-sync` contract, `plugins/plugin-calendar/src/linked-sync` and its import rewrite. Still imported by `apps/app/src/runtime/cloud-protocol.ts` today; D4 deletes the renderer linked-sync stack. | Re-check after stage A1: if `cloud-protocol.ts` no longer reaches `calendarSyncHttp`, drop both paths and the rewrite block. | low |
| 5 | 56 | A3/D5 | `contracts/remote-agent-pairing.ts` (hosted pairing, D5); only `cloud-sign-in.ts` imports it. | Drop when the pairing remnants go. | low |
| 6 | 308 | T5 | Copies an upstream **test** (`plugins/plugin-maps/test/navigation-client.test.mjs`) into the product tree for `test/maps-navigation.test.mjs`. | Drop with that test (upstream runs its own tests). | none |
| 7 | 134, 310, 315 | A7 | No direct consumer found for `view-id-migration.ts`, `subscription-grant.*`, `account-billing-snapshot.ts`; may be transitive imports of other leaves. | Replace the hand list with an import-closure computation from the renderer entry points, or verify by deleting and running `tsc`/`vite build`. | low |
| 8 | 43-318 | C7/D10 | 270-entry hand-maintained list; every upstream move edits it. | Compute the closure from the renderer's `@elizaos/*` imports (owner follow-up); at minimum sort and group it. | medium |
| 9 | 338-405 | D13 | Five string-replace blocks exist so plain Node (tests that strip types, Vite config bundle) can import copied sources. Many consumers are T2 transplant tests slated for deletion. | After test cleanup, re-check which rewrites the Vite config/back-end hosts still need; delete the rest. | medium |
| 10 | 411-462 | B5/D9 | Peer-race machinery (retire-aside, 30 s `Atomics.wait` poll, dev/ino comparison) exists because seven `pre*` hooks and parallel tests prepare concurrently. | With one explicit prepare step (P5) the race is gone: write temp dir, rename over. | medium |
| 11 | 18-38 | C3 | `regularPath`, `inventory` walker, `errorCode`. | Shared `scripts/lib/fs.ts`. | low |

## Proposed end state
~150 lines: a computed (or grouped) source list, one projection step, rewrites only for real Node consumers, a stamp check, and a temp-dir-then-rename write. Run once from `verify`/`dev`; `pre*` hooks gone. `client-feature-preparation.test.mjs` shrinks to one integration case (prepare into a fixture repo, check stale detection) or is deleted in favour of the build itself failing.
