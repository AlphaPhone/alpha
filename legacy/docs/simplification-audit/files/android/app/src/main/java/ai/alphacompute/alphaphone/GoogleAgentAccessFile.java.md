# android/app/src/main/java/ai/alphacompute/alphaphone/GoogleAgentAccessFile.java
- Lines: 38 | Role: Atomic writer of the owner's Gmail/Calendar agent-write switches file read by the on-device managed Google host. | Verdict: KEEP
- Importers: `AlphaLocalAgentPlugin`. Text/path pins: `specs/quint/services/manifest.json`; `specs/quint/refinement/{native/resident-coordinator.mjs,services/NativeGoogleAccessFileTraces.java,services/native-google-access-file.{md,mjs}}`; `test/native-google-agent-host-access.test.mjs`, `test/fixtures/GoogleAgentAccessFileTest.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | D7 | "Capacitor-free so the host JVM tests can run it." | Drop the sentence; design is fine on its own. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| NAME | const | 20 | upstream managed Google host reads the same file name (.eliza) | stay |

## Proposed end state
Unchanged. Estimated lines after: 38.

## Verification
`test/native-google-agent-host-access.test.mjs`.
