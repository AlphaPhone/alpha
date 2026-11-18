# specs/quint/refinement/services/phone-session-replay.mjs
- Lines: 95 | Kind: Quint model-trace replay (bundles real `prototype/phone-adapter.ts` with module-specifier stubs; real `createAospTelephony`) | Verdict: KEEP, SIMPLIFY
- Covers: `PhoneSession` (live, `manifest.json:3265`): the Phone page busy/access/notice projection over held status reads and dialer hand-offs (refresh during dial, leave during dial, stale hand-off beside a later dial, refusals while reading/handing off, access needed, superseded read, typed number clears notice). Duplicates: run twice - `test/quint-phone-session.test.mjs` (`runPhoneSessionCase1`, with canary) and `services/forward-replays.mjs:20` (`runPhoneSessionReplay`, no canary) (T4). Callers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 81-95 | T4 / B5 | Two entry points differing only by the canary; the canary (lines 86-90) re-runs one trace with a deliberately wrong projection to prove the comparison is live, and lines 84-85 pin exact trace and rejection counts. | Keep one `runPhoneSessionReplay`; delete the canary and exact-count assertions (keep the per-action coverage check, line 91). Delete `test/quint-phone-session.test.mjs` (already DELETE in its report). | Low |
| 2 | 21-26, 41-49 | D2 coupling | Drives `installPhoneAdapter(Shell, views, ...)` with a fake `Shell` class and `componentDidMount/DidUpdate/WillUnmount`: depends on the prototype monkey-patch adapter API. Not text slicing, but it breaks when stage F replaces adapters with modules. | When the Phone adapter becomes a module with explicit inputs, drive that module; keep the same observations. | Medium (stage F) |
| 3 | 37-38 | A8 | Comment calls PhoneSession "the legacy dialer-handoff branch". It is the live role-refusal fallback, not legacy data. | Reword ("dialer hand-off fallback when the app does not hold the dialer role"). | Low |
| 4 | 44 | — | Sets `globalThis.document` without restoring a previous value on close (deletes it). Fine in a dedicated process; risky in a shared runner. | Save/restore the previous descriptor (as `scan-review-dialogs.mjs:46` does). | Low |
| 5 | 13-14 | T10 (copy) | `OPENED` and notice texts are matched literally against UI copy. | Acceptable (observes user-visible copy); keep. | Low |

## Proposed end state
One exported replay function used by `forward-replays.mjs`, no canary/count pins, restored globals; ported to the
Phone module API when the adapter pattern is replaced.
