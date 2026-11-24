# test/settings-truth.test.mjs
- Lines: 225 | Kind: transplant (imports the `// settings-facts:begin/end` region of `settings-adapter.ts` as a `data:` module; a second slice of `native-adapter.ts` between `type EgressConnection =` and a JSDoc line) + heavy source-text (15 regexes over settings-adapter, AlphaDevicePlugin.java, AndroidManifest.xml, build-flags, dev-profile, password-manager, google-connection-ui, gmail-background, vendor SystemFacts.java, audit-production-bundle.ts) | Verdict: REWRITE: update-manifest admission into an update integration test; rest DELETE
- Covers: Settings wording and the update-manifest trust boundary (flavor, signer, HTTPS, sha256, size, index feed), check cadence, idle-install gate, Developer-route gating and the privacy hero wording. Duplicates: `test/browser/settings-device-facts.spec.ts:142-217` (update offered/withdrawn/flavor+signer, browser never checks), `test/app-update-automatic.test.mjs` (automatic install gating), `test/browser/settings-truth.production.spec.ts`, `test/browser/password-entry-back.spec.ts` (Back from password entry), `test/browser/privacy-per-connection.spec.ts` (hero wording). Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6, 128-133 | T2/D7 | Marker comments `settings-facts:begin/end` exist only so this test can slice; the egress slice ends at a JSDoc sentence. | Delete markers with the test; move the region into an exported module `apps/app/src/prototype/settings-facts.ts` (stage F). | Low |
| 2 | 31-65, 185-211 | T3 but trust boundary | `parseUpdateManifest` parses network data that decides which APK is downloaded; refusal cases (http, credentials in URL, signer/flavor mismatch, size bound, sha256 shape, duplicate/nested index entries, >16 entries) have no other coverage. | Carry these as table-driven cases in `test/app-update.integration.test.mjs` importing `settings-facts.ts` (or as manifest fixtures served to `settings-device-facts.spec.ts`). | High if dropped |
| 3 | 20-25, 86-117, 119-125, 168-179, 214-225 | T1 | Regexes for removed rows, flags, permissions, Java constants and exact statements (e.g. `UPDATE_MAX_BYTES=2L<<30`, manifest `uses-permission`). | Delete; permission absence belongs to `verify-apks` (merged-manifest check), dev gating to `audit-production-bundle`. | Low |
| 4 | 20-22 | A4 | Asserts `updateChannelCheckEnabled = false` still exists; D8 deletes that switch, so this test breaks on the decided deletion. | Delete. | Low |
| 5 | 66-85 | T3 | `updateCheckDue` / `automaticUpdateIdle` are pure predicates; automatic gating is covered by `app-update-automatic.test.mjs`. | Delete (or one row each in the update integration test). | Low |
| 6 | 127-159 | T2 | Privacy hero wording via sliced native-adapter with injected `speechRoute`. | Delete; `privacy-per-connection.spec.ts` renders the hero. | Low |

## Proposed end state
File deleted. One new host integration file for the update feed (`test/app-update.integration.test.mjs`), importing the real
manifest parser (after `settings-facts.ts` is a module) with ~12 table rows: accepted manifest, accepted index selection per flavor/signer,
and each refusal class listed above. Everything else is already rendered by Settings journeys or belongs to bundle/APK audits.
