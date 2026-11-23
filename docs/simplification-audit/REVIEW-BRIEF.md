# Per-file review brief

Repository: `/Users/nubs/alphaphone/.claude/worktrees/simplify` (git worktree — work only inside it).
Never edit or audit `vendor/eliza`; `.eliza/` is generated from it.

## This phase writes reports only
Do NOT change any source, test, script or config file. You write one markdown report per code file you were
assigned, at `docs/simplification-audit/files/<repo-relative path of the code file>.md`
(e.g. `docs/simplification-audit/files/apps/app/src/runtime/local-agent.ts.md`).

## Inputs to read first
1. `docs/simplification-audit/PATTERNS.md` — the issue catalogue. Tag every finding with its ID (A1, B2, C3 …).
   If you find a recurring problem that fits no ID, tag it `NEW` and describe it.
2. The research report(s) for your area in `docs/simplification-audit/research/` (named in your task) — they
   already list known examples, delete candidates and duplicated helpers; confirm, correct and extend them.
3. `docs/prd.md` when a finding depends on product scope.

## How to review a file
Read the whole file (large files in chunks — every line, not a sample). Apply EVERY pattern in the catalogue to it.
For each finding give the line range, a short quoted snippet, the pattern ID, the concrete change, and risk.
Before calling anything unused, grep the whole repo (apps, android, scripts, test, specs, .github, root config,
and `.eliza/client-features` / `.eliza/generated-android` for upstream callers) and say what you found.
Also record who depends on the file's *text or path*: tests that slice or regex it, `specs/quint/**/manifest.json`,
`test/support/feature-parity.mjs`, `LemmaScript-files.txt`, scripts that list it. Implementers need that to keep
verification green.

Be concrete and decisive. "Consider simplifying" is useless; "delete lines 40-71: `legacy()` reader, no writer
of `alpha.x.v1` exists (grep: 0 hits outside this file and test/x.test.mjs)" is what we need.
Behaviour that the product needs must be preserved exactly: persisted formats and key names that are written
today, wire formats, user-visible copy, accessibility semantics.

## Report format (one file per code file)
```
# <repo-relative path>
- Lines: N | Role: one sentence | Verdict: KEEP / SIMPLIFY / SPLIT / MERGE into <path> / MOVE to <path> / DELETE
- Importers: who imports it (count + notable). Text/path pins: tests, manifests, scripts that reference it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |

## Proposed end state
What this file should look like after cleanup (5-15 lines): what is deleted, what moves where, what remains,
estimated lines after.

## Verification
Which existing tests / specs / models exercise this file's behaviour, and what must be re-run after changing it.
```
Trivial files (assets-like data, tiny constants) may get a five-line report, but every assigned file gets one.

## What you return
A structured summary (schema provided): per file verdict + estimated removable lines, every local type/helper
with twins, cross-file actions (things that require coordinated edits in several files), new patterns, and
questions that need an owner decision.
