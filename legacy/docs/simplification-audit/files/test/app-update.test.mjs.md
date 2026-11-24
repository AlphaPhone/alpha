# test/app-update.test.mjs
- Lines: 97 | Kind: Java source transplant + JVM run (tests 1-2: members sliced out of `AlphaDevicePlugin.java` by text or by `exactUpdateMembers` from `specs/quint/refinement/native/update-barrier.mjs`, compiled with stubs from `test/fixtures/app-update-jvm/`), source-text (tests 3-4) | Verdict: DELETE tests 1, 3, 4; REWRITE test 2 as a Gradle host-JVM test of an extracted `AppUpdateInstaller` class (until then keep test 2 as is)
- Covers: download admitted only at declared size and SHA-256; one install attempt per process, session fencing, confirmation kept for the requesting bridge, quiet failure settlement, TLS cache retry over a real local server (test 2); install ordering and manifest permissions by regex (tests 3-4). Duplicates: Quint native harnesses `update-barrier.mjs`, `update-staging.mjs`, `update-composition.mjs` (with `UpdateBarrierHarness.java`, `UpdateStagingHarness.java`, `UpdateCompositionHarness.java`) compile the same `exactUpdateMembers` slice; `test/settings-truth.test.mjs` and `test/browser/settings-device-facts.spec.ts` for the renderer side. Callers/importers: `npm test`; imports `test/fixtures/jvm-tools.mjs`; fixtures `UpdateDownloadTest.java` and `UpdateFlowTest.java` are used only here (`git grep`), so they go when this test goes; `test/fixtures/app-update-jvm/` is also used by the Quint harnesses `update-barrier.mjs`, `update-staging.mjs`, `update-composition.mjs` and `runtime-update-pause.mjs`, so it survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-28 | T2 | Slices `UPDATE_MAX_BYTES`..`UPDATE_STATUS` members by text into a fake class. | Delete; download admission is inside test 2's flow. | low |
| 2 | 30-47 | T2, T10 | Real behaviour but on a text-extracted member set with the deadline rewritten by string replace; keytool + up to 240 s JVM run; overlaps the Quint harnesses using the same extractor. | Extract the update flow from `AlphaDevicePlugin` into a plain class with an injected installer/HTTP port, test it under Gradle, and point the Quint harnesses at it (T10 port). | Medium: this is the deepest host check of one-tap update. |
| 3 | 49-81 | T1 | `indexOf` ordering of 16 statements in `installUpdate`, regex counts of `abandonSession(`, `session.commit(`, exact one-line conditions. | Delete. | Low-medium: ordering is also modelled by the Quint update models. |
| 4 | 83-97 | T1 | Regex over manifest, `app.config.json` URL literal, `product.gradle`. | Delete; manifest permissions belong in `scripts/apk.ts` checks on the built APK. | low |

## Proposed end state
No host transplant; an `AppUpdateInstallerTest` in the Gradle JVM set drives the extracted class (one attempt, fencing,
TLS retry, failure settlement). Quint harnesses import the same class. `UpdateDownloadTest.java` and `UpdateFlowTest.java` are deleted with this file;
the `app-update-jvm/` stubs stay for the Quint harnesses until the shared Gradle stub set replaces them.
