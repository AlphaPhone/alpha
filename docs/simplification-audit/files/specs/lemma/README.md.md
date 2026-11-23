# specs/lemma/README.md
- Lines: 205 | Kind: formal-proof documentation | Verdict: SIMPLIFY (rewrite in place; keep the second half)
- Covers: how `npm run lemma:check` works, the trust boundary of LemmaScript/Dafny proofs, how to add a function, and the table of 23 verified files. Duplicates: lines 1-31 restate lines 33-123 with older, now-wrong wording; `docs/formal-model-audit-2026-11/` (superseded LemmaScript audit, see ci-and-formal §5). Callers/importers: none mechanical; linked from human docs only (grep: no script reads it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-31 | A8 / C5 | Two READMEs concatenated (`# Function verification` + `## Expanded audit targets`, then `# LemmaScript proofs`). The first is a history narrative ("first admitted production function", "original audit's … targets", "issue #856's full adoption wave", "Expanded audit targets"). | Delete lines 1-31; keep from `# LemmaScript proofs`. | low |
| 2 | 15-20 vs 116-121 | — | Contradiction: first part says missing Dafny records `skipped-no-qualified-backend`; second says `skipped-no-backend`. `scripts/check-lemma.ts:299` writes `skipped-no-qualified-backend`. | Fix line 119 to `skipped-no-qualified-backend` after deleting 1-31. | low |
| 3 | 17-20, 108-110 | B5 | Describes receipts (`test-results/lemma/check.json`) that "bind" every input hash before and after. No consumer reads the receipt (ci-and-formal §2.8; only uploaded as an artifact by `browser.yml:85`). | When `check-lemma.ts` drops the receipt (scripts chunk), drop these sentences; the exit code is the result. | low |
| 4 | 41 | — | Broken sentence: "the Dafny text is under ``, mirroring the source path" (empty code span). | "under `specs/lemma/`, mirroring the source path". | low |
| 5 | 3-5, 137-139 | — | Two regen commands: `npm run lemma:regen` (`lsc gen --backend=dafny`, `package.json:72`) and `lsc.js regen --backend=dafny --no-verify <path>` (three-way merge). Only `regen` merges hand-written lemmas; `gen` on a file with additions is ambiguous to the reader. | Point `lemma:regen` at `regen --no-verify` (scripts chunk) or document one command. | low |
| 6 | 60-63 | — | "the surrounding function … is covered by its unit tests only". After D10 deletes unit tests, that claim becomes false; the wrappers (`resolveCloudEnvironment`, `startupPermissionsActive`, `BrowserVideoCapture`) need integration/journey coverage. | Reword to "covered by integration/journey tests" and name them once they exist. | med |
| 7 | 102 | T5 | Lists `test/lemma-check.test.mjs` as "tests of the check itself"; there is also `test/lemma-checker.test.mjs` (two tests of the same tooling). | Owned by the test chunk; README should name the single survivor. | low |
| 8 | 157-205 | — | Verified-functions table is accurate for this chunk's 12 files (checked against `.dfy.gen` and hand-written tails); missing `TrimDeletionJournalBound` (journal-retention) in the hand-written list. Obligation counts are a dated snapshot ("run of 2026-11-10") and drift on any regen. | Add the lemma; drop the per-file obligation counts (B5-ish snapshot) or accept drift. | low |
| 9 | 195 | — | `runtime/hosted-digests.ts` row: still live (imported by `main.tsx`, `digest-inbox.ts`, etc.), not a D5 hosted-pairing deletion. No change. | None. | — |

## Proposed end state
- One README starting at `# LemmaScript proofs`: what a proof establishes / does not, install backend, run, add a function, verified table.
- No history narrative, no receipt description once the receipt is removed, one regen command.
- State that CI runs `lemma:check` once, in the static/formal lane, path-filtered on the 23 inventory sources + `specs/lemma/**` + `LemmaScript-files.txt` + `lemmascript.json` + `scripts/check-lemma.ts`.
- Note that a Stage F split/move of any listed source must move its `.dfy`/`.dfy.gen` pair and inventory line in the same commit.
- Roughly 170 lines.
