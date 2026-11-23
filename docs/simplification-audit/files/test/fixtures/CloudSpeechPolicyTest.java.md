# test/fixtures/CloudSpeechPolicyTest.java
- Lines: 19 | Kind: Java fixture, unit of `CloudSpeechPolicy` (+ `CloudDeployment`) | Verdict: MERGE into the Gradle JVM voice suite
- Covers: Cloud speech reaches only `api.eliza.app` in production, staging only with test mocks, arbitrary hosts and null are refused, only the `cartesia` provider is admitted. Duplicates: none. Callers/importers: `test/cloud-voice-profile.test.mjs:52`, which research classifies as a Java-slicing transplant (C+A, delete).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | Small table over a pure policy, but it is the production host allow-list for audio upload: a release rule. | Keep as one table-driven method in the voice suite. | Medium if deleted |
| 2 | importer | T2 | The importer also slices other Java, so the fixture outlives it only if moved. | Move before deleting the importer. | Low |

## Proposed end state
`cloudSpeechHostAndProviderAdmission` in the Gradle voice suite, next to `KeyboardDictationPolicy` and
`CloudVoiceLimit` cases (cross-file-actions suggests one voice-policy class). Fixture deleted from `test/`.
