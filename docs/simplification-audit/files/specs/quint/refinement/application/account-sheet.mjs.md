# specs/quint/refinement/application/account-sheet.mjs
- Lines: 178 | Kind: Quint refinement harness driving the real renderer in Chromium (Vite dev server + Playwright), with one source-marker injection | Verdict: KEEP model, PORT harness (drop marker and hash ceremony)
- Covers: Settings → Account sheet navigation, provider sub-page, sign-out review, owner switch fencing the retained confirm callback, and confirmed sign-out removing only the Cloud credential, against `AccountSheet.qnt` (33 lines, live). Duplicates: Account/Cloud plan Playwright specs that use the same helpers (`test/browser/helpers/native-cloud-plan-fixture.ts`, `test/browser/flag-off-android.ts`); `test/subscription-entitlement.test.mjs` touches the same surface. Callers/importers: `index.mjs`, `test/quint-account-sheet-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 89-91, 98-101 | T10 | Rewrites `apps/app/src/runtime/connection-ui.tsx` at the marker `'  if (!visible) {'` (must occur exactly once) to leak React locals `accountSection`/`signOutAccount` into `window.__quintAccountLocal`, served through a Vite `transform` plugin. Blocks the `connection-ui.tsx` split (D1 god module). | Derive `s.section` from the DOM (heading "AI connection" visible ⇒ provider) and `s.review` from the "Sign out?" heading plus the fixture's `authorized` log/current fixture user. No product change needed. | Med |
| 2 | 63-84 | B5 | Hashes every file in `apps/app/src`, `.eliza/client-features`, the Vite config import graph (esbuild metafile), tesseract/pdf-lib assets, licenses, `package-lock.json`, and test helpers; asserts the `app.config.json` hash equals the captured one. Pure evidence ceremony; also why this harness re-runs on any renderer change. | Delete lines 63-84 and the `driverHashes`/`loaded` checks; pass `sources: [driver, product]` (or none once receipts go). | Low |
| 3 | 111-122, 144-150 | T6 | `page.evaluate(import('/src/runtime/connection-ui.tsx'))`, monkey-patching `connectionController.cloudSignOut` and `getSnapshot`, and reading React props via `__reactProps$` to grab the confirm callback. | Keep the controller observation (it is the model's observation boundary) but get the controller once through a dev-only hook the e2e harness already uses, not dynamic import. The owner-switch case is legitimately white-box; keep it but name it as such. | Med |
| 4 | 20-45 | T7 | Hand-written Capacitor `nativePromise` fake for `Agent` provider methods; the same fake shape exists in Playwright Account specs. | Move into `test/browser/helpers/native-cloud-plan-fixture.ts` (one Agent-provider fake) and import here and in the journey. | Low |
| 5 | 62, 65 | B3 | Re-validates `app.config.json` appId shape to locate generated `CloudDeployment.java` only for hashing. | Delete with #2. | None |
| 6 | 104-166 | (keep) | Five real-UI scenarios through Chromium (navigation, cancel, owner switch, confirmed sign-out, direct-mode sign-out). | Keep. These are also the best e2e coverage of Account sign-out. | – |
| 7 | – | Runtime | Vite server + Chromium + 5 pages, up to 90 s wait each; one of the slowest application harnesses. | Run in the formal lane only when `connection-ui.tsx`/Account files or the model change. | – |

## Proposed end state
~110 lines: Vite + Chromium as now, unmodified product source, DOM-derived section/review, shared Agent-provider fake,
no hashing. Consider making the same five scenarios the `journeys/settings.spec.ts` Account section and calling
`checkTraces` from there, so the journey and the refinement are one run instead of two.
