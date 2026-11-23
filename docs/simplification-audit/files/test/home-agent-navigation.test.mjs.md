# test/home-agent-navigation.test.mjs
- Lines: 35 | Kind: transplant (concatenates four generated upstream files under `.eliza/client-features/packages/core/src/**` and `apps/app/src/runtime/view-navigation.ts`, strips types and imports, runs in `vm` with stubs) + one unit case importing `alphaViewPaths` | Verdict: DELETE
- Covers: an agent `VIEWS` action with a navigation binding reaches each Home destination, alias paths are accepted for older ids, mismatched/unknown paths are refused before any claim. Duplicates: `test/browser/view-navigation.spec.ts` (claimed Notes navigation, refusals before effect, owner change, "canonical … handoff" and "Automations alias still refuses noncanonical path"), `view-navigation-react.spec.ts`, `voice-owned-navigation.spec.ts`. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | T2 / T5 | Strips and concatenates upstream sources with regex import removal; mostly exercises upstream `ViewNavigationClient`. | Delete. | Low |
| 2 | 12, 17-22 | T4 | Per-destination loop duplicates `view-navigation.spec.ts:248` (canonical handoff per registered view). | — | Low |
| 3 | 24-33 | A1? | "Older ids keep the paths they were accepted with" — aliases emitted by the upstream agent are a live protocol, not stored data; keep the rule. | Ensure `view-navigation.spec.ts` keeps one alias-accepted and one mismatch-refused case (it has both). | Low |

## Proposed end state
File deleted. `view-navigation.spec.ts` (to be folded into `journeys/chat.spec.ts` or `journeys/home-shell.spec.ts`)
already owns per-view delivery, alias acceptance and refusal-before-claim.
