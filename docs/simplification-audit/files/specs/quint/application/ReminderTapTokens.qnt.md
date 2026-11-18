# specs/quint/application/ReminderTapTokens.qnt
- Lines: 158 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP (merge target)
- Covers: Native reminder-tap token: single-flight check with one queued rerun, consume only after the exact detail is visible, question consume/release. Duplicates: RetainedReminderTapAdmission models the same consume-after-visible custody with chooser/sensitive/form/foreground gates (here collapsed into `blocked`). Callers/importers: `reminder-tap-tokens.mjs` <- `test/quint-reminder-tap-tokens.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 (light) | `reminder-adapter-fixture.mjs:31-34` finds `let tapBusy = false, tapRequested = false, tapInteraction = 0;` in the esbuild output and appends a probe. Anchored on bundler formatting of `reminder-adapter.ts:29`; Prettier (D9) or a rename breaks it. | Have `reminder-adapter.ts` keep tap state in one exported-for-dev object, or observe only via native calls; drop the text anchor. | M |
| 2 | - | C5 | Overlaps RetainedReminderTapAdmission. | Absorb its gate scenarios here (see that report). | M |

## Proposed end state
- Keep; becomes the single reminder-tap model after merging RetainedReminderTapAdmission.
- Add actions/scenarios: chooser closes and the retained token is rechecked; visit changed refuses the same detail; native replacement keeps the newer token.
- Probe anchor replaced by an explicit inspection seam.
