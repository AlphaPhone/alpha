# test/auth-copy-native-cutout.test.mjs
- Lines: 37 | Kind: transplant (slices `connection-ui.tsx` from `const restoreSaved=` to `:null;`, compiles it with esbuild, runs it with `new Function`) + one CSS case (real `phone.css` in JSDOM) | Verdict: DELETE
- Covers: the "Restore saved sign-in" button shown for a legacy saved sign-in (`legacySignInRecovery`), and `phone.css` hiding the prototype cutout on `native-phone`/`standalone-app`. Duplicates: the cutout is visible in every native-inset Playwright screenshot (`test/browser/native-insets.spec.ts`). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-27 | T2, A1 | Covers only legacy saved sign-in recovery. Its Android half (`LegacyCloudRecovery.java`) is already deleted in this worktree (D1/C5), while `connection-ui.tsx` still has `const restoreSaved=` and four `legacySignInRecovery` hits. | Delete the test together with the renderer `restoreSaved` branch and the `legacySignInRecovery` snapshot field. | Low |
| 2 | 28-37 | T3 | Checks one CSS rule through JSDOM's computed style. | Delete. If wanted, assert in `journeys/home-shell.spec.ts` (native-inset project) that `[data-alpha-system-cutout]` is hidden. | Low |
| 3 | 11 | T2 | `source.indexOf(':null;',begin)+5` is an offset into minified source text: very fragile. | Gone with the file. | — |

## Proposed end state
File deleted with the renderer legacy-recovery code. The cutout rule, if kept as a check, is one line in an existing native-inset journey.
