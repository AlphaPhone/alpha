# Chunk test-49: test support helpers, system/telephony/toast tests, update and upstream tooling tests

30 assigned files, 30 reports under `files/test/...`. One file (`test/support/feature-parity.mjs`) no longer exists
(deleted under D15); it has a two-line report.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `support/attachment-restoration.mjs` | transplant helper (no-op stub) | DELETE | with `notes-owner-retirement` and the transplant cases of `assistant-draft-dispatch` |
| `support/feature-parity.mjs` | inventory | DELETE (already gone) | D15 |
| `support/login-surfaces.mjs` | prose + regex inventory | DELETE | with `login-surfaces.test.mjs`; policy prose to `docs/` if wanted |
| `support/managed-google-agent.mjs` | support adapter over upstream managed Google host | KEEP, SIMPLIFY | import host options from `scripts/native-google-product-host.ts`; move next to `test/integration/managed-google-broker.test.mjs` |
| `support/strip-types.mjs` | transplant helper (217 importers) | KEEP for now, CONSOLIDATE | delete twin `test/fixtures/ts-source.mjs`; shrinks to zero with T2/T10 work |
| `system-bar-appearance.test.mjs` | unit + T1 | REWRITE | `journeys/settings.spec.ts` (theme → bar icons once, retry) |
| `system-notice-collapse.test.mjs` | unit + transplant + T1 | REWRITE | `journeys/chat.spec.ts` (5 cases, merged with `chat-system-notices.spec.ts`) |
| `system-shade-timeout.test.mjs` | transplant | REWRITE | `journeys/home-shell.spec.ts` (hung shade request) |
| `system-shade.test.mjs` | T1 + upstream unit + fake-DOM unit | REWRITE | `journeys/home-shell.spec.ts` (touch pull); manifest rule → `scripts/verify-apks.ts` |
| `task-service-sql-concurrency.test.mjs` | integration (real TaskService + PGlite) | DELETE | duplicate of Quint TaskService refinement scenario |
| `task-service-stop.test.mjs` | unit of upstream TaskService | DELETE | duplicate of Quint TaskService refinement + upstream suite |
| `telephony-agent-flow.test.mjs` | integration-ish (real `DeviceActions`) | MERGE | `test/integration/device-actions.test.mjs` |
| `telephony-attention-lifecycle.test.mjs` | unit with stubbed modules | REWRITE | `journeys/telephony.spec.ts` (late status reads nothing) |
| `telephony-executor.test.mjs` | integration-ish (real executor, recording ports) | MERGE | `test/integration/device-actions.test.mjs` (as the real executor behind `DeviceActions`) |
| `telephony-presenters.test.mjs` | unit of pure formatters | REWRITE | `journeys/telephony.spec.ts` (Home cards) |
| `template-style-cache.test.mjs` | transplant | DELETE | none |
| `test-helpers.test.mjs` | tests of test machinery | DELETE | none |
| `theme-palette.test.mjs` | source-text lint | DELETE | owner question: lint rule instead |
| `toast-undo-offer.test.mjs` | transplant | REWRITE | `journeys/home-shell.spec.ts` (2-3 cases beyond `shell-toast.spec.ts`) |
| `trigger-cursor-isolation.test.mjs` | test of harness + Quint re-run | DELETE | none |
| `trusted-worker-prelude.test.mjs` | asset drift check against upstream | DELETE after prelude generation | instrumentation asset staging |
| `tts-worker-lifecycle.test.mjs` | spawn wrapper of upstream tests | DELETE | with `scripts/test-tts-*.ts` |
| `update-apk-admission.test.mjs` | release tooling, real SDK tools | KEEP, MERGE | `test/tooling/app-update.test.mjs` |
| `update-channel-gradle.test.py` | orphan transplant of `product.gradle` | DELETE | never run |
| `update-channel.test.mjs` | release tooling | KEEP, MERGE | `test/tooling/app-update.test.mjs` |
| `upstream-native-source.test.mjs` | build tooling, real git | KEEP, MERGE | `test/tooling/upstream-pin.test.mjs` |
| `upstream-owner-gate-compat.test.mjs` | T10 hash + regex model + T1 + one real unit | REWRITE | `test/tooling/upstream-pin.test.mjs` (import upstream gate; check `OWNER_ROUTE_TABLE`) |
| `upstream-pin-guard.test.mjs` | build tooling, real git + spawned preflight | KEEP, MERGE | `test/tooling/upstream-pin.test.mjs` |
| `upstream-reachability.test.mjs` | build tooling | KEEP, MERGE | `test/tooling/upstream-pin.test.mjs` (drop committed-record check) |
| `use-in-email-review.test.mjs` | transplant via fixture | REWRITE | `journeys/inbox.spec.ts` |

