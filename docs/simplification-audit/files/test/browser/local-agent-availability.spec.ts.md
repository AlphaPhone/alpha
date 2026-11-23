# test/browser/local-agent-availability.spec.ts
- Lines: 97 | Kind: Playwright spec, `chromium` (dev server, test-mocks UI), 3 tests (loop over packaging `checking/unavailable/available`); hand-written `window.Capacitor` with 5 plugins | Verdict: MERGE into `journeys/connection-cloud.spec.ts`
- Covers: the connection chooser reflects native agent packaging (Checking, unavailable, available), saving a Cerebras key restarts the agent, and Remote agent / Development Cloud / Mock mode sections stay usable. Duplicates: `local-provider-settings.spec.ts` (key save, restart), `local-agent-stop.spec.ts` (Start local agent), mock-mode entry in startup specs. Callers/importers: none; imports `openConnectionDiagnostics`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-50 | T7, C3 | Third hand-written Capacitor fake for Agent/AlphaConnection/ElizaSystem (same slot-store `secureCompareExchange` block as `local-agent-stop.spec.ts:56-60`). | Use `helpers/resident-agent-plugin.ts` plus one shared secure-slot fake. | Low. |
| 2 | 62-65 | B2 (product) | "The local agent is unavailable in this version" is the test-mocks string of `RESIDENT_UNPACKAGED` (`connection-ui.tsx:1413`); production reads "No on-device agent". Reachable only on `--allow-unpackaged-runtime` developer APKs. | Carry one "unpackaged: Start disabled, no key field" step; owner question whether the unpackaged state needs a product string at all. | Low. |
| 3 | 58-61 | - | "Checking" is a transient state held by never resolving `getStatus`. | Drop. | Low. |
| 4 | 66-80 | T4 | Key save → restart refused overlaps `local-provider-settings.spec.ts` test 1. | Drop here. | Low. |
| 5 | 82-95 | D5 | Remote agent, Development Cloud and Mock mode are dev/hosted surfaces (D5/D6). | Keep one mock-mode entry step in the dev-surface smoke, not here. | Low. |

## Proposed end state
File deleted. `journeys/connection-cloud.spec.ts` "resident agent" section: unpackaged runtime disables Start and hides provider keys (one step); key handling is the provider test below.
