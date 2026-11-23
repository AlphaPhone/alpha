# Chunk specs-18 summary

| File | Kind | Verdict |
|---|---|---|
| `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs` | Quint refinement harness (Playwright-mounted renderer vs historical `SignIn.qnt`) | DELETE with legacy family |
| `specs/quint/legacy/view-refresh-configurations.json` | Config data for 4 historical view-refresh models, read only by uncalled `check-view-refresh.mjs` | DELETE with legacy family |

## Coverage lost by the DELETEs
- None unique. Sign-in journeys (email wrong code then verified, phone challenge Back, Google held request Back/cancel)
  are covered by `test/browser/native-cloud-signin.spec.ts` and the live `SignInChooser`, `SignInReadinessProbe`,
  `IdentitySession` models. Worth confirming in the journey: after Google Back, no `openExternal` /
  `/api/auth/cli-session` call and no saved credential (the harness asserted both).
- View-refresh configurations check nothing live.

## Shared helpers worth keeping
- `test/browser/helpers/native-cloud-signin.ts` and `test/browser/flag-off-android.ts` (`fenceNetwork`): still used
  by `native-cloud-signin.spec.ts`.
- `specs/quint/refinement/check-traces.mjs`, `scripts/quint-lib.ts` (`filesWithin`, `sha256`), `checkClientFeatures`.

## Cross-file actions
- Delete together: `legacy/SignIn.qnt`, `legacy/sign-in/check-sign-in-refinement.mjs`, the `SignIn` adapter and import in
  `specs/quint/refinement/legacy/index.mjs`, `test/quint-legacy-sign-in-refinement.test.mjs`.
- Delete together: `legacy/view-refresh-configurations.json`, `legacy/check-view-refresh.mjs`, the four view-refresh
  models and their `legacy/manifest.json` entries; README l.127, 169-173.
- Lower the `legacy` floor / remove the family from `quint-lib.ts:43`, `check-quint.ts:42`, `test/quint-checker.test.mjs`
  when the whole family goes (after relocating `source-support.mjs`, `formal-source-inventory.mjs`, `CoreTaskScheduler.qnt`).

## Owner questions
- Confirm `specs/quint/legacy` (historical design comparisons incl. SignIn and view-refresh) may be retired (D11 / P6).
