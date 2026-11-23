# specs/quint/refinement/native/text-scale-platform.mjs
- Lines: 137 | Kind: refinement fixture; **slices product and Capacitor text** (T10) and patches another fixture | Verdict: PORT
- Covers: extends `mainActivityPlatform()` with appearance preferences, AccessibilityManager timeout, WebSettings zoom, BridgeActivity UI queue; extracts `AlphaDevicePlugin` text-scale members. Callers/importers: `text-scale-lifecycle.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-39 | T10 | Cuts `AlphaDevicePlugin.java` from `' static int textScalePercent('` to `' @PluginMethod public void snapshot('` (member order dependent). | Product: extract `TextScale.java` (static `textScalePercent`, apply-to-WebView, preference read/write, timeout readback) — fits U-A1's thin `AlphaDevicePlugin`. Compile it whole. | M |
| 2 | 41-54 | T10 | Cuts Capacitor `node_modules/.../PluginCall.java` from `'    public Integer getInt(String name)'` to `'    @Nullable\n    public Long getLong'`, stripping `@Nullable`. | Shared hand-written `PluginCall` stub with `getInt`. | L |
| 3 | 27-30,110-131 | C5/T10 (fixture) | `extend()` string-replaces `main-activity-platform` generated stubs at literal anchors (asserted unique — better than the shared-recording chain). Still a second-order fixture patch. | Give `mainActivityPlatform()` options (or export the stub map) so text-scale adds members without string surgery. | L |
| 4 | 65-109 | – | `SharedPreferences` modes (`before`/`visible`/`saved`) and exact preference slot/key assertions: useful oracles. | Keep. | – |

## Proposed end state
Stub additions only, merged into the main-activity stub builder via parameters; `TextScale.java` compiled whole.
~90 lines.
