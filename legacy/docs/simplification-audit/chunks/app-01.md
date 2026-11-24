# Chunk app-01 — root identity, HTML entry and public data files

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| app.config.json | KEEP (consumer-side cleanup) | 10 | 10 |
| apps/app/index.html | KEEP | 16 | 16 |
| apps/app/public/delegation-return.html | SIMPLIFY (inline script; CSP hash recomputed) | 3 (2,014 B) | 3 (~1,750 B) |
| apps/app/public/icons/lucide/LICENSE.txt | KEEP (licence text) | 43 | 43 |
| apps/app/public/icons/lucide/source.json | KEEP (generated) | 727 | 727 (590 if `sourceFiles` dropped) |
| apps/app/public/icons/senders/sources.json | SIMPLIFY (drop failed-fetch entry) | 108 | 104 |

Reports: `docs/simplification-audit/files/<path>.md` for each row.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| AppIdentity (shape of app.config.json) | type | app.config.json:1-10 | `scripts/android-host.ts:29 AppConfig`; `scripts/app-update-candidate.ts ProductConfig`; `scripts/cloud-readiness.ts:60`; `scripts/aosp-pixel10a.ts:92`; `scripts/cloud-deployment.ts:53`; 31 inline `JSON.parse(readFileSync('app.config.json'))` readers | `scripts/lib/app-identity.ts` (`appIdentity`, `readAppIdentity(root)`) |
| package id `'ai.alphacompute.alphaphone'` | const | app.config.json:3 | 81 literals in 65 files under scripts/ and test/ (e.g. `scripts/android-instrumentation.ts:46`, `android-cloud-voice-timing.ts:12`, `android-resident-instrumentation.ts:16`, `maps/test-native-*.ts`, `browser-cloud-dev-bridge.ts:77`, `scripts/ci/*.py`); `AlphaConnectionPlugin` etc. use BuildConfig | `appIdentity.appId` |
| `#root` mount id | const | apps/app/index.html:13 | `apps/app/src/main.tsx:410,422`, `runtime/error-boundary.tsx:94` | keep literal (3 uses) |
| delegation allowed-key list / state regex | const | apps/app/public/delegation-return.html:2 | `specs/quint/refinement/application/portable.mjs:62-64`, `CallbackLanding.qnt` | stays inline (static page) |
| `alphaphone://cloud-delegation` | const | delegation-return.html:2 | `AlphaConnectionPlugin.java:30`, `AndroidManifest.xml:134` | stays (static page cannot import) |
| CSP-hashed inline return page | mechanism | delegation-return.html:1 | `scripts/browser-cloud-dev-bridge.ts:322-329` (dev-only, runtime hash) | no merge |
| lucide package/version | const | icons/lucide/source.json:2-3 | `apps/app/src/icon-catalog.json:2-3`; literal `'1.18.0'` in `test/canonical-icons.test.mjs:11` | icon-catalog.json is the source |
| sender-icon domain list | const | icons/senders/sources.json:5-106 | `apps/app/src/runtime/mail-sender-image.ts:10` | mail-sender-image.ts stays runtime source |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `assetdash.com` error entry, senders/sources.json:12-15 | no `assetdash.com.png` on disk; domain absent from `mail-sender-image.ts:10`; JSON read by nothing | high |
| redundant guards `!state\|\|` and `(…\|\|'')` plus four `getAll().length` checks in delegation-return.html:2 | replaced by one duplicate-key check; equivalence argued in the file report; covered by 3 harnesses | high (needs CSP hash recompute) |
| CallbackLanding block in `test/quint-conformance.test.mjs:30-63` | 7 cases, strict subset of `portable.mjs callbackLanding` trace grid on the same page and model | medium (owner: canonical Quint harness) |
| three `assert.equal(pkg,'ai.alphacompute.alphaphone')` self-checks (`scripts/android-workflow-native.ts:86`, `test-calendar-regression.ts:58`, `native-test-fixture.ts:113`) | assert the value just read from app.config.json equals a literal (B3) | high |
| tablet branch in `scripts/prepare-ci-emulator.ts:67-69` | `orientation` is pinned to `'unspecified'` by `test/launcher-orientation.test.mjs:16`, so `=== "landscape"` is always false | high |
| `sourceFiles` block in lucide/source.json:5-142 (+ generator) | only shape-checked by canonical-icons.test.mjs; no tool can verify it | low (owner) |

