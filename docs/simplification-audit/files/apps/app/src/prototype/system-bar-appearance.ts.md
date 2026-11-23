# apps/app/src/prototype/system-bar-appearance.ts
- Lines: 18 | Role: Sends the shell's drawn theme to `AlphaDevice.setSystemBarAppearance` on mount and on each change, so Android status/navigation icons contrast with Alpha's theme. | Verdict: KEEP (minor)
- Importers: `apps/app/src/main.tsx:69,181`. Text/path pins: `test/system-bar-appearance.test.mjs` (real import; also regex-matches the exact `main.tsx` call line and `AlphaDevicePlugin.java` body — T1), `test/support/feature-parity.mjs:31,428`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | C7 / NEW | A second writer of the same Android bars exists: `agent-adapter.ts:1532-1535` calls Capacitor `SystemBars.setStyle({style})` from `renderVals` based on `out.sbColor` (immersive dark views), while this module calls `setSystemBarAppearance({dark})` from the theme. Two mechanisms, two plugins, last-writer-wins. | Decide one owner: extend this module to take `dark = theme==='dark' || immersiveDark` and delete the agent-adapter block (cross-file). | Medium: visible on device; owner question. |
| 2 | 16-17 | B2 / D7 | `mount?.apply`, `update?.apply` — base methods always exist; the test shell defines both anyway. | Call directly. | None |
| 3 | 10 | B2 | `shell?.state?.theme || shell?.props?.theme` — `shell` is always the component. | `shell.state.theme ?? shell.props.theme`. | None |
| 4 | 7 | — | `if (!native) return;` — `main.tsx` could call it only on Android; fine either way (test covers the flag). | Keep. | — |
| 5 | 1 | C2 | `SystemBars` plugin type declared here and used via `registerPlugin<SystemBars>('AlphaDevice')` in `main.tsx`; name collides with Capacitor's `SystemBars` imported in `agent-adapter.ts:80`. | Part of the typed AlphaDevice module; rename to avoid the collision. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SystemBars` | type | 1 | Capacitor `SystemBars` (different API, same name) in `agent-adapter.ts:80`; AlphaDevice typings ×18 | `native/alpha-device.ts` |

## Proposed end state
~16 lines, direct base calls; sole owner of Android bar appearance once the agent-adapter `SystemBars.setStyle` block is folded in.

## Verification
`test/system-bar-appearance.test.mjs`; device check of status-bar icon contrast in light/dark and immersive views (device acceptance, not proven by host tests).
