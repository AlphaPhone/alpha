# test/connection-presentation-state.test.mjs
- Lines: 1011 | Kind: transplant (largest in the suite: about 30 `section()` slices of `connection-ui.tsx` across ~8 separately assembled vm programs, including slices of `send()` cut mid-statement and re-closed with hand-written `}`s) | Verdict: DELETE (after the `connection-ui.tsx` split exposes the controller as an importable module; carry listed cases)
- Covers: connection modal ownership (sign-in required vs. dismissible), navigation blocking, action-history refresh fences (epoch/owner/abort), send/voice preflight with unknown vs. zero balance, offline composer refusal toasts, plan-recheck rate limiting on network return (Root #743, ~25 cases), admission retiring a waiting network return, service verification identity checks, offline saved-credential restore, own-provider gate, provider switch during a streaming reply. Duplicates: `test/connection-recovery-state.test.mjs` (same `productionCloudSignInRequired` slice, lines 17-30 there vs 69-87 here), `test/connection-step-contracts.test.mjs` (same `onView` slice), `test/browser/connection-startup-presentation.spec.ts`, `connection-activity-presentation.spec.ts`, `dev-network.spec.ts`, `dev-cloud-scenarios.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T9 | `ALPHA_PRESENTATION_SOURCE` knob nothing sets. | Delete. | Low |
| 2 | 10-16, 90-108, 343-348, 457, 510, 637-643, 661-666, 755, 838-845, 975-979 | T2 / D7 | Each slice depends on the next marker comment or statement text; markers such as `'// P-43: where'`, `'/*\n * DEVELOPMENT INFRASTRUCTURE'` exist in product code so this test can cut there. Blocks the `connection-ui.tsx` split (D1) and Prettier (D9). | Delete; remove the marker comments in the product file with it. | Low for the deletion; the coverage is the issue (row 5). |
| 3 | 69-76 | T2 | Evaluates a `useEffect` callback by text, with a fallback name (`signInEntryRequired` vs `productionSignInRequired`) to survive a rename. | Delete. | Low |
| 4 | 17-24 | T3 | `fixture()` supplies ~40 fake globals; most assertions check the fakes' interplay. | Delete. | Low |
| 5 | 339-668 | — | Plan-recheck-on-network-return (Root #743) is the only coverage of the once-a-minute limit, its lifting on an offline→online edge, and retirement by admissions/provider-class changes. Not covered by Playwright. | Carry as `test/integration/connection-cloud.test.ts` cases after `recheckPlanOnReturn`/`networkChanged` become methods of an importable controller (stage F split): limit holds; one online edge lifts once; A→B→A account change retires the waiting return; running check answers the return. | High if deleted before the split. |
| 6 | 26-87, 699-753, 863-970 | — | Modal/sign-in gating: signed-out/expired stays modal, refused sign-in vs. other offline errors, unresolved restore does not probe, own provider skips Cloud gate. | Move to `journeys/connection-cloud.spec.ts` (production project for the modal rules, chromium for own-provider). Most are already partially there. | Medium |
| 7 | 143-325 | — | Preflight: unknown balance is not zero; Android native "no network" refuses a resident send even if WebView says online; a refused composer send restores text without a toast. | Composer refusal and offline cases → `journeys/chat.spec.ts`; native-network precedence → integration case importing `native-network.ts` (already imported at line 7) with the controller. | Medium |
| 8 | 755-835 | — | `verifyService` rejects credential replacement during identity lookup and unexpected identity. | Integration case in `connection-cloud.test.ts` once `verifyService` is exported. | Medium |
| 9 | 998-1011 | — | Provider switch during a streaming reply waits for the reply. | `journeys/settings.spec.ts` (AI provider) with a held reply. | Low |

## Proposed end state
File deleted. Its distinct behaviours (rows 5–9, about 15 cases out of ~70) live in `test/integration/connection-cloud.test.ts`
and `journeys/connection-cloud.spec.ts` / `chat.spec.ts`. Prerequisite: the stage-F split of `connection-ui.tsx` exports
`productionCloudSignInRequired`, `replyFailure`, `verifyService`, `refreshActionReview` and a controller whose
`recheckPlanOnReturn`/`networkChanged` take injected ports. Until then, deleting this file loses the Root #743 coverage.
Runtime: ~1–2 s, not notable.
