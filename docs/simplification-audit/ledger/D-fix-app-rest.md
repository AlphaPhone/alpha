# D-fix-app-rest: confirmed review defects in apps/app/src (startup permissions harnesses, native, lib)

No production behaviour changes. Finding 1 ports retained checks to the D1 reader; findings 2-5 remove dead
exports added by this branch and fix one comment.

1. Startup walkthrough versions 1-3 (D1, A2.md): the reader stays native-version-4-only, as the decision says. The
   retained harnesses and models were ported (option b):
   - `specs/quint/refinement/application/startup-permissions-coordinator.mjs`: `auth-ready-preserves-completed-{4..7}`
     loop replaced by one `auth-ready-preserves-completed-7` scenario seeded `{version:4,status:'completed',step:7}`;
     `s.legacyCompleted` projection removed. `test/quint-permission-coordinator-refinement.test.mjs`: observed
     field count 20 -> 19.
   - `test/quint-permission-choices.test.mjs`: same for `returning-auth-preserves-completed-7`; `s.legacyCompleted`
     projection removed; observed field count 41 -> 40.
   - `specs/quint/application/PermissionWalkthrough.qnt`: `legacyCompleted` field/init/update removed;
     `restoreCompleted` accepts only 7; `historicalInstall` removed (step uses `restoreCompleted(7)`);
     `DurableCompletion = s.completed implies s.savedProgress == 7`; `legacyCompletionTest` -> `completedInstallTest`.
   - `specs/quint/application/PermissionChoices.qnt`: `legacyCompleted` removed; `restoreCompleted(steps)` requires
     `steps == count`; `DurableCompletion = s.completed implies s.savedProgress == count`;
     `legacyReviewPreservesCompletionTest` -> `completedReviewPreservesCompletionTest` (restores 7, expects 7).
   - `specs/quint/application/manifest.json`: the two renamed test names. `specs/quint/application/README.md`:
     PermissionWalkthrough row no longer says "historical".
   - `test/browser/flag-off-android.ts`: `flagOffAndroid` seeds `{version:4,status:'completed',step:7}`.
     `seedCompletedAccessSetup` seeds version 1 (browser) and rewrites to version 4 when `window.androidBridge` is
     assigned. Most native specs call it from `beforeEach`, before their own init script installs the bridge, so the
     platform is not yet known when the seed script runs. The bridge accessor returns the assigned value, and
     Capacitor only checks that `androidBridge` is truthy. Version-1 seeds in pure-browser specs are left as they are.
   Not changed: `specs/quint/application/StartupPermissions.qnt` still has `oldCompletedInstall`/`CompletedUpgrade`
   (steps 4-6). Its refinement (portable.mjs) exercises only attempt memory, not progress versions, so no check
   fails. It is left for a model-owner follow-up.
2. `native/alpha-note-documents.ts`: removed the `alphaNoteDocuments` singleton and its `registerPlugin` import. Types
   are kept, and a doc note says where the web-backed registration lives.
3. `native/alpha-maps-transport.ts`: removed the `alphaMapsTransport` singleton and its import. The type is kept.
   maps-adapter.ts:119 is unchanged.
4. `lib/abort.ts` `isNamedAbortError` and `lib/parse.ts` `optionalString` removed (no importers).
5. `lib/civil-date.ts:10`: the comment now describes the function ("with no fallback; callers choose one").

Verification: `npx tsc --noEmit` shows 0 errors. Quint typecheck, `test` (11 and 23 runs passing) and a 500-sample
`safety` simulation of PermissionWalkthrough and PermissionChoices pass when run directly with the Quint CLI.
`bun scripts/check-quint.ts` could not load the shared manifest while concurrent agents were deleting other models.
With `ALPHA_TIMEOUT_SCALE=4`, `node --test test/quint-permission-coordinator-refinement.test.mjs` and
`test/quint-permission-choices.test.mjs` both pass. Production Playwright passes 16/16 on
signed-out-page, billing-recovery and chat-decline. Full `bun run quint:tests`, `quint:check` and
`test:browser:production` were not run (host load ~150, shared tree under concurrent edit).
