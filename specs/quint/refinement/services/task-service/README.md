# Core TaskService refinement

`TaskServiceLifecycle.qnt` represents one persisted task, three invocation
identities and two service generations. The source driver executes the actual
TaskService, AgentRuntime, PGlite adapter and migrations. Its injected worker,
clock and storage-refusal ports create deterministic interleavings.

The compiler applies the same authenticated core patch used by the product
consumers. It binds the selected source bytes and PGlite package resources before
module evaluation. The optional `file-type` dependency must be eliminated from
the executable output. The loader rejects an output that still references it.
Every database fixture explicitly supplies `postgresUrl: null`.

## Source observations

| Model observation | Actual source boundary |
| --- | --- |
| `s.stopped` | TaskService stopped field |
| `s.timer` | TaskService hasTimer field |
| `s.dirty` | TaskService tasksDirty field |
| `ActiveTick` | TaskService activeTick promise presence |
| `s.tracked` | Active invocation count for the task in executingTasks |
| `s.quarantined` | Task membership in quarantinedOrphans |
| `s.stopReturned` | Fulfilment of the actual stop promise |
| `s.generation` | Identity class assigned to each actual service instance |
| `s.calls` | Actual worker entry events |
| `Executing` | Actual getTaskStatus result |
| `s.row.exists`, `repeating`, `paused`, `orphan`, `failures`, `backoff`, `blocking` | Real SQL task readback, with backoff represented by baseInterval presence |

The selected snapshot, invocation maps and detailed tick phases remain control-flow
abstractions checked at these endpoints. Their unobserved internal fields remain
explicit gaps in the structural field inventory.

The stop and counted-owner regressions also execute the original source and the
patched source. They retain manual concurrency and distinguish a stored task row
from the lifetime of a running worker. A deleted row can have a draining worker
while getTaskStatus reports no stored task.

## Remaining boundaries

- The current time classes cover due versus not-due and the startup grace
  boundary. Exact wake revisions, consume/request races, backoff durations,
  nextWakeAt, notBefore/notAfter and non-finite legacy schedule values need
  separate source schedules.
- The model's failure count is capped at two and its auto-pause threshold is two.
  The current source campaign observes the first failed completion and preserve
  outcomes. Threshold crossing, successful rescheduling, one-shot worker deletion,
  other configured thresholds and unlimited retries need further source traces.
- Multi-task queue ordering, task identity replacement and multiple service
  instances operating concurrently on one database remain outside this bound.
- The process-wide scheduler daemon, its global registrations and batched reads
  require their own ownership model. The current campaign uses injected local
  timers and the real manual runDueTasks entrypoint.
- Provider effects beyond the controlled worker completion, filesystem crash
  persistence and installed runtime scheduling remain separate obligations.

The model and source checks are bounded evidence. The complete application state
coverage goal remains open.

## Validation

The current source campaign passes 12 schedules and 76 checkpoints, observing
17 fields or derived source views. The model has 15 named scenarios. Simulation
uses 1,000 runs of up to 80 steps with seed 123. Symbolic safety checking uses a
four-transition bound. Receipts remain under `test-results/quint-workflow-tasks`
and `test-results/quint-refinement/TaskServiceLifecycle.json`.
