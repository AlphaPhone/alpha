# specs/quint/refinement/native/app-info-handoff-platform.mjs
- Lines: 219 | Kind: Quint harness platform (Java stubs for Android LauncherApps/UserManager/PackageManager plus text slices of upstream `SystemLauncherApps.java` and Capacitor `PluginCall.java`) | Verdict: KEEP; PORT the two slices
- Covers: compile environment for model `NativeAppInfoHandoff`: the whole product `AlphaSystemPlugin` compiles; personal and work-profile App info dispatch through controlled ports that record lookups and refuse duplicates; connectivity ports throw so the campaign cannot drift into networking. Callers: `app-info-handoff.mjs:7,24`; the same `withAppInfoSource` is used by `test/quint-app-info-handoff-composition.test.mjs` (via `app-info-handoff.mjs`).

## Text anchors (T10)
- Staged upstream `SystemLauncherApps.java`: regex `    public static final String (NOT_INSTALLED|PROFILE_UNAVAILABLE|FAILED) = "...";` and the slice `'    public static boolean malformedText('` .. `'    /** Why the current user'`.
- `node_modules/@capacitor/android/.../PluginCall.java`: `'    public JSObject getData()'` .. `'    @Nullable\n    public Integer getInt'`, with `@Nullable` stripped.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-29 | T10 | Product-side validation code is upstream; slicing it avoids compiling the whole `SystemLauncherApps` (which pulls Android launcher APIs). | Compile the staged file whole against the existing LauncherApps stub (the stubs already model most of the API), or ask upstream to move `malformedText` and the codes into a dependency-free class (D14). | Low |
| 2 | 194-211 | T10 / C5 | Capacitor `PluginCall` getters sliced from `node_modules`; `crash-journal-platform.mjs:49-63` does the same slice. | One hand-written `PluginCall` stub (getData/getString/getObject/resolve/reject with duplicate-answer assertion) shared by every native harness. | Low |
| 3 | 30-60 | — | `SystemPlugin`, `LateLaunch`, `AlphaImageCapabilities` stubs throw on any call outside App info: good containment. | Keep. | — |
| 4 | 52-56 | dependency | Stubs `AlphaImageCapabilities` (A63 proposes merging it into its user). | Update the stub when A63 lands. | Low |

## Proposed end state
Same closed Android ports; staged upstream source compiled whole; `PluginCall` from the shared stub.
