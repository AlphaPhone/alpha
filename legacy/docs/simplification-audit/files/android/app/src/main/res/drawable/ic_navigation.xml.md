# android/app/src/main/res/drawable/ic_navigation.xml
- Lines: 1 | Role: 24 dp arrow small icon for the turn-by-turn navigation foreground notification. | Verdict: KEEP
- Importers: `AlphaNavigationService.java:257` (`.setSmallIcon(R.drawable.ic_navigation)`). Text/path pins: `specs/quint/refinement/native/navigation-service-platform.mjs:13` stubs `R.drawable.ic_navigation`.

## Findings
None. Minimal vector, used, no twin.

## Proposed end state
Unchanged.

## Verification
Navigation notification instrumentation (`AlphaNavigationService` suites) / Quint `navigation-service-platform` refinement.
