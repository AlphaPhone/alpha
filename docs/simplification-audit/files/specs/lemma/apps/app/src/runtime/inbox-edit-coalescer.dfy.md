# specs/lemma/apps/app/src/runtime/inbox-edit-coalescer.dfy
- Lines: 24 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that the unsaved-draft debounce delay is in [0, delay] and never passes `first + maximumWait`. Models live product code `apps/app/src/runtime/inbox-edit-coalescer.ts` (exists; functions `coalesceDelay` still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/inbox-edit-coalescer.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair. | Low |

## Proposed end state
Unchanged generated companion. Overlaps in subject with Quint `InboxEditCoalescer` (`refinement/services/inbox-edit-coalescer-replay.mjs`), which checks timing behaviour, not this arithmetic; both stay.
