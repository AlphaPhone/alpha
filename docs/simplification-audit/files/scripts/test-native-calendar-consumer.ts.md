# scripts/test-native-calendar-consumer.ts
- Lines: 30 | Kind: tooling/device campaign for an upstream fixture (builds `plugins/plugin-native-calendar/test/android-consumer` from the prepared source and runs upstream `run-consumer.mjs`) | Verdict: DELETE
- Covers: upstream plugin-native-calendar's own consumer APK on an emulator. Duplicates: upstream's own test. Callers/importers: none - `grep -rn test-native-calendar-consumer` over apps, android, scripts, test, specs, .github, package.json finds no reference (research `scripts.md:313` agrees).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unreferenced; runs an upstream test against the upstream fixture. | Delete; list as an upstream follow-up (D14) if the consumer test should run in elizaOS CI. | None |
| 2 | 15-19 | C3 | Own upstream-lock reader and Gradle init script. | Goes with the file. | None |

## Proposed end state
Deleted. `artifacts/calendar-consumer-*` output path disappears with it.
