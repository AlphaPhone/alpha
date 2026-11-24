# test/voice-prepared-navigation.test.mjs
- Lines: 76 | Kind: transplant (whole `apps/app/src/runtime/view-navigation.ts` type-stripped with imports regex-removed and rebuilt via `new Function` with 7 injected names; `prototype/agent-adapter.ts` sliced between `  function openInternalView(` and `  function context(shell:`, and between `  p.applyRealtimeVoiceNavigation = async function(` and `  p.sendVoiceTurn = async function(`; imports three `.eliza/client-features/packages/core` modules) | Verdict: DELETE (carry one case)
- Covers: realtime voice navigation claims, commits through the shell callback, then acknowledges; malformed bindings, refused claims and owner rotation never execute or acknowledge; old workflow/Home ids at old paths are accepted; a path of another view is refused before any claim. Duplicates: `test/browser/voice-owned-navigation.spec.ts` (claim/ack ordering, held claim/ack with Stop, owner change refuses continuation), `test/browser/view-navigation.spec.ts` (owner change, switch failure), `view-navigation-settle.test.mjs`, Quint `specs/quint/refinement/application/voice-owned-navigation.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-16 | T2/D7 | Rebuilds `ViewNavigationClient` from text and cuts two methods out of the 2.1k-line `agent-adapter.ts` by two-space-indented markers; blocks D1 split of `agent-adapter.ts` and the formatter. | Delete. | Low |
| 2 | 38-53 | T4 | Claim → commit → ack ordering and failure paths duplicate `voice-owned-navigation.spec.ts`. | Drop. | Low |
| 3 | 71-76 | gap | "Refuses a path of another view or an unknown id before any claim" is a safety rule (no claim for an unknown view). | Carry one parameterised case into `journeys/voice.spec.ts` (voice navigation event with mismatched id/path → no `/api/views/interact-claim` request, view unchanged). | Medium |
| 4 | 71-73 | A1 | "older workflow and Home ids at their older paths" (`/apps/workflows`, `/home`): compatibility with older agent payloads. | Owner question: is the agent still able to send these? If not, delete the alias acceptance with the test. | Low |

## Proposed end state
File deleted. One case in `journeys/voice.spec.ts`. The Quint harness `voice-owned-navigation.mjs` must be checked for
the same agent-adapter markers (formal port, T10).
