# specs/quint/native/KeyboardDictation.qnt
- Lines: 42 | Kind: Quint model (live) | Verdict: KEEP (fix weak invariant; drop duplicate replay in host test)
- Covers: the explicit keyboard-dictation gate (`KeyboardDictationPolicy`): one insert per current capture, cancelled or replaced captures never insert, a changed field or account refuses the result. Duplicates: `test/keyboard-dictation.test.mjs:24-` runs `quint test`/`quint run` on this spec and replays it against `KeyboardDictationPolicy` with its own generated `KeyboardDictationConformance.java` (same job as `refinement/native/keyboard-dictation.mjs` + `KeyboardDictationTraces.java`); `KeyboardDictationCloud.qnt` covers the request layer. Callers/importers: `quint:check` (4 runs); `refinement/native/keyboard-dictation.mjs` from `refinement/native/index.mjs:188`; `test/keyboard-dictation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32 | — (weak spec) | `AtMostOneInsertPerCapture = inserted <= generation / 3` is an arithmetic proxy that depends on every capture costing exactly three generation bumps (open, start, accepted finish); it would still hold for some double inserts after extra `cancel`/`open` bumps. | State it directly: record `lastInsertCapture` (the generation of the capture that inserted) and require each insert to come from a distinct `transcribing` capture with the current ticket. | Low |
| 2 | 3-10 | D8 | `op`, `inputTicket`, `sameEditor`, `account` are observation-only variables set by `mark` in every action; one-space indentation unlike siblings. | Fold into one `State` record like the siblings; keep the observed fields if the Java replay reads them. | None |
| 3 | test duplication | T4 | `test/keyboard-dictation.test.mjs` replays this model a second time with a different hand-written Java harness, and also contains a JVM unit test of the policy and regexes over `AndroidManifest.xml` (lines 10-15, T1/T3). | Delete the Quint replay block from the host test (keep the refinement harness). The rest of that test file is reviewed in the host-test chunk. | Low |
| 4 | manifest `sources` | T10 | Pins `KeyboardDictationCloud.java`, `AlphaKeyboardDictationService.java` and two XML resources; the harness compiles only `KeyboardDictationPolicy.java`. | Trim to `KeyboardDictationPolicy.java`. | Low |

## Proposed end state
Model kept with a direct one-insert-per-capture invariant and a single `State` record. One replay
(`refinement/native/keyboard-dictation.mjs`); the duplicate Quint replay inside `test/keyboard-dictation.test.mjs` is
removed. Sources list the one compiled file.
