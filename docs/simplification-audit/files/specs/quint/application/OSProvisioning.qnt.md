# specs/quint/application/OSProvisioning.qnt
- Lines: 46 | Kind: Quint model (live; Java compile harness) | Verdict: KEEP
- Covers: First-run provisioning: only the current attempt generation can complete Home/keyboard defaults; existing keyboard preserved; appearance only after explicit request. Duplicates: none. Callers/importers: manifest row (4 android/aosp/branding/provision Java sources); harness specs/quint/refinement/application/os-provisioning.mjs (+ os-host-support.mjs, jvm-tools); wrapper test/quint-os-application-refinement.test.mjs; README

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-46 | - | Models live AOSP provisioning code; sources exist. | Keep. | L |
| 2 | harness:74-87 | B5 | Harness also reads android/gradle/verification-metadata.xml, scripts/prepare-patched-native.ts and upstream-native-source.ts as captured inputs; these widen the change set that re-runs the model. | Capture only compiled sources. | L |
| 3 | lane | P1 | JDK-dependent. | OS lane filtered on android/aosp/branding/provision/**. | L |

## Proposed end state
Unchanged model; narrower input capture; OS lane.