Totals: DELETE 12, KEEP 7 (2 support helpers, 5 tooling tests merged into 2 files), MERGE/REWRITE 11.

## Corrections to the research report (`research/tests-host.md`)

- `task-service-stop.test.mjs` does not test a `scripts/` module. It tests upstream `TaskService` bundled with the
  `core-state-patch` plugin, and the live Quint TaskService harness covers all of it with real PGlite.
- `task-service-sql-concurrency.test.mjs` is not a Quint replay. It borrows the harness loader and repeats the harness's
  2×2 owner scenario.
- `theme-palette.test.mjs` is a source-text lint, not "imports a real app module".
- `trigger-cursor-isolation.test.mjs` re-runs all three trigger-cursor cases, including the 240 s random walk. That
  makes it the most expensive DELETE in this chunk. Its premise (globals leaking into the next file) cannot happen,
  because `node --test` isolates each file in its own process.

## Behaviours that lose coverage if the DELETEs land without the replacements

- **Toast Undo commit race:** a delayed React close commit replacing a newer Retry Undo (`toast-undo-offer` l.106-123).
  Playwright cannot drive that exact interleaving. The journey only keeps "Retry stays visible".
- **Use-in-email stale callbacks:** a retired review confirming, or a double confirm before re-render. These stay covered
  only if the Quint `email-suggestion-review` harness is ported to import the real module.
- **Notice collapse edge rows:** interrupted, streaming, card and device-receipt rows must not retire a notice. These
  are kept only if the chat journey carries case (d).
- **Shade fallback timeout:** this needs the home-shell journey with a held bridge promise and `page.clock`.
- **Late telephony status after leaving Home (privacy):** this needs the telephony fixture extended with a held
  `status`.
- **TaskService one-shot reread across stop** (`task-service-stop` l.139-154): confirm the Quint harness has it, or add a
  scenario there.
- **Gradle-side update-channel validation:** the orphan Python test never ran, so nothing is lost today. But the Groovy
  copy of the rules stays untested until Gradle consumes the TypeScript-validated record.
- **Template style cache bound:** deliberately left uncovered (trivial code).

## Shared helpers worth keeping

- `test/support/managed-google-agent.mjs`. It should import the product host options rather than copy them.
- `test/support/strip-types.mjs`, as one copy until its importers are gone.
- New in the merges:
  - one esbuild "bundle entry to an importable module" helper, replacing three temp-file loaders in the telephony tests;
  - one temp git repository builder for `test/tooling/upstream-pin.test.mjs`;
  - one temp-file and hash helper for `test/tooling/app-update.test.mjs`.

## Cross-file actions

1. Delete `test/fixtures/ts-source.mjs` and repoint its 5 importers to `test/support/strip-types.mjs`.
2. Export one `nativeGoogleHostOptions(environment)` from `scripts/native-google-product-host.ts`. It replaces the copied
   user agent string in the support helper, `cloud-deployment.test.mjs:185` and `native-google-fetch-input.test.mjs`.
3. Give `scripts/android-build-preflight.ts` a root parameter, so `upstream-pin-guard` stops copying 13 scripts
   (including `removed-profile-flags.ts`, which is being deleted).
4. Generate the prelude half of `android/app/src/androidTest/assets/trusted-worker.mjs` at instrumentation staging. Then
   recompute the frozen hash in `scripts/ci/resident-native.py`.
5. Upstream follow-up (D14): export `isOwnerOnlyApiRequest` from `packages/agent/src/api/server.ts`.
6. Move the `EXPAND_STATUS_BAR` flavor rule into `scripts/verify-apks.ts`.
7. Run `test/tooling/app-update.test.mjs` in a lane that has Android SDK 36 and JDK 21, and fail rather than skip there.
8. The Gradle update-channel block (`android/app/product.gradle:39-80`) duplicates `scripts/update-channel.ts`. The
   Android chunk should make Gradle consume the validated record.
9. `.gitignore` the `.qa-channel-fixture-*` prefix used by `update-channel.test.mjs`.

## Owner questions

- Should the `login-surfaces` security rules (website/app binding, secrets never crossing the agent bridge, renderer
  WebView excluded from Autofill) be kept as prose in `docs/` once the inventory test is deleted?
- Is "no hex colour outside the product palette" a rule to enforce with a lint config, or can it go?
- Does every agent request pass the `OWNER_ROUTE_TABLE` admission? If yes, the owner-gate check can use the table instead
  of scanning source for path literals.
- Does any CI lane run `update-apk-admission`'s real-SDK case today, or does it always skip?
