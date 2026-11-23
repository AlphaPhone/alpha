# apps/app/src/prototype/mvp-features.ts
- Lines: 41 | Role: product view-admission policy (which views exist in this install) plus the quick-command refusal regex | Verdict: SIMPLIFY + MOVE to `apps/app/src/product/view-admission.ts`
- Importers: 9 (`main.tsx` admitImageContacts, `model.js` isMvpView/DEFERRED_MVP_VIEWS/deferredMvpPrompt, `runtime/device-view-profile.ts` ENABLED_MVP_VIEWS, `runtime/device-actions.ts`, `product/alpha-product.ts`, `contacts-adapter.ts`, `phone-adapter.ts`, `notifications-adapter.ts`, `telephony-attention.ts`).
  Text/path pins: `test/accessibility-coverage.test.mjs:14-16` regexes the literal `export const ENABLED_MVP_VIEWS = new Set([...]);` (T1); `test/aosp-image-capability.test.mjs:39-41` regexes line 23 verbatim (T1); `test/aosp-sms.test.mjs:253` reads it; `test/wallet-disabled.test.mjs:25` strips types and evaluates it; `test/dev-surface-gates.test.mjs:74-82` loads it by path; `specs/quint/application/manifest.json:7007-7042` and `specs/quint/services/manifest.json:3256` pin `ENABLED_MVP_VIEWS/DEFERRED_MVP_VIEWS/admitImageContacts/isMvpView`; `specs/quint/refinement/services/contacts-session-replay.mjs:12`, `test/quint-view-admission.test.mjs:12` sourceModule it; `test/support/feature-parity.mjs:389`; Java comment `AccessibilityViewsInstrumentedTest.java:38`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-10, 12-13, 15, 17 | A8 | History/decision comments and commented-out set members: `// "phone", // Alpha AOSP image only…`, `// "wallet", // Removed from MVP…`, `// Approved October 12 scope: issue #422.` | Delete the commented-out entries and issue/decision narration; keep one doc line: "Phone, Messages, Contacts only on the verified AOSP image with an admitted adapter; Wallet never." | None; but `test/accessibility-coverage.test.mjs` parses the literal body, so re-check its regex still matches. |
| 2 | 10 | A3/A8 | `// Reference definitions and saved user data are retained` — Wallet "retained for restoration". | Remove with the Wallet decision (DECISIONS / research P9). | Owner decision. |
| 3 | 23, 29 | A3 | `"wallet"` in `DEFERRED_MVP_VIEWS` seed and `wallet|pay` in `UNAVAILABLE_PROMPT`. Wallet is never enabled except in the dev profile (line 26). | Keep `pay` refusal (`deferredMvpPrompt` behaviour is user-visible: "not available" toast). If Wallet is deleted, drop `"wallet"` from the seed list; keep `wallet` in the regex so "open wallet" still refuses. | Low; `test/wallet-disabled.test.mjs:42` asserts both. |
| 4 | 20-21, 26, 41 | D3/D9 | Module-level *mutable* `Set`s mutated at import (`ENABLED_MVP_VIEWS.add`) and at runtime by `admitImageContacts` (one-line, 4 branches). Exported mutable sets are a global bus read by `model.js` and `device-view-profile.ts`. | Keep the sets private; export `isMvpView`, `isDeferredView(view)` and `admitImageContacts`. `model.js:5310,5431,5679` switch to `isDeferredView`. `device-view-profile.ts:30` uses an exported `enabledViews()` snapshot. | Medium: Quint manifests pin the two set names (manifest 7007/7011, README:85) and `test/quint-view-admission.test.mjs:19` regexes `DEFERRED_MVP_VIEWS.has(value.view)` in model.js. Update manifests together. |
| 5 | 26, 41 | D5 | `browserDevProfile` branches in a product-policy module (`if(browserDevProfile){…DEFERRED_MVP_VIEWS.clear();}`, early return in `admitImageContacts`). | Move the dev widening into the dev module (dev profile calls an exported `admitAllForDevelopment()`), so the product module has no dev flag import. | Low; `test/dev-surface-gates.test.mjs:74-82` loads both variants. |
| 6 | 37 | D9 | `return !view || !(view === "contacts" ? !browserDevProfile && isMvpView("contacts") : IMAGE_VIEWS.has(view));` double negation over a ternary. | `if (!view) return true; return view === 'contacts' ? browserDevProfile || !isMvpView('contacts') : !IMAGE_VIEWS.has(view);` | None (pure; covered by dev-surface-gates and wallet-disabled tests). |
| 7 | whole file | D11 | Product policy lives under `prototype/` (research §5 "Files in the wrong place"). | Move to `apps/app/src/product/view-admission.ts` (next to `product/alpha-product.ts`, which already imports it). | Path pins listed above must be updated in the same commit. |
| 8 | 41 | D8 | 200-char single-line function. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `IMAGE_VIEWS` | const | 20 | none (derived from `runtime/aosp-image.ts admittedAospViews`) | stays private |
| `PROMPT_VIEWS` | const | 28 | view-alias maps also in `model.js` deep links (`dialer`, `sms`) — not identical | stays |
| `UNAVAILABLE_PROMPT` | const | 29 | none | stays |

## Proposed end state
`product/view-admission.ts`, ~25 lines: two private sets, `isMvpView`, `isDeferredView`, `deferredMvpPrompt`, `admitImageContacts`; no comments narrating issues; no commented-out set members; dev widening exported for the dev profile to call. Wallet entry removed if the owner deletes Wallet. Est. 25 lines.

## Verification
`node --test test/dev-surface-gates.test.mjs test/wallet-disabled.test.mjs test/aosp-image-capability.test.mjs test/aosp-sms.test.mjs test/accessibility-coverage.test.mjs test/quint-view-admission.test.mjs test/contacts-adapter.test.mjs test/phone-adapter.test.mjs`, the Quint application/services manifests check, feature-parity test, `npm run verify`, and the production bundle audit.
