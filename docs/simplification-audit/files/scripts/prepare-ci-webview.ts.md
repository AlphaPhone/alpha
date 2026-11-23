# scripts/prepare-ci-webview.ts
- Lines: 40 | Kind: CI fixture preparation | Verdict: MERGE into `scripts/ci/prepare-emulator.ts` (see `prepare-ci-emulator.ts`)
- Covers: binds upstream's hosted WebView provider provisioner with Alpha's forbidden package prefixes and an explicit disposable-fixture acknowledgement. Duplicates: none. Callers/importers: `scripts/ci/emulator-suite.ts:107` (browser-reading step, android-emulator.yml); `test/ci-emulator-evidence.test.mjs:221,289` (command string / stubbed execution).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | D7 | Re-exports upstream `candidate` (test convenience). | Drop. | none |
| 2 | 12-18 | B2 | Two local types plus a cast to pass options upstream's typing lacks. | Upstream `.d.ts` follow-up. | none |
| 3 | 20-35 | D4 | `main(options)` with injectable environment/sdk/outputDirectory used only by tests. | Plain top-level call. | none |
| 4 | 23-25 | B3 | Re-checks an env value the only caller (`emulator-suite.ts:107`) hardcodes. | Keep: it is the safety interlock that stops running on a non-disposable device. | — |

## Proposed end state
~15 lines as the `--webview` mode of `scripts/ci/prepare-emulator.ts`.
