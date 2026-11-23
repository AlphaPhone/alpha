# Research brief (shared by all research agents)

Repository: `/Users/nubs/alphaphone/.claude/worktrees/simplify` (a git worktree; work ONLY inside it, never `cd` to `/Users/nubs/alphaphone` itself).
Read `AGENTS.md`, `README.md` and `docs/prd.md` first.

## Owner's goal (verbatim intent)
The whole product was built incrementally by agents. It has a lot of bloat and complexity: unnecessary paths,
unnecessary code, defensive programming patterns, legacy code that sits beside newer code paths (where the legacy
path could simply be deleted), code smell, overengineering, high cyclomatic complexity, and local types duplicated
instead of unified shared types. The owner wants a deep list of the *kinds* of problems in this codebase, grounded
in the actual code, which later agents will apply to every file.

For tests and scripts the owner additionally wants: no useless tests, no tests that just check a property of the
source text, essentially no unit tests — only e2e and integration tests — coverage without duplicate coverage, and a
simpler CI pipeline that does not burn hours on changes in one section that cannot affect other sections.

## This phase is READ-ONLY research
Do not modify any source, test, script or config file. The only file you write is your own report (path given in
your task). `vendor/eliza` is a pinned upstream submodule: never edit it, and do not audit it. `.eliza/` is generated
from it (ignored build output). `node_modules` is installed.

## Method
- Actually read files end to end (large ones in chunks); do not rely only on grep. Sample broadly, then go deep on
  the worst offenders. Cover every sub-folder of your area at least by skimming.
- Every claim needs evidence: `path:line` references and a short quoted snippet (trim long lines).
- Before calling something dead/unused, grep the whole repo for references (apps, android, scripts, test, specs,
  .github, package.json, vite/playwright/tsconfig). Say how you checked.
- Distinguish confident findings from suspicions.

## Report format (markdown)
1. **Area overview** — what lives here, rough size, how it hangs together, the real architecture in 10-20 lines.
2. **Pattern taxonomy** — one section per recurring problem pattern. For each: name; what it looks like; why it hurts;
   5-10 concrete examples (`path:line` + snippet); how widespread (rough count / which files); recommended treatment;
   risk and what would have to be verified. Be exhaustive about *kinds* of problem; invent names for patterns
   specific to this codebase.
3. **Delete candidates** — files, exports, functions, flags, branches and whole legacy paths that can be removed
   outright, each with the evidence that nothing needs it (or what newer path replaced it).
4. **Duplicated types and helpers** — every locally re-declared type/interface/helper that has a twin elsewhere
   (name, all locations, proposed single home).
5. **Structure / foldering** — files in the wrong place, misleading names, monoliths that should be split, tiny
   files that should be merged.
6. **Worst offenders** — the 15-25 files most in need of work, with one line each on why.
7. **Open questions / risks** — things that need a product or owner decision.

Finish by replying with a summary of at most 300 words: the pattern names and the 5 highest-value cleanups.
