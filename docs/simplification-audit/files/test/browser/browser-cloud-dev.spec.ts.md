# test/browser/browser-cloud-dev.spec.ts
- Lines: 139 | Kind: Playwright spec, chromium; each test starts its own Vite dev server (`createServer`) with a dev-bridge middleware; Node-side imports of product/script modules (P15) | Verdict: DELETE (research's "merge into browser.journey" is a misread: "browser" here is the browser host, not the Browser app)
- Covers: the browser dev host restores an existing host Cloud credential from a profile directory, uses Cloud STT/TTS, opens billing, signs out (revokes key, deletes `credentials.json`), signs in again via the diagnostic browser route; and the flag-off resident speech route through `local-agent-dev-bridge`. Duplicates: production Cloud sign-in/out journeys (`native-cloud-*`), voice journeys. Callers/importers: none; imports `scripts/browser-cloud-dev-bridge.ts`, `scripts/local-agent-dev-bridge.ts`, `apps/app/src/runtime/cloud-deployment.generated.ts`, `helpers/cloud-plan-settings.ts`, `flag-off-android.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 34, 120 | cost | Two extra Vite servers per run with their own cache dirs; slowest specs in the shard. | Delete. | None. |
| 2 | 10-12 | P15 | Top-level Node imports of product and script modules; a missing `.eliza` projection breaks `--list` for the whole project. | Delete. | None. |
| 3 | 39-124 | T6/P2 | 15 `connectionController` imports, `BrowserVoice` instance poking, `Audio` replaced, `getSnapshot` overridden. | Delete. | Low. |
| 4 | 15-103 | P7 | Covers the dev bridge's credential profile and revoke-on-sign-out. That is tooling. | If the dev bridges stay (owner), a Node integration test of `createBrowserCloudDevHandler` (profile read, revoke, file removal) belongs in `test/`, without a browser. | Medium. |
| 5 | 138-139 | B4 | `test.beforeEach` declared after the tests at the bottom of the file. | n/a. | None. |

## Proposed end state
File deleted. Owner decides whether the two Vite dev bridges keep a Node integration test (`test/dev-bridges.test.ts`); product sign-in/out and Cloud voice stay covered by the production-lane journeys.
