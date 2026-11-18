# android/sense/src/main/java/ai/alphacompute/alphaphone/sense/ConsentActivity.java
- Lines: 4 | Role: empty `final` subclass of `ai.eliza.sense.ConsentActivity` so the upstream Sense manifest's `${senseComponentPackage}.ConsentActivity` component resolves under Alpha's package | Verdict: KEEP (DELETE after owner decision, with its six siblings)
- Importers: none in Java. The upstream `packages/app/platforms/android/sense/src/main/AndroidManifest.xml` names `${senseComponentPackage}.ConsentActivity`; `senseComponentPackage` = `android/aosp/pixel10a-composition.json:29` `"componentPackage": "ai.alphacompute.alphaphone.sense"`. Pinned by path in `specs/quint/native/manifest.json` (lines 216-218, 257-259; ListenerControlProvider also 322). `test/always-on-listener.test.mjs:13` and `test/aosp-pixel10a.test.mjs:15` assert the componentPackage value.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | D4 / A8 | `/** Stable component identity across the shared Sense migration. */ public final class ConsentActivity extends ai.eliza.sense.ConsentActivity {}` — a shim kept only so component class names stay under the product package "across the migration". The listener APK has never shipped (`releaseQualified: false`, development-only under P-78), so there is no installed component identity to keep stable. | Owner: set `componentPackage` to `ai.eliza.sense` in `pixel10a-composition.json` (accepted by the upstream regex), delete all seven shims, update the two test assertions and the Quint manifest rows. Otherwise keep and reword the comment to "Upstream manifest names components under the product's componentPackage." | Medium: component names change (tile, providers); any AOSP overlay or allowlist that names them must move too (grep found none in `android/aosp`). |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines) together with its six siblings if the owner agrees; otherwise unchanged 4 lines with an accurate comment.

## Verification
Sense APK build via the generated host; `node --test test/always-on-listener.test.mjs test/aosp-pixel10a.test.mjs test/quint-indicator-provider.test.mjs`; `npm run verify` (Quint native manifest); emulator/device listener check per AGENTS.md evidence classes.
