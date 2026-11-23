# test/calendar-connect-policy.test.mjs
- Lines: 47 | Kind: transplant (type-strips 4 files into one `vm` context, slices two ranges out of `runtime/google-connection-ui.tsx` by text markers ` function accountRead(){`, ` async function load(){`, ` function calendarScopeCurrent(`, ` /** Calendar intent:`) | Verdict: DELETE; MERGE the revision-fence cases into `test/integration/connection-cloud.test.ts` via a real import of `runtime/google-agent-access.ts`
- Covers: "Allow Calendar changes" binds the canonical preference revision, so a stale Allow (ABA off→on→off) never enables sync or loses the Gmail choice. Duplicates: `test/google-agent-access.test.mjs` (other chunk; real module). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T2 | Marker slices of a 1k+ line TSX file; breaks on any rename (D7: test-shaped production code). | Delete. | None |
| 2 | 15, 32 | A1 | Builds the legacy envelope `{version:1,legacy,value}` and a `localStorage` legacy copy (line 32 case "legacy prefs migrate"). D1 deletes legacy readers. | Drop the case. | None |
| 3 | 37 | - | ABA with identical bytes but new revision is the one subtle property worth keeping. | Carry to integration over the real `captureGoogleCalendarAccess`/`setGoogleAgentAccess` with an in-memory `browserDocuments`. | None |
| 4 | 42, 45 | - | Replaced account read retires captured intent: lives in the UI slice. | Journey: Settings → Google Calendar → account changes before Allow → no sync started (`journeys/settings.spec.ts`). | Low |
| 5 | 19-20 | C1 | Hand-built `navigator.locks`, `BroadcastChannel`, `Capacitor` globals. | Gone. | - |

## Proposed end state
Deleted. Two cases ("stale Allow after off-on-off keeps OFF and starts no link", "unreadable preferences refuse")
move to the connection/Google integration file over the real access module. The account-replacement case is a step in
the Settings Google journey.
