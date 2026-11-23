# scripts/maps/dataset_manifest.py
- Lines: 88 | Kind: dev tooling library + CLI (seal/verify the prepared Monaco regional Maps dataset) | Verdict: KEEP (SIMPLIFY)
- Covers: the regional gateway only serves a dataset whose every file matches an explicitly sealed manifest, and refuses live SQLite writers. Duplicates: sha256 streaming also in `prepare-region.py:14-18`; Monaco bounds / provider id / default data path repeated in `serve-region.py`, `index-region.py`, `prepare-region.py`, `dev.ts`, `test-native-navigation.ts` (C6). Callers/importers: `scripts/maps/dev.ts:46` (CLI `verify`), `serve-region.py:3` (import `verify, snapshot`), `test-dataset-manifest.py`, `test-region.py`; stubbed by name in `test/maps-navigation.test.mjs:105`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48, 83 | C6 | Provider id `alpha-osm-monaco`, bounds `[7.409, 43.724, 7.449, 43.752]` and default data path `~/.local/share/alphaphone-maps/monaco` are literals here and in four sibling files. | Make this module the single owner (`PROVIDER`, `BOUNDS`, `DEFAULT_DATA`) and import them in `serve-region.py`, `index-region.py`, `prepare-region.py`; `dev.ts` reads them from the CLI output or keeps one TS copy. | None. |
| 2 | 41-47 | C3 | Streaming sha256 duplicated in `prepare-region.py:digest`. | `prepare-region.py` imports a `sha256_file` from here. | None. |
| 3 | 28-35, 70, 76 | keep | Inode/mtime identity snapshot around hashing is the live-drift refusal the gateway relies on (tested by `test-dataset-manifest.py`). Not ceremony. | KEEP. | n/a |

## Proposed end state
Unchanged mechanism (~85 lines) that also exports the region constants and file hash helper used by the other Python
maps scripts. Live module of the `ELIZA_DEV_ALLOW_TEST_MOCKS` regional Maps provider (`apps/app/src/maps/regional-provider.ts`), so it stays under D6.
