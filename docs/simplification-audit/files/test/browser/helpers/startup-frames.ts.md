# test/browser/helpers/startup-frames.ts
- Lines: 17 | Kind: Playwright init-script recorder (per-frame paint of Home vs startup prompt) | Verdict: **KEEP** (move into `journeys/startup-permissions.spec.ts` or `harness/startup.ts`)
- Covers: no frame paints Home before the sign-in/access-setup prompt; the neutral "Loading Alpha" status. Duplicates: none. Callers/importers: `post-sign-in-setup.spec.ts`, `post-sign-in-setup.production.spec.ts`, `resident-first-run.production.spec.ts` (all startup; the first two are a P5 twin pair).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | A8 | "Owner report 2026-10-31" history. | State the rule only. | none |
| 2 | 9 | D8 | One 300-character sampler line; CSS selectors `.alpha-connection`, `dialog.alpha-startup-permissions[open]`, `[data-alpha-layer="home"]` couple it to markup. | Format; selectors acceptable for paint sampling. | none |

## Proposed end state
Local helper of `journeys/startup-permissions.spec.ts` (production lane), run once per startup path rather than in three files.
