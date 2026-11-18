# specs/lemma/apps/app/src/startup-permission-flow.dfy
- Lines: 64 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that startup permissions are active only with an account or a selected Cerebras setup, never during sign-in, and that the late Ready-card notice appears only for silent starts with an error or one of two connection messages. Models live product code `apps/app/src/startup-permission-flow.ts` (exists; functions `startupPermissionsActiveCore`, `lateReadyNotice` (+ LemmaScript `StringIndexOf` prelude) still exported/used). Duplicates: `specs/lemma/apps/app/src/startup-permission-flow.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair. | Low |
| 2 | 52-63 | D10 / A1 | `lateReadyNotice` keys on the text "did not confirm revoking"; product report startup-permission-flow.ts #7 found no code still produces it (connection-ui writes "check devices"). The proof faithfully certifies a dead branch. | Owner question (cross-file-actions §4): if the branch is removed from the TS, regenerate; the ensures on line 61 goes with it. | Medium: behaviour/copy decision, not a test decision. |

## Proposed end state
Unchanged generated companion until the owner decides the late-notice text rule.
