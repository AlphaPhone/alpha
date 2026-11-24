# test/voice-host-absent-admission.test.mjs
- Lines: 133 | Kind: tooling (real `verifyVoiceHost` from `scripts/voice-host.ts` on synthetic product trees) | Verdict: MERGE into `test/release/voice-host.test.ts` (with `voice-host-record.test.mjs` and `android-stage-voice-models.test.mjs`)
- Covers: the developer lane (`allowAbsentRuntime`) reports `not-packaged` only when voice staging is genuinely absent; any partial, linked, unknown or overlay voice payload is refused; required mode still enforces pin and schema. Duplicates: `voice-host-record.test.mjs:98-101` (absent vs required on a staged fixture). Callers/importers: `npm test` glob. Reads `android/voice-host/qualified-voice-host.json` and `android/paradee-voice/asr-inputs.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 13 | A8 | Header "Unexecuted source proposal" and the comment on cleanup describe history, not the test. | Rewrite as one line on what it checks. | Low |
| 2 | 94-133 | C5 | Five near-identical overlay cases (`local-speech` release/debug, `standaloneRelease`, `launcherDebug`, Gradle default) differ only in path and expected message. | One table-driven test. | Low |
| 3 | 45-48 | B3 | "truthy non-boolean is not authority" tests the option's type at an internal call boundary. | Drop (typed TS caller). | Low |
| 4 | 80-92 | keep | Symlink refusal (dangling, linked parent) is a real staging-safety gate. | Keep. | — |

## Proposed end state
Merged with the other voice-host tooling tests into one release-tooling file that shares a single synthetic-product
fixture (`test/fixtures/voice-host-product.mjs`). About 10 cases remain: absent ok, stale pin refused in required mode,
present-staging refused, partial/unknown/linked staging refused, one table of overlay paths, raw JNI refused.
