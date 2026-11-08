# TaskService stop admission

The reviewed patch applies to `packages/core/src/services/task.ts` at upstream commit
`475a8d59dc1811c2cde093613519906a5a3f6457`. Its target is declared in `core-state-manifest.json` alongside the independently
reviewed Notes replay-identity patch. The source checkout remains the original upstream tree.

The original implementation permits both a new manual worker invocation and a new
poll timer after `stop()`. It also lets a manual invocation that is awaiting its
task read enter the worker after stop. The patch closes these admission paths.
Already admitted work still drains through the existing promise tracking. The original per-task Set also loses its marker when the first of two overlapping manual executions finishes. A counted map now retains that marker until the final execution settles, preserving both truthful status and automatic blocking-run suppression.

- `startTimer()` returns when stopped.
- `executeTaskById()` rejects new admission with `TASK_SERVICE_STOPPED`.
- The shared `executeTask()` entry checks again after asynchronous task reads.
- `runDueTasks()` returns when stopped, including after waiting for an older tick.
- Each admitted execution increments its task count and releases only its own count in `finally`.

The patch does not change task metadata mutation APIs. A stopped instance can
still receive a pause or resume metadata operation. Immediate resume reaches the
same guarded execution entry. Provider effects already dispatched by a worker
remain that worker's responsibility.

## Consumers

| Consumer | Admission and transformation |
| --- | --- |
| Android mobile bundle | `build-mobile-agent.mjs` installs the shared Bun plugin and requires its transform in `alpha-mobile-build.json`. Staging and APK verification bind the patch inputs and before/after hashes. |
| Source-mode Cloud, local, voice and reviewed-workflow hosts | Each launcher supplies the owned source path and preloads `core-state-preload.mjs`. The preload authenticates the original source tree before installing the same transform. |
| Development backend | `backend/loader.ts` preserves pinned-source admission, installs the plugin, and records its transform with the source map. |
| Native Google host artifact | The builder installs the plugin and binds the core patch record. Its current 35-input graph does not select TaskService. |
| Workflow dependency artifact | The actual upstream producer was observed with Bun 1.4.2. Its 1123-input graph selects no `packages/core/src` module. It needs no TaskService transform. |
| Independently frozen combined host | Matching revision and all reviewed target preimages receive the transforms. The preload rechecks the host's frozen source manifest, including reviewed custom files. Other revisions/preimages retain their existing independent version contract and report `coreState.applied=false`. They require a separate patch review. |
| Quint TaskService compiler | Uses the same byte map. The actual-class stop regressions already exercise the shared build plugin. The broader SQL-backed lifecycle refinement is a separate work item. The counted-ownership SQL regression already executes the actual runtime, migrations and adapter. |

`core-state-patch.mjs` validates the product pin, manifest schema, explicit target allowlist,
patch digest and exact patch headers, original bytes and resulting bytes. It
rejects symlinked inputs and extra scratch outputs. Each consumer gets the same
materialized bytes. The mobile receipt includes the patch manifest, helper,
preload and frozen-snapshot verifier hashes alongside the original and effective
source digests. Original-source checks remain separate from transformed outputs.

## Checked behavior

`test/task-service-stop.test.mjs` compiles both the original and patched actual
TaskService class with its real internal modules. Controlled runtime read and
worker ports reproduce the original defects and check the corrected schedules.
It checks a stopped manual invocation, timer restart, a held task read, a held
worker, stop drain, and a second due-task request queued behind the held worker.
Counted ownership is checked in both completion orders, with successful and failed
first completions, plus concurrent nonblocking manual/automatic executions.
`test/task-service-sql-concurrency.test.mjs` repeats the four completion/failure
schedules against actual AgentRuntime and PGlite, including persisted failure
bookkeeping. Its source compiler binds all selected source and PGlite resource
bytes before evaluation and uses the same patch map.

`test/core-state-patch.test.mjs` checks missing/changed inputs, wrong pin and
target, postimage mismatch, symlink refusal, build interception and the real Bun
preload. The preload tests include unchanged-source preservation, dirty-source
refusal, matching custom frozen snapshots and later frozen-snapshot drift.
These are executable source checks, not a claim of complete runtime refinement
or installed-device acceptance.
