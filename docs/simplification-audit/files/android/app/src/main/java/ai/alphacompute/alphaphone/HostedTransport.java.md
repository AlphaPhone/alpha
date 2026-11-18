# android/app/src/main/java/ai/alphacompute/alphaphone/HostedTransport.java
- Lines: 48 | Role: HTTP transport to a Cloud-hosted or paired remote agent for hosted results (verify identity, bounded read, ack). | Verdict: DELETE (owner decision P15) / else SIMPLIFY
- Importers: `HostedDelivery.openTransport` for non-`resident` modes only. Text/path pins: `scripts/android-instrumentation.ts`; `specs/quint/refinement/native/hosted-inbox.mjs`; `test/native-plugin-teardown.test.mjs:113` (counts `timer.schedule`), `test/resident-result-transport.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A3/P15 | Serves only `cloud` (dedicated Cloud runtime) and `remote`/`local` (paired agent) modes - PRD forbids hosted-agent pairing and Cloud hosting Alpha's agent. | Delete with the non-resident modes in `HostedDelivery`. | high (owner decision) |
| 2 | 12, 18-19 | D7 | `Connections` interface + 4-arg constructor for injecting connections; no caller uses it (grep `new HostedTransport(`: only the 3-arg call in HostedDelivery:17). | If kept: delete the interface and constructor overload. | none |
| 3 | 30 | C3 | Bounded response read loop (1.1 MB). | Shared `BoundedIo`. | low |
| 4 | 26 | C3 | HttpURLConnection setup copy. | Shared `Http` helper. | low |
| 5 | 37-44 | D8 | 1,000-char identity verification lines. | Formatter / extract `verifyCloud`, `verifyPaired`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Guard | interface | 11 | HostedInbox.Fence, NativeDigestSources.Guard | shared Guard |
| Connections | interface | 12 | none | delete |

## Proposed end state
Deleted if resident-only; otherwise ~40 lines without the injection seam. Estimated lines after: 0.

## Verification
`test/resident-result-transport.test.mjs`, `test/native-plugin-teardown.test.mjs`.
