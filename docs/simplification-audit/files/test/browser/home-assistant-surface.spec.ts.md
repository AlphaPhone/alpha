# test/browser/home-assistant-surface.spec.ts
- Lines: 28 | Kind: Playwright spec (chromium), dev-only `?surface=assistant` run mode | Verdict: DELETE (carry 3 assertions into `journeys/home-shell.spec.ts` assistant case)
- Covers: the assistant surface shows chat + Close only; plain Home keeps grid and has no Close assistant. Duplicates: `home-native-launcher.spec.ts:303-324` (same two behaviours through the real entry, `DailyApps.surfaceInfo().assistant` and the `alpha.assistant` launch extra), `assistant-surface-close.spec.ts` (also uses `?surface=assistant`). Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | D5 / T6 | Enters the surface through a dev query (`main.tsx:394`, `devSurfacesEnabled && query.get('surface')==='assistant'`) instead of the native signal production uses. `home-native-launcher` already covers the production path. | Delete; drive the assistant surface only through the native-bridge stub (`assistant:true`). Once `assistant-surface-close.spec.ts` is also moved to the stub, the `?surface=` run mode in `main.tsx` can go (D5). | Low |
| 2 | 12-18 | T4 | Extra assertions not in the native-stub case: no `Minimize chat`, home layer hidden, no Settings tile, no `.alpha-startup-permissions`, no "scheduled digests" dialog. | Carry "no Minimize chat", "home layer hidden" and "no startup permissions" into the stubbed assistant case. The digests dialog is retired; drop that line. | Low |
| 3 | 23-28 | T4 | Second test duplicates `home-native-launcher.spec.ts:317-324`. | Delete. | — |

## Proposed end state
File removed. The assistant case in `journeys/home-shell.spec.ts` (from `home-native-launcher`) asserts chat + Close only, no Minimize, Home layer hidden, no startup permissions panel, and Close calls `DailyApps.closeAssistant`.
