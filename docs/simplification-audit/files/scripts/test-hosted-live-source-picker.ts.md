# scripts/test-hosted-live-source-picker.ts
- Lines: 30 | Kind: browser test in a script: Playwright *library* (not test runner) drives a fixture React page (`scripts/fixtures/hosted-live-source/entry.tsx`) that mounts the real `HostedLiveSourcePicker` (`apps/app/src/runtime/hosted-live-source-ui.tsx`) with a fake HTTP agent; the fixture page owns the Review/Confirm buttons | Verdict: REWRITE as cases in `test/browser/journeys/digests.spec.ts` driving the real Digests source picker in the app
- Covers: live Google source selection (account, calendar, window hours), review/cancel without a save, reviewed save body, Cloud grant expiry caps the source, 409/400 save refusal, and a retired owner's late account response not populating the picker. Duplicates: partial in `test/browser/digest-source-renewal.spec.ts` and `journey-d-digests.spec.ts` (source flow through the app). Callers: `test/browser/adapters.spec.ts:6` (chromium project spawns it with `ALPHA_HOSTED_*` env).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | P1 | Runs its own `vite build` of the fixture page on every run, inside a Playwright test that already has a dev server. | Drive the real app page instead; no extra build. | L |
| 2 | 24 | T6 | `page.evaluate(() => window.switchOwner())` backdoor into fixture code. | In the journey, switch owner through the harness's typed Cloud fixture. | M |
| 3 | 18 | B5 | Writes a full-page screenshot to `test-results` that nothing reads. | Delete. | L |
| 4 | 14-25 | D8 | Whole test on four physical lines; inline HTTP router. | One `test()` per case with the shared harness router. | L |
| 5 | 19-22 | T8 | Hand-rolled 5 s race on the held request. | `expect.poll` / route hold in the harness. | L |
| 6 | 3,7 | C5 | `scripts/fixtures/playwright.ts` + `ALPHA_BROWSER_MODULES` exist only so a script can find Playwright from a child process. | Gone when this and `test-inbox-drafts-browser.ts` become specs. | L |

## Proposed end state
`journeys/digests.spec.ts` gets 4 cases on the shared `test.extend` harness (Cloud agent route fixture): (1) zero hours disables review and Cancel posts nothing; (2) calendar source review then Confirm saves exactly the reviewed body; (3) a Cloud-grant source is capped at the grant expiry; (4) a 409/400 save shows "Source access changed before saving" and saves nothing; plus the late-response owner fence. Delete this script, `scripts/fixtures/hosted-live-source/`, and its row in `adapters.spec.ts`.
