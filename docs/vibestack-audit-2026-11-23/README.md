# Vibestack cutover parity audit, 2026-11-23

An independent, read-only audit of the hard cutover from the legacy codebase to Vibestack, made
while the port was still in review. It asks one question per slice: does anything the legacy
branches did fail to exist in the port? Nothing here was built, generated or run; every finding
comes from reading both trees. Treat a finding as a lead to check against the current tree, not as
the current state.

## What was audited

| Side | Legacy | Port |
|---|---|---|
| Alpha | `develop` dd63c6bc (through #1454) | `claude/vibestack-migration` 3d7ca972 (#1451 before it merged) |
| Eliza | elizaOS/eliza `develop` 7a124190a1 | elizaOS/eliza `vibestack-dp` 769b4f00d (before the wave-3 areas merged) |

Both ports have moved since: #1451 merged into `vibestack`, seven area-fix branches landed on top of
it, and `vibestack-dp` merged into upstream `vibestack`. Several findings below are already fixed or
recorded in [`../vibestack-open-items.md`](../vibestack-open-items.md). A gap is closed only when someone has
checked it against the tree it will ship from.

## Method

- Round one: one auditor per slice, following [`brief-alpha.md`](brief-alpha.md) or [`brief-eliza.md`](brief-eliza.md).
  Each file has a summary with counts, the gaps most severe first, what was confirmed, and what the
  auditor did not cover.
- Skeptic pass: a second reader tried to refute each gap and appended `## Skeptic verdicts`. The
  pass was cut short by a usage limit, so only the files marked below have it.
- The second coverage round (each file's "Not covered" list) and the merged register did not run.

## Alpha: legacy `develop` against the port

| File | Skeptic pass |
|---|---|
| [`alpha-android.md`](alpha-android.md) | no |
| [`alpha-assistant.md`](alpha-assistant.md) | no |
| [`alpha-browser-maps.md`](alpha-browser-maps.md) | yes |
| [`alpha-calendar.md`](alpha-calendar.md) | no |
| [`alpha-camera.md`](alpha-camera.md) | yes |
| [`alpha-inbox.md`](alpha-inbox.md) | no |
| [`alpha-notes-files.md`](alpha-notes-files.md) | yes |
| [`alpha-platform-a.md`](alpha-platform-a.md) | no |
| [`alpha-platform-b.md`](alpha-platform-b.md) | yes |
| [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md) | yes |
| [`alpha-shell-clock.md`](alpha-shell-clock.md) | no |
| [`alpha-telephony.md`](alpha-telephony.md) | no |
| [`alpha-tooling.md`](alpha-tooling.md) | no |
| [`alpha-voice.md`](alpha-voice.md) | no |
| [`alpha-workflows.md`](alpha-workflows.md) | no |

`alpha-tooling.broken-tests.txt` lists the files that referenced removed code at the audited commit.

## Eliza: `develop` against `vibestack-dp`

| File | Skeptic pass |
|---|---|
| [`eliza-agent-runtime.md`](eliza-agent-runtime.md) | yes |
| [`eliza-assistant.md`](eliza-assistant.md) | yes |
| [`eliza-browser-maps.md`](eliza-browser-maps.md) | no |
| [`eliza-calendar.md`](eliza-calendar.md) | no |
| [`eliza-cloud-identity.md`](eliza-cloud-identity.md) | yes |
| [`eliza-cloud-services.md`](eliza-cloud-services.md) | yes |
| [`eliza-core.md`](eliza-core.md) | no |
| [`eliza-device-proposals.md`](eliza-device-proposals.md) | no |
| [`eliza-inbox.md`](eliza-inbox.md) | yes |
| [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md) | no |
| [`eliza-notes-files-workflow.md`](eliza-notes-files-workflow.md) | yes |
| [`eliza-os-android-comms-media.md`](eliza-os-android-comms-media.md) | no |
| [`eliza-os-android-system.md`](eliza-os-android-system.md) | no |
| [`eliza-os-image-build.md`](eliza-os-image-build.md) | no |

## Ledgers and counts

- [`eliza-pr-ledger.md`](eliza-pr-ledger.md): eliza `develop` PR merges since 2026-11-13 with no recorded port disposition.
- [`formal-alpha-static.md`](formal-alpha-static.md), [`formal-eliza-static.md`](formal-eliza-static.md): stories, rules, Quint blocks, proof files and conformance drivers per area, counted without running anything.
- [`tool-sync.md`](tool-sync.md): which lalalune/vibestack tool revision upstream `vibestack` carried.
- [`pr-board.md`](pr-board.md): open pull requests and the phone baseline when the audit started.

## Paths in the findings

The findings cite the audit checkouts by their local names: `alpha-develop` and `alpha-vs` are this
repository at the two commits above, and `eliza-develop` and `eliza-vs` are elizaOS/eliza at its two.
Absolute paths under `/home/shaw/.cache/` belong to the machine the audit ran on.
