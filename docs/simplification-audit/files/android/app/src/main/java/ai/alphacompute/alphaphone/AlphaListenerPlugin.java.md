# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaListenerPlugin.java
- Lines: 8 | Role: empty subclass of upstream `SensePlugin` registered under the extra Capacitor name `AlphaListener`. | Verdict: DELETE
- Importers: `MainActivity.java:355` (`registerPlugin(AlphaListenerPlugin.class)`), right next to `registerPlugin(ai.eliza.plugins.system.SensePlugin.class)` (:356), so the same bridge is exposed twice. Text/path pins: `test/always-on-listener.test.mjs:29-45` (javac-compiles the file, test title "legacy AlphaListener is a thin alias"), `test/support/feature-parity.mjs:66`, `specs/quint/native/manifest.json:219,260`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-8 | A7, D4, A1 | `@CapacitorPlugin(name="AlphaListener") public final class AlphaListenerPlugin extends ai.eliza.plugins.system.SensePlugin {}`; the Javadoc says "Legacy plugin name". `git grep AlphaListener` over apps/, .eliza/client-features: 0 hits. The renderer uses only `Sense` (`apps/app/src/runtime/always-on-listener.ts:56`, `Sense.takeInvocation`). | Delete the file and `MainActivity.java:355`. Delete the `AlphaListener` test in `test/always-on-listener.test.mjs:29-45`, the `feature-parity.mjs:66` entry and the two manifest entries. | Low. A second SensePlugin instance registered under another name may have had side effects in `load()` (listener binding). Removing it leaves exactly one instance, which is the intended state. |
| 2 | 5-6 | A8 | Comment describes history ("Legacy plugin name and package identity"). | Goes with the file. | none |

## Local types and helpers
None.

## Proposed end state
File deleted (0 lines). `MainActivity` registers only `ai.eliza.plugins.system.SensePlugin`.

## Verification
`test/always-on-listener.test.mjs` (remaining tests), Quint native manifest check (`specs/quint/native/manifest.json` must drop the path), `npm run verify`, Android build both flavors, and an emulator HOME-role run confirming `Sense.takeInvocation` still answers.
