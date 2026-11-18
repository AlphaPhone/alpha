# Chunk scripts-18

| File | Kind | Verdict | Target |
|---|---|---|---|
| `tsconfig.scripts.json` | root TS config for `scripts/` | KEEP (narrow `include` to `*.ts` after T9/D5) | — |

## Behaviours that would lose coverage
None: nothing is deleted.

## Shared helpers worth keeping
`scripts/typecheck-scripts.ts` (the diagnostic filter) must stay for now. Measured: unfiltered `tsc -p
tsconfig.scripts.json` reports 200 strict-mode errors inside `vendor/eliza/packages/{os,app,scripts}` files that
`scripts/` imports. The research proposal to drop the wrapper only works after upstream fixes those files (D14).

## Cross-file actions
- The D4 Calendar deletion breaks `npm run typecheck` through four scripts that still import removed code:
  `scripts/test-calendar-sync-provider.ts`, `scripts/test-google-calendar-selection.ts`,
  `scripts/test-google-calendar-protocol.ts`, `scripts/test-agent-calendar-mutation-flow.ts`. Delete or update
  them in the same change.
- `lib: ES2024` is required: `Promise.withResolvers` and `Array#findLast` are used in `scripts/`. `DOM` is required by
  the fixture entries.
- Upstream follow-up: make vendor tooling scripts strict-clean, then replace `typecheck-scripts.ts` with plain `tsc -p`.

## Owner questions
None.
