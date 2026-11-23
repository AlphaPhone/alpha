# Implementer brief

You are implementing part of a codebase simplification in the worktree
`/Users/nubs/alphaphone/.claude/worktrees/simplify`. Work only there. Other implementers edit other files in the same
worktree at the same time.

## Read first

1. `docs/simplification-audit/PATTERNS.md` (issue catalogue, IDs A1…P6)
2. `docs/simplification-audit/DECISIONS.md` and `RECOMMENDATIONS.md` §2–§3 (decisions D1…D21; they are binding)
3. The material named in your task (chunk summary, per-file reports under `files/<repo path>.md`, ledger sections)

Reports were written before any change. Line numbers may have drifted: re-find sites by content. A report is a
proposal, not a fact. Before deleting something "unused", grep for it yourself (`git grep -n -F`), including
`template.html`, `model.js`, Java, `scripts/`, and string-keyed uses (plugin method names, event names, view names).

## Hard rules

- Toolchain: prefix shell commands with
  `export PATH="$HOME/.local/share/fnm/node-versions/v26.13.0/installation/bin:$PATH"`.
- Never edit `vendor/eliza` or anything generated under `.eliza/`. Never edit `upstream.lock.json`.
- No git commands that write: no `add`, `commit`, `stash`, `checkout`, `restore`, `reset`, `clean`, `mv`, `rm`.
  Delete files with plain `rm`. Read-only git (`grep`, `diff`, `log`, `show`, `status`) is fine. To see a file's
  original content use `git show HEAD:<path>`.
- Edit only files you own for this task. Exceptions: (a) you may delete a test or harness file as described under
  "Tests and formal artefacts"; (b) a one-line import fix in another file that your deletion would otherwise break.
- Persisted and cross-process identities stay byte-identical: storage keys, secure-slot names, event and channel
  names, wire values, export formats, plugin and method names that the other side (Java or renderer) still calls,
  WorkManager worker class names, Android component names in the manifest.
- No visible behaviour change, copy change, security-policy change or data-format change, unless a decision D1…D21
  says so. Questions marked "Open" in `cross-file-actions.md` §4 are **not** implemented: skip and list them in your
  ledger.
- D7: always-on listening, Power/assistant invocation, Clef end-of-turn stay.
- Mocks, fixtures and developer surfaces must stay unreachable without `ELIZA_DEV_ALLOW_TEST_MOCKS=1`. The production
  bundle audit (`npm run audit:bundle` after a build) must keep passing; do not weaken it.
- Do not collect credentials. Do not turn a simulated action into a real side effect.
- Do not reformat. Keep the existing style of each file; no formatter runs in this stage. Keep imports on single
  lines.
- Do not move or rename files in this stage unless your task says so.
- Do not add comments that describe the change ("removed legacy…", "was X"). Comments state what the code does or
  why; delete comment noise (issue numbers, dates, history) only when it is not a text anchor for
  `scripts/audit-production-bundle.ts`.
- No new dependencies. No new abstraction for a single caller. Prefer deleting to wrapping.
- The disk is nearly full. Before a build or any command that writes more than a few MB run `df -h .`; if less than
  300 MB is free, do not run it and say so in your ledger. Never run a Gradle assemble, an emulator, or `npm install`.

## Tests and formal artefacts

Your change may break files that pin product source text. Handle them by kind:

- **Source-text, transplant and stub unit tests** (they read a product file as text, slice it by markers, regex it,
  eval a transplanted snippet, or assert that a list of names equals a list of files): if your change breaks one, or
  it only covers code you deleted, delete the test file and record it. Do not repair it.
- **Behavioural tests** (they import and run a module, drive a page, or run a real process): keep them working.
  Update imports or expectations when you deleted the feature they cover (delete the cases for a deleted feature).
- **Playwright specs** under `test/browser`: delete specs or cases for deleted features; fix imports. Do not run the
  whole suite; you may run one spec you changed.
- **Quint models, manifests and refinement harnesses** (`specs/quint/**`) and **LemmaScript** (`LemmaScript-files.txt`,
  `specs/lemma/**`): if a model, manifest entry or proof covers only code you deleted, delete it with the code. If it
  covers code that stays but pins text you changed, do not attempt the port: record the pin in your ledger. A later
  stage ports the harnesses.
- Android instrumentation classes: when you delete or rename one, update `scripts/android-instrumentation.ts`
  registries and the other runner lists named in `cross-file-actions.md` §2.1 in the same change.

## Verification before you finish

- Renderer: `npx tsc --noEmit` must show no errors in files you own. Serial implementers (stage A) must leave the
  whole of `npx tsc --noEmit`, `npm run --ignore-scripts build` and `npm run audit:bundle` passing.
- Parallel implementers: other people's files may be mid-edit, so judge only errors in your files and errors your
  change causes in importers (fix those importers minimally).
- Android: no Gradle assemble. Check Java by reading every caller of anything you changed (`git grep`), including
  reflection, manifest and resource references. If `./gradlew -p android :app:compileDebugJavaWithJavac --offline`
  can run within the disk limit, use it; if it cannot, say so.

## Ledger

Write `docs/simplification-audit/ledger/<your unit id>.md` with these sections:

- **Done**: what changed, by file, one line each, with the pattern or decision ID.
- **Deleted tests and formal artefacts**: path and kind (source-text / transplant / feature deleted).
- **Pins left broken**: file, what pins it, what is needed.
- **Skipped**: report findings you did not apply and why (open question, wrong, risky without a test).
- **Verification**: commands run and their result, stated exactly. If something was not run, say so.

Return a short structured summary; the ledger holds the detail.
