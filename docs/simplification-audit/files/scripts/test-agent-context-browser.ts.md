# scripts/test-agent-context-browser.ts
- Lines: 218 | Kind: Playwright-in-a-script (own `chromium.launch`), `page.evaluate(import('/src/...'))` module calls (T6), hand-written Capacitor fakes | Verdict: REWRITE as journeys in `test/browser/journeys/chat.spec.ts` + `camera-photos.spec.ts`; sanitizer cases MERGE into `test/phone-context.test.ts`
- Covers: selected Photos video reaches chat as an opaque `{kind,id,revision}` (no private path/caption/library revision); chooser/background/pagehide mark context sensitive, abort the pending turn and invalidate proposals, then a fresh request works; `sanitizePhoneContext` bounds folder/own-notification/settings identities; HTTP 429 and typed `rate_limited` render the safe message, never auto-retry, keep input/history/session, explicit retry succeeds. Duplicates: `test/context-selection.test.mjs` and `test/chat-ui-failed-turn.test.mjs` (host transplants of similar rules), `test/browser/proposal-recovery.spec.ts`. Callers: `test/browser/adapters.spec.ts:6` spawns it (T9) with `ALPHA_CONTEXT_TEST_URL`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-18, 218 | T9 | Launches its own Chromium inside a Playwright test that only spawns it; no traces, retries or fixtures. | Rewrite as real Playwright tests on the shared `test.extend` harness. | Low |
| 2 | 53-67, 84-105, 189, 208 | T6 | Attaches a fake transport and reads state through `import('/src/runtime/alpha-client.ts')` / `connection-ui.tsx`. | Drive through the UI and the resident/agent stub server (`test/browser/resident-stub.ts`); assert on rendered text and on requests the stub received. | Medium |
| 3 | 27-45, 157-178 | T7 | Two inline Capacitor bridge fakes. | Use the shared typed bridge fake (AlphaPhotos, AlphaConnection, AlphaNotifications, AlphaVoiceCloud). | Low |
| 4 | 202 | T8 | `waitForTimeout(1200)` to prove no automatic retry. | Assert the stub received exactly one POST after the error is rendered and after the next user action. | Low |
| 5 | 115-147 | T6 | Sanitizer cases are a unit test in a browser. | Move to `test/phone-context.test.ts` (direct import; it is the privacy boundary): folder only in Files with revision, no paths, external/hosted notifications rejected, sensitive/password settings rejected. | Low |
| 6 | 183-187 | D5 | Uses "Local development agent" pairing; dev-only connection path kept by D5/D19 while the e2e harness needs it. | Keep via the harness's connect helper. | — |

## Proposed end state
`chat.spec.ts`: "rate-limited send shows safe error, no automatic retry, explicit retry succeeds" (both
wire forms as a parameter); "leaving the screen cancels the pending turn and stale proposal".
`camera-photos.spec.ts`: "asking about a selected video sends only its opaque identity". Sanitizer
cases in `test/phone-context.test.ts`. Delete this script and its entry in `adapters.spec.ts`.
