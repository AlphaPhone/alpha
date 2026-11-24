# test/browser/document-summary-note.production.spec.ts
- Lines: 143 | Kind: Playwright, `production` project, a real user journey (J03) on `flag-off-android.ts` with `document` (s0/r28) | Verdict: **MERGE into `journeys/notes.production.spec.ts`** (both tests)
- Covers: J03 on Android. A document picked in Files (Documents) is opened, its excerpt trimmed and sent once with only the trimmed text. The resident answer offers a "Review summary note" card; Cancel saves nothing; Save keeps one note whose `documentSource` has the exact name, size and SHA-256 and a `b1:` reference. After a restart the source link reopens exactly those bytes. Second test: a reconnected resident session withdraws the pending summary review and saves nothing. Duplicates: `journey-j03-document-analysis.spec.ts` (chromium, dev) covers J03 from an Inbox attachment; `journey-core-loops.production.spec.ts` covers J05 on the same summary path (cross-referenced at line 12). Importers: none. Helpers: `flag-off-android`, `helpers/native-notes`, `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30 | P2 | `savedNotes` decodes the Keystore slot `notes-records:v1:device` (`currentRaw` envelope) through the harness. This is a bridge-boundary read, so it is acceptable, but it pins the persisted envelope shape. | Keep. Name the slot key in one harness constant shared with the other Notes production specs. | Low |
| 2 | 63-68, 120-126 | C3 | The setup (fence → flagOffAndroid → residentHome → no sign-in notice → openRetainedNativeNotes → returnToApps) is repeated in both tests. | Turn it into a `beforeEach` in the merged block. | none |
| 3 | 95-98 | C3 | The restart wait (`Agent.start` poll plus scrim gone) duplicates `residentHome` without the `goto`. | Add a `residentRestart(page)` helper next to `residentHome`. | none |
| 4 | 106 | — | The comment notes that the source details show "1 KB" for a 66-byte file. That is the product's rounding; the assertion is fine. | Keep. | none |
| 5 | 1-17 | — | The evidence-boundary header is accurate. | Keep once at the top of the merged file. | none |

## Proposed end state
A "J03 document summary" `describe` with two tests in `journeys/notes.production.spec.ts`, sharing a `beforeEach`. It
uses the harness bridge with a `document` option. The assertions are unchanged.
