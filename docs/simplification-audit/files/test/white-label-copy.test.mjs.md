# test/white-label-copy.test.mjs
- Lines: 46 | Kind: source-text (walks `apps/app/src/runtime` and the Java package, strips comments, greps for `Eliza`) + component render (esbuild-bundles `runtime/cloud-personal-setup.tsx`, renders with `react-dom/server`) | Verdict: DELETE (move test 1's rule into `scripts/audit-production-bundle.ts`)
- Covers: no hard-coded other-product name in user copy; the Dedicated hosting review names the configured Cloud service. Duplicates: `scripts/audit-production-bundle.ts` DENYLIST (already denies `personal Cloud agent`, `dedicated-always`, `/api/v1/eliza/agents`, lines 58-63). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-30 | T1 | Line-by-line grep of source, with a hard-coded exception for `UPSTREAM_*_NOTICE` in `action-message-presentation.ts`. The rule is real (AGENTS.md: no other product identity) but belongs on the shipped output. | Add to the bundle audit: built JS strings and APK `strings.xml` must not contain `Eliza` outside `X-Eliza-*` headers and the upstream notice markers. | Medium |
| 2 | 32-46 | A3/D5 | Renders the personal Cloud "Dedicated agent" setup. The bundle audit already forbids `personal Cloud agent` and `dedicated-always` in production, so this component is dev/unreachable and is deleted under D5. | Delete with the component. | None |
| 3 | 33 | T8 | Creates a temp directory inside the repository root (`.personal-setup-test-*`). | Goes with the file. | None |

## Proposed end state
File deleted. `scripts/audit-production-bundle.ts` gains a "no other product name in user-visible strings" rule over the production bundle (and `verify-apks.ts` over APK resources), with the two protocol exceptions stated once.
