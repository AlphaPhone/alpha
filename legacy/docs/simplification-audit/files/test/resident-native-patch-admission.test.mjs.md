# test/resident-native-patch-admission.test.mjs
- Lines: 46 | Kind: source-text / inventory (sha256 pins of four `vendor/eliza` Java files; regexes over upstream source) + tombstone check | Verdict: DELETE
- Covers: the pinned upstream resident service/IPC sources are the reviewed bytes; an obsolete patch slot is refused. Duplicates: `upstream.lock.json` pin plus submodule review; `scripts/prepare-patched-native.ts` refuses unknown slots on every build. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-30 | T1/T5 | Hash pins of upstream files: every reviewed submodule bump must edit this test; the 15-line changelog comment narrates upstream PRs (A8). | Delete. | Low |
| 2 | 31-41 | T1/T5 | Regex/indexOf ordering over upstream `ElizaAgentService.java`, `IpcStartupRecovery.java`. | Delete. | Low |
| 3 | 43-46 | A8 | Asserts a retired patch file is absent and its slot name refused: a tombstone test. | Delete. | Low |

## Proposed end state
File deleted. Upstream source identity is the submodule pin; behaviour is tested upstream and by the resident Quint
refinement.
