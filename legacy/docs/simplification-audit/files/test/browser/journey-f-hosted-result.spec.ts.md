# test/browser/journey-f-hosted-result.spec.ts
- Lines: 93 | Kind: Playwright journey, `chromium` project but on its **own** in-process Vite server built with `VITE_LOCAL_AGENT=1` (`hosted-harness.ts` `startHostedServer`, serial), 1 test (240 s); UI-driven plus a ledger read via `/src/browser/hosted-results.ts` | Verdict: MERGE into `journeys/notifications.spec.ts` ("digest result notices", beside the two cases carried from `dev-hosted-journey.spec.ts`)
- Covers: two scheduled-digest results saved and acknowledged before any notice, the ledger holds no result text, each notice tapped after a restart opens exactly its own result once, the other stays posted, a final restart shows no notice and nothing is re-offered. Duplicates: `dev-hosted-journey.spec.ts` (notice tap opens retained output, same harness), `dev-hosted-results.spec.ts` (consume-once, module-level). Callers/importers: none; imports `hosted-harness.ts` (also used by `dev-hosted-journey.spec.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-19 | P1/T8 | Starts a second Vite dev server per file (fresh cache dir, cold transform) because the local-agent flag is a build define; `mode:'serial'`. Notable runtime cost, and it duplicates `dev-hosted-journey`'s server. | One worker-scoped `hostedServer` fixture shared by both hosted cases (or run the main dev server with the flag in a dedicated project). | Low |
| 2 | 23, 25, 32, 37-38 | T6 | `ledger()` imports `hosted-results.ts` `readRaw()` for phases and the "no result text in the ledger" check; the expected run id is computed from ledger timestamps. | Keep one harness read for the privacy property (no text in the ledger); assert "which result opened" from the panel's `Opened from notification` article id, which the test already does (56-59). | Low |
| 3 | 89 | T6 | Reopens the panel by dispatching `alpha:hosted-digests` on `window`. | Use the visible Workflows → Scheduled digests route. | Low |
| 4 | 9-12, 1-8 | A8 | Header explains why it lives outside journey F. | One line. | none |
| 5 | — | Q-HOST | Hosted digest results are an open owner question (see `dev-hosted-journey.spec.ts.md` #6, Q-HOST-1/5). | If hosted digests are removed, delete this file with `hosted-harness.ts`. | — |

## Proposed end state
- Delete the file; one case in `journeys/notifications.spec.ts`: two results, restart, tap newest → only its article marked, restart, tap the other, final restart no notice, ack cursor unchanged.
- Shared hosted-server fixture for this case and the `dev-hosted-journey` cases.
- One harness read for the redacted ledger; navigation through visible controls.
- Expected ~45 lines.
