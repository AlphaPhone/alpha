# D-fix-runtime-d-g

## Finding 1 (low): dead `_serviceName` parameter on `googleDisconnectConfirmation`

Re-checked: confirmed as a leftover, not a behaviour change. On develop (a247c0175) the function
already ignored `_serviceName`. This diff removed the only production caller's second argument and
the `cloudServiceName(...)` lookup in `google-connection-ui.tsx`, so nothing in production passes
the parameter any more. `scripts/test-google-accounts.ts:88` still passed `'Nebula'`.

Fix:
- `apps/app/src/runtime/google-accounts.ts`: the signature is now
  `googleDisconnectConfirmation(label: string): string`. The body is unchanged.
- `scripts/test-google-accounts.ts:88`: the call is now `googleDisconnectConfirmation(account.label)`.
  The assertions are unchanged: the copy is identical and does not match /Eliza/.
- The zero-argument stubs in `test/fixtures/google-account-panel.mjs` and
  `test/quint-google-calendar-link-publication.test.mjs` are unaffected.

Verification:
- `npx tsc --noEmit`: 0 errors.
- `tsc -p tsconfig.scripts.json`: no diagnostics in `scripts/test-google-accounts.ts`.
- `node --test scripts/test-google-accounts.ts`: 13/13 pass.
