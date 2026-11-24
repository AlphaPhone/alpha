# test/source-snapshot.test.mjs
- Lines: 53 | Kind: tooling (spawns `scripts/source-snapshot.ts` in temp roots) | Verdict: KEEP (only while `scripts/build-archive.ts` uses it)
- Covers: The source snapshot digest binds the native source catalog, upstream pin and client-source preparer, and ignores generated staging and private state. Duplicates: none. Callers/importers: `npm test` glob; script called by `scripts/build-archive.ts:41` and pinned in `scripts/quint-lib.ts:35`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | B5 | Snapshot is provenance evidence; it is only worth testing if `build-archive.ts` stays (scripts review decides). | Delete together with the script if the archive receipt has no consumer. | Low |
| 2 | 10-11 | C3 | Local sha256 and write helpers. | Share with release-tooling tests. | Low |

## Proposed end state
Stays as a small tooling test, or goes with `source-snapshot.ts` if the scripts review drops the archive provenance.
