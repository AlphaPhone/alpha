# test/fixtures/GoogleAgentAccessFileTest.java
- Lines: 19 | Kind: Java fixture, single-class unit (`GoogleAgentAccessFile.in/write`), driven by the node test with arguments | Verdict: MERGE into the Gradle JVM inbox-google suite (or into the importer's agent-side integration if it stays in node)
- Covers: the owner's Google switches file is written owner-only (`rw-------`) with no temporary file left behind. Duplicates: none. Callers/importers: `test/native-google-agent-host-access.test.mjs:27` (the importer then checks the agent side reads the file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 / T9 | The value of the test is the cross-process contract: Java writes, the agent reads. Split across a node runner and a Java main with argv. | Keep it as one integration where it lives today if the importer's agent-side half stays; otherwise one Gradle method for permissions and atomicity. | Low |

## Proposed end state
Either a Gradle JVM method `googleAccessFileIsOwnerOnlyAndAtomic`, or kept as the Java half of the importer's
integration. Decide with the importer's review.