## Cross-file actions
1. **One app-identity reader.** Create `scripts/lib/app-identity.ts`; replace readers in: scripts/android-browser-reading-live.ts, android-host.ts, android-paired-speech-live.ts, android-workflow-native.ts, aosp-secure-camera-contract.ts, app-update-candidate.ts, build-android.ts, build-archive.ts, cloud-deployment.ts, cloud-email-code.ts, cloud-readiness.ts, deliver-app-update.ts, generate-sbom.ts, native-test-fixture.ts, prepare-ci-emulator.ts, prepare-embedding-host.ts, publish-update-manifest.ts, render-assetlinks.ts, stage-aosp.ts, stage-embedding-host.ts, stage-local-agent-sources.ts, test-calendar-regression.ts, test-cross-app-notifications.ts, test-installed-upgrade.ts, update-apk-admission.ts, verify-aosp-listener.ts, verify-apks.ts, verify-cuttlefish-launcher.ts, voice-host.ts; and replace the hard-coded package literal in android-instrumentation.ts, android-cloud-voice-timing.ts, android-resident-instrumentation.ts, maps/test-native-navigation.ts, maps/test-native-recovery.ts, browser-cloud-dev-bridge.ts, ci/pending-recovery-ui.py, ci/resident-native.py, ci/test-pending-recovery-phases.py, ci/resident_crash_diagnostic.py. Test fixtures that stage a temp root (test/fixtures/app-update-candidate.mjs, voice-host-product.mjs, resident-java-source-stage.mjs, isolated-native-campaign.mjs) need `readAppIdentity(root)`.
2. **delegation-return.html script edit** must change in one commit: the inline script, the CSP `script-src 'sha256-…'` value, and (if the quint-conformance block is deleted) `test/quint-conformance.test.mjs`. `portable.mjs` and `scripts/test-cloud-delegation-return.ts` stay as they are; the script must remain a single inline `<script>`.
3. **Dead tablet branch**: `scripts/prepare-ci-emulator.ts:67-69` (keep `test/launcher-orientation.test.mjs` pin).
4. **canonical-icons test** (if deleted per tests-host.md:603): move SVG-vs-`source.json` hash check into `scripts/audit-production-bundle.ts` in the same change.

## Text/path pins
- app.config.json: `test/launcher-orientation.test.mjs:16` (`orientation === 'unspecified'`), `test/product-identity.test.mjs`, ~28 other test files (see report), `.github/workflows/release-cloud-app-signing.yml:120`, `android/app/product.gradle:40`, `capacitor.config.ts`, `android/aosp/branding/system-entry/prepare.py`, `android/aosp/branding/hidden-navigation-handle/test_hidden_handle.py`, `specs/quint/refinement/application/account-sheet.mjs:77` (build input), `scripts/ci/hosted-native-inputs.py`, README.md.
- apps/app/index.html: `scripts/quint-lib.ts:39 runtimeAssetPaths` (+ `test/quint-checker.test.mjs:7,79`), `specs/quint/refinement/application/account-sheet.mjs:79`, `cloud-connection-notices.mjs:151`.
- delegation-return.html: own CSP sha256 (exact script bytes); `scripts/test-cloud-delegation-return.ts` (copy strings, href); `test/quint-conformance.test.mjs:44`; `specs/quint/refinement/application/portable.mjs:44,58,67` (inline `<script>` textContent); `specs/quint/application/manifest.json:1408,6909`; `scripts/ci/export-browser-proof.ts:73` (file-name allow-list); `test/browser/adapters.spec.ts:6`; upstream redirect URI convention `…/delegation-return.html`.
- lucide/source.json + LICENSE.txt: `test/canonical-icons.test.mjs:10-21` (package, version, licence string, every sha256, asset key set == icon-catalog.json); written by `scripts/vendor-lucide-icons.ts`; each SVG's header comment names both files.
- senders/sources.json: no pins. PNG paths pinned by `test/mail-sender-image.test.mjs:5-6` and `runtime/connection-ui.css:90`.

## New patterns
- NEW (candidate, fits C3/C6 umbrella): **product identity re-read per script** — one root config file parsed 31 different ways (cwd-relative vs `import.meta.url` vs `readJson`) plus the package id hard-coded in 65 files; distinct enough from generic `readJson` duplication to name explicitly as "identity literal sprawl".
- NEW (minor): **dual version pin for one third-party asset set** — `lucide-react` npm dependency 1.0.0 (package.json:91, used by upstream client-features, listed in THIRD_PARTY_NOTICES) vs vendored Lucide SVGs 1.18.0 (icon-catalog.json/source.json), whose licence is shipped separately in `icons/lucide/LICENSE.txt` and absent from the notices.

## Owner questions
1. THIRD_PARTY_NOTICES lists lucide-react 1.0.0 only; the shipped SVGs come from lucide-react 1.18.0 with their own LICENSE.txt. Should the notices generator include the vendored 1.18.0 icons (or should both pins be aligned)?
2. Keep `sourceFiles` (136 upstream .mjs hashes) in lucide/source.json as provenance, or is package+version enough?
3. Keep `icons/senders/sources.json` as a provenance record in `public/` (shipped in the APK and web build), or move it to the licences/notices area outside the served bundle?
4. Which CallbackLanding harness is canonical: `portable.mjs` (75 traces) or `quint-conformance.test.mjs` (7 cases)? Proposal: keep portable.mjs and the Playwright check, delete the quint-conformance block.
5. Is `orientation` ever expected to become `landscape` (tablet profile)? If not, delete the tablet emulator branch in prepare-ci-emulator.ts.
