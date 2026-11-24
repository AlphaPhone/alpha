# test/browser/startup-permissions-walkthrough.spec.ts
- Lines: 70 | Kind: Playwright chromium, 6 tests (1 loop × 3 viewports); real UI on the browser permission path with web permission APIs replaced in an init script; reaches the dialog through a `connectionController.close()` import and a window event (s4 r17 clk) | Verdict: MERGE into `journeys/startup-permissions.spec.ts`
- Covers: browser (four-permission) walkthrough order and rationale text, no Skip/Back, Escape and system Back do not dismiss, requests only on Allow, camera request is video-only and tracks are stopped, completion record `{version:1,status:'completed',step:4}`; denial shows Check and no re-prompt after reload; a hung notification prompt releases at the 15 s deadline and a late grant is not trusted; the Google panel takes the modal and returning resumes the same step. Duplicates: `startup-access.spec.ts` (native checklist), `post-sign-in-setup.spec.ts`, `browser-startup-permissions.test.mjs` and `startup-permission-completion.test.mjs` (host). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 36, 69 | P2 | Opens the walkthrough with `import('/src/runtime/connection-ui.tsx').connectionController.close()` and the reopen event; opens/closes the Google panel through `googleConnectionController`. | Reach it as a user would (first start after choosing offline, or Settings → Permissions); open Google from Settings → Apps → Inbox → Google & email. | Low |
| 2 | 27 | T5 | Inline WCAG contrast computation (sRGB luma) on one button: a home-built accessibility checker. | Drop; contrast belongs in the accessibility journey's axe pass. | None |
| 3 | 28, 32 | T9 | `process.env.REQUIRED_NO_SCREENSHOTS` gates screenshots; nothing in the repo sets it (grep finds only these two lines). | Remove the knob; keep or drop screenshots unconditionally. | None |
| 4 | 17 | T4 | Three viewports run the full walkthrough to check centring at each. | One full walkthrough at phone width; check centring/overflow only at the other two. | None |
| 5 | 20-26 | B5 | Centre offset ≤1 px and `scrollWidth` checks are layout pins of a "recovered original design". | Keep overflow = 0; drop the 1 px centring pin. | None |
| 6 | 4-13 | T7 | Hand-built `Notification`, `permissions`, `mediaDevices`, `geolocation` fakes. Correct boundary, but repeated across specs. | Harness `browserPermissions({deny})` fixture. | None |

## Proposed end state
In `journeys/startup-permissions.spec.ts` (chromium, browser path): one walkthrough case (order, rationale, no dismiss, requests only on Allow, camera video-only and stopped, completion record, no reappearance after reload); one denial case (Check, no second prompt after reload); one deadline case on `page.clock` (keep as written: it is the only coverage of the 15 s release and the "late grant is not authority" rule); one case that Google sign-in takes the modal and returning resumes the same step. Delete this file.
