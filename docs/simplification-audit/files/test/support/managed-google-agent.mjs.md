# test/support/managed-google-agent.mjs
- Lines: 34 | Kind: support adapter (wraps the upstream managed Google host with Alpha's Cloud origins) | Verdict: KEEP, SIMPLIFY
- Covers: gives tests the shared `createManagedGoogleAgentHost`/`createNativeGoogleCloudPort`/`startManagedGoogleAgentHost` from `.eliza/client-features/packages/app/src/runtime/managed-google-agent/index.ts` configured with `productionCloud`/`stagingCloud` from `cloud-deployment.generated.ts`, and re-exports `startNativeGoogleAgentHost` from `scripts/native-google-product-host.ts`. Duplicates: the option bag (userAgent `AlphaPhone-Native-Google/1`, `calendarReadTiming` from `ALPHA_CALENDAR_READ_TIMING`) is copied from `scripts/native-google-product-host.ts:21-24`. Callers/importers (`git grep support/managed-google-agent`): `calendar-read-timing`, `google-agent-access`, `managed-google-broker-diagnostic`, `managed-google-stage-diagnostic`, `managed-google-transport-code`, `native-google-agent-host-access`, `native-google-agent-host`, `native-google-fetch-input` (all `test/*.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-30 | C6, C5 | The product host options (user agent string, timing flag, API origin) are re-declared here, so tests can pass while the product host sends different headers. `test/cloud-deployment.test.mjs:185` and `native-google-fetch-input.test.mjs` repeat the literal again. | Export one `nativeGoogleHostOptions(environment)` from `scripts/native-google-product-host.ts` and build both the product host and this helper from it. | low |
| 2 | 11-13 | D4 | `savedGoogleAgentAccess` is a one-line pass-through to `readGoogleAgentAccessFile` with an env default. | Inline at its callers or keep only if more than one importer uses it. | none |
| 3 | 24 | — | Default `access` grants both Gmail changes and Calendar edits; fine for integration fixtures. | none | none |

## Proposed end state
Keep while the managed-Google integration tests exist (other chunks MERGE them into
`test/integration/managed-google-broker.test.mjs`). Move the file next to that integration file
(`test/integration/support/managed-google.mjs`) and import the product host options from
`scripts/native-google-product-host.ts` instead of copying them. If every importer collapses into the one integration file,
inline the helper there.
