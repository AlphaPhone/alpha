# notes-organize-agent.patch

Status: proposed upstream. No build uses this patch. It is not listed in
`native-manifest.json`, and nothing applies TypeScript patches to `vendor/eliza`. It takes
effect only after it is merged upstream and the pin in `upstream.lock.json` is bumped. This
is the same status as `local-inference-live-asr.patch` (see
`docs/on-device-speech-2026-11-05.md` and `docs/architecture.md`).

Base: elizaOS/eliza `912f972e58b1b707ecdf2271eeba495f2ed966ef`. Apply from the eliza repo
root with `git apply`.

## What it adds

Agent-side definitions for the phone Notes operations behind capability `notes.organize.v1`.
The phone already implements them in `apps/app/src/runtime/notes-organize-contract.ts`.

| Tool | Operation | Runs |
| --- | --- | --- |
| `DEVICE_NOTES_FILTER` | `notes_filter {text?, folder?, kind?}` | directly when the owner's current message asked for it, otherwise reviewed. Read-only; returns no note content |
| `DEVICE_NOTE_MOVE` | `notes_move {target, folder: name or null}` | reviewed |
| `DEVICE_NOTES_FOLDER_CREATE` | `notes_folder_create {name}` | reviewed |
| `DEVICE_NOTE_RESTORE` | `notes_restore {noteId}` | reviewed |
| `DEVICE_NOTES_RECORD` | `notes_record {action: start or stop}` | directly when the owner's current message asked for it, otherwise reviewed. Notes view only |

- `plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts` (new,
  depends only on `notes-contract.ts`): types, `NOTES_ORGANIZE_CAPABILITY`,
  `NOTES_ORGANIZE_TYPES`, `NOTES_ORGANIZE_DIRECT_TYPES`, `isNotesOrganizeOperation`,
  `validateNotesOrganizeOperation`, `describeNotesOrganizeOperation`,
  `notesOrganizeContextAllowed`. Validation is the same as the phone's: unknown fields are
  rejected, text is at most 200 characters, folder names are at most 40 characters after
  whitespace is collapsed, kind must be text, list, voice or link, `notes_move` targets use
  `notesTarget`, and nothing is truncated.
- `contract.ts`: the operations are added to `DeviceOperation` and `validateDeviceOperation`.
  `deviceOperationSupportedByCapabilities` accepts them only when both `notes.organize.v1` and
  `notes.local-record.v1` are present.
- `action.ts`: schema branches and one guidance sentence. With no capabilities, the
  branches are hidden.
- `tools.ts`: the five tools above. Each tool's validate and handler require the capability.
- `service.ts`: adds the operations to the Notes record domain and the proposal allow-list,
  hides queued proposals when the capability is gone, and offers `notes.organize.v1` at
  enrollment.
- `effect-receipts.ts`: classifies the operations as non-read operations.
- `client-coordinator.ts`: parses the operations and refuses them if the capability was not
  negotiated. Review is allowed only on Home or Notes (`notes_record` only in Notes). Builds
  the review card. Adds `notes_filter` and `notes_record` to `performRequested` direct types.
  Successful move, folder create and restore report a `notes` committed change.
- `packages/agent/src/api/device-action-routes.ts`: accepts and advertises
  `notes.organize.v1`. Without this change the route rejects a capability header that
  contains it.
- `test/device-actions.e2e.test.ts`: adds the capability to the expected enrollment list.

## How it was tested

The patch was tested in a scratch worktree at the pin, without a monorepo install. Test-only
shims for the `@elizaos/contracts` subpaths and a stub of `@elizaos/core` were placed in the
scratch `node_modules`. They are not part of the patch.

- Bun 1.3.14 (`bun test --no-install --tsconfig-override <empty>`):
  - `notes-organize-contract.test.ts` (new): 12 pass. Covers valid and invalid shapes for
    every operation, capability gating through `deviceOperationSupportedByCapabilities`,
    `validateDeviceOperation` wrapping, and the review-card text.
  - `client-coordinator.test.ts`: 38 pass, including 4 new organize tests. They cover
    refusal when the capability was not negotiated, a reviewed move with a committed change,
    direct filter and recording only for the requesting message, and the context notices.
  - `photo-library-contract.test.ts` (control): 9 pass.
  - An out-of-tree check with `action.ts` and `tools.ts` (the `service.ts` stub was loaded
    with `mock.module`) passed 2 tests. Schema branches appear only with
    `notes.organize.v1`, each tool has one branch, and each tool's validate and handler
    refuse without the capability.
- TypeScript 7.0.2 `tsc --noEmit` with an ad-hoc tsconfig:
  - `contract.ts`, `client-coordinator.ts`, `notes-organize-contract.ts` and both tests have
    no new errors. The errors that remain match those of an unpatched export of the pin.
  - A wider run over `action.ts`, `tools.ts`, `service.ts`, `effect-receipts.ts` and the
    route (core resolved from source, externals missing) found no errors in
    `device-actions/`.
- `git apply --check` passes on a fresh `git archive` export of the pin. After applying, the
  result is byte-identical to the scratch tree.

Not run: the full plugin-assistant vitest suite, the e2e tests (including the edited one),
`completed-navigation-schema.test.ts` (it uses `vi.hoisted`, which bun does not support),
biome, and anything that needs a live agent or a phone.
