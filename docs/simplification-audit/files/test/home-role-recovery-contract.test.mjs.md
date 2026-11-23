# test/home-role-recovery-contract.test.mjs
- Lines: 18 | Kind: transplant of Java (regex-extracts `private boolean showsHome() {…}` from `MainActivity.java` into a generated class) + host-JVM unit with reflection fallback for an older `onLoss` signature + source-text regex over `MainActivity.java` | Verdict: DELETE
- Covers: Back/HOME behaviour follows the current HOME role (not how the task started); background renderer reclaim defers recreation without spending crash budget; HOME without a WebView shows a native Settings escape. Duplicates: none at host level; HOME-role behaviour is only provable by the emulator HOME-role instrumentation lane. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs` (`runJvm`). Reads env `ALPHA_RECOVERY_SOURCE_ROOT` (set by nothing found in repo: T9 knob).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T2 / T10 | `/private boolean showsHome\(\) \{[^}]+\}/` breaks as soon as the method contains a brace; rebuilds `BuildConfig` by hand. | Delete. | Low |
| 2 | 13-14 | A1 | Reflection fallback for an old `onLoss(long,boolean)` signature: compatibility with source that no longer exists. | Delete. | Low |
| 3 | 16-17 | T1 | Regex over `if (getBridge() == null) {…showRendererEscape…}`. | Delete. | Low |
| 4 | 11-14 | — | Background reclaim must not spend the crash budget: real rule, pure class. | If kept, one JUnit case in `android/app/src/test/.../RendererRecoveryBudgetTest.java` calling `onLoss` directly (make it package-private, no reflection). | Low |

## Proposed end state
File deleted. HOME-role behaviour is an emulator HOME-role instrumentation concern (AGENTS.md: distinct evidence);
the renderer budget rule, if wanted, is one Gradle JVM test.
