# Per-file review brief: scripts, tests, formal specs and CI

Repository: `/Users/nubs/alphaphone/.claude/worktrees/simplify` (git worktree; work only inside it).
Never edit or audit `vendor/eliza`; `.eliza/` is generated from it.

## This phase writes reports only

Do NOT change any source, test, script, spec or workflow file. Other agents are editing product code in this worktree
right now (deleting retired features); if a file you were assigned no longer exists, write a two-line report saying so.
You write one markdown report per assigned file at `docs/simplification-audit/files/<repo-relative path>.md`, and one
chunk summary at `docs/simplification-audit/chunks/<chunk id>.md`.

## The owner's goal for this area

- Simplify, reduce complexity, deduplicate and consolidate tests and scripts.
- No useless tests: nothing that only checks a property of the source text, a constant, a file list or a mock.
- **No unit tests. Only integration and end-to-end tests.** Coverage is wanted, duplicate coverage is not.
- A simpler CI pipeline that does not spend hours on changes that cannot affect the lane being run.
- Quint models and LemmaScript proofs must keep passing at 100 %. Models of live product code stay. Harnesses that
  slice product source text are to be ported to importing and running the real module.

## Inputs to read first

1. `docs/simplification-audit/PATTERNS.md` (issue catalogue; tests are T1–T10, pipeline P1–P6; A–D apply to scripts).
2. `docs/simplification-audit/DECISIONS.md` and `RECOMMENDATIONS.md` §2–§3: features being deleted (legacy readers,
   Wallet, backup/import/export, client Calendar linked sync, unreachable hosted/paired code). A test, script or model
   that covers only a deleted feature is a DELETE.
3. The research report for your area in `docs/simplification-audit/research/`: `tests-host.md` (host tests, bucket
   per file), `tests-browser.md` (Playwright specs), `scripts.md` (caller table), `ci-and-formal.md` (workflows, Quint,
   Lemma). Confirm, correct and extend what it says about your files.

## How to review

Read every assigned file completely. Then, by kind:

**Host test (`test/*.test.mjs|ts`, `test/fixtures`, `test/support`)**
- Kind: source-text (regex/slice of product files) / transplant (evals a copied or sliced snippet with stubs) / unit
  (one function, mocks around it) / integration (runs real modules or processes together) / Quint replay or
  refinement / tooling (tests a script or CI helper) / inventory.
- What product behaviour it protects, in one sentence. Which other test or spec covers the same behaviour (name it).
- Verdict: DELETE / KEEP / MERGE into `<target file>` / REWRITE as `<integration test or Playwright journey>`.
  For REWRITE and MERGE give the target and the cases worth carrying (list them; most are not).
- Runtime cost if it is notable (spawns a build, bundles, runs Quint, sleeps).
- For fixtures and support files: every importer, and whether it survives once its DELETE importers are gone.

**Playwright spec (`test/browser/**`)**
- Which user journey it drives, which project runs it (chromium / production / firefox+webkit / live), whether it
  imports product modules through `page.evaluate(import('/src/...'))` (that is a unit test in a browser: T6).
- Verdict as above; target is one of roughly 35 journey specs (propose names consistently:
  `journeys/<area>.spec.ts`, areas such as chat, voice, notes, calendar, reminders, inbox, browser, camera-photos,
  files, maps, settings, workflows, connection-cloud, startup-permissions, notifications, home-shell, accessibility,
  production-gating). Say which helper/fixture it needs.

**Script (`scripts/**`, `package.json`, root config)**
- Who calls it (package.json script, workflow, another script, test, nobody). Verdict: KEEP / DELETE / MERGE into
  `<path>` / MOVE to `test/` (it is a test) / SIMPLIFY. Duplicated helpers (arg parsing, git, readJson, identity,
  sha256, walkers) with their twins. Apply patterns A–D as for product code.

**Workflow (`.github/**`)**
- Triggers, path filters, jobs, approximate cost, what required check it produces, last known health (see research).
  Verdict: KEEP / DELETE / MERGE. What path filter each job should have so unrelated changes skip it.

**Quint (`specs/quint/**`) and Lemma (`specs/lemma/**`, `LemmaScript-files.txt`)**
- Is the model live (listed by `scripts/check-quint.ts` / `scripts/quint-lib.ts` / a manifest) or historical?
- What product code it models (paths). Does that code still exist after DECISIONS? How is it tied to the code:
  manifest path/symbol pins, a refinement harness that slices text, a harness that imports and runs the module, or
  nothing?
- Verdict: KEEP / DELETE (historical, or models deleted code) / PORT (harness must import instead of slice; say how:
  which exports the product module needs) / MERGE.
- For harnesses (`specs/quint/refinement/**`): list every product file it reads as text and every marker, regex or
  stub specifier it relies on.

Before calling anything unused, grep the whole repo and say what you found. Be concrete and decisive.

## Report format (one per file)

```
# <repo-relative path>
- Lines: N | Kind: … | Verdict: …
- Covers: one sentence. Duplicates: <paths or none>. Callers/importers: …

## Findings
| # | Lines | Pattern | Finding | Change | Risk |

## Proposed end state
3–10 lines.
```
Trivial files get a five-line report, but every assigned file gets one.

## Chunk summary (`chunks/<id>.md`)

A table of every file with kind and verdict (and target for MERGE/REWRITE/PORT), then: behaviours that would lose all
coverage if the DELETEs happen (be honest; these need a replacement integration or journey test), shared helpers
worth keeping, cross-file actions, owner questions.

## What you return

A structured summary (schema provided).
