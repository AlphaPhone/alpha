# specs/quint/refinement/services/prepared-source-stamp.mjs
- Lines: 146 | Kind: Quint refinement driver (runs the real `scripts/prepare-local-agent.ts` as a child process on disposable Git repositories via `test/fixtures/prepare-local-agent.mjs`) | Verdict: KEEP, SIMPLIFY
- Covers: `PreparedSourceStamp` (live, `manifest.json:2402`): `agent:prepare` requalification and reuse of the prepared runtime stamp; refusals for missing/stale stamp, unselected source, symlinked backup parent, dirty tracked bytes, wrong base commit, pre-existing lock/candidate/backup sidecars, refused candidate open. Duplicates: other users of the same fixture (`test/prepare-local-agent*.test.mjs`, other chunk) may cover single refusals. Callers: `services/index.mjs:51,82`; `test/quint-prepared-source-stamp.test.mjs`; named in `scripts/ci/qualified-app-update.py` and `.github/workflows/resident-android.yml` (as an input path).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 108-125 | T10 (error text) | Outcomes matched by regex on stderr error lines (`Prepared runtime differs…`, `ConsumerSourceError: Unexpected runtime source change: README\.md`, `EEXIST: .*prior-stamp\.json`, …). Rewording an error breaks the harness; the comment at 77-79 shows this already bit. | Give refusals stable codes printed on one line (e.g. `ALPHA_REFUSAL=<code>`), match those. | Medium (product script change) |
| 2 | 58-67 | — | Writes a preload that monkey-patches `fs.openSync` to refuse the candidate: injected fault through a real child. Acceptable. | Keep. | — |
| 3 | 11 | C3 | Local `hashFile` sha256. | Shared helper. | Low |
| 4 | 19-25 | T10 | Reconstructs the expected current stamp JSON (field names, `null, 2` formatting) to compare bytes. Couples to stamp serialization. | Read the stamp produced by an `exact` run as the reference instead of re-deriving it. | Low |

## Proposed end state
Same ten cases on stable refusal codes, shared hash helper; run from the per-model runner with a path filter on
`scripts/prepare-local-agent.ts`, `scripts/local-agent-source.ts`, `scripts/copy-file-clone.ts` and the fixture.
