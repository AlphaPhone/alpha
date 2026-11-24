# specs/quint/refinement/services/forward-replays.mjs
- Lines: 39 | Kind: aggregate receipt wrapper (re-runs 14 per-model replays through `observedReplay` to emit receipts) | Verdict: DELETE (with the services aggregate)
- Covers: nothing new: it calls the same `run*Replay` / `replay*` / `check*` entry points that each per-model test already runs (`test/quint-approval-decision`, `-contacts-session`, `-inbox-edit-coalescer`, `-maps-connection`, `-maps-guidance-voice`, `-mms-compose`, `-phone-session`, `-resident-maps-relay-offer`, `-service-read-cache`, `-sms-send`, `-system-picker-visibility`, `-trigger-cursor`, `-web-reading-review`, `-workflow-lifecycle-change`). Callers: `services/index.mjs` only (`native/index.mjs` imports its own `native/forward-replays.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-30 | T4 | Every row duplicates a per-model host test (14/14 found by grep). Running the aggregate executes each model twice. | Delete this file and its entry in `services/index.mjs`. | Low |
| 2 | 33-38 | B5 | Exists to wrap results in a before/after source-closure receipt; no release gate reads it. | Delete with the receipt layer. | Low |
| 3 | 7-10 | — | Registers the tsx loader per call for `-replay.mjs` modules; the per-model tests run under `node --import=tsx` already. | Gone with the file. | — |

## Proposed end state
File removed. Each model's replay runs once, from its own `test/quint-<model>.test.mjs`, selected by path.
