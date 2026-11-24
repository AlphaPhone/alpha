# specs/quint/native/PhoneCalls.qnt
- Lines: 148 | Kind: Quint model (live) | Verdict: KEEP (trim write-only state)
- Covers: agent-proposed calls (number/name resolution, ambiguous choice, stale number, lock expiry, emergency handoff, one owner approval per placement, lost Telecom reply) plus the owner call lifecycle (dial, ring, answer over lock, hold, mute/speaker/keypad reset, missed-call count). Duplicates: none; `services/phone-session-replay.mjs:38` and `application/manifest.json:8450` explicitly defer direct Telecom placement to this model. Callers/importers: manifest; `refinement/native/telephony.mjs` (`checkTelephonyPhoneCalls`, `index.mjs:68,171`); comment reference in `apps/app/src/runtime/telephony-executor.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | Tie is an import: `telephony.mjs:12-21` esbuild-bundles `telephony-executor.ts`, `phone-adapter.ts`, `aosp-telephony.ts` and runs them with controlled ports. Good shape, no slicing. | none | — |
| 2 | 8, 18, 33-34 | B4 | `ownerPlaced` and `handoffs` are counters that no invariant, guard or test (except `emergencyIsHandedToSystemTest` reading `handoffs`) uses; `ownerPlaced` is write-only. | Drop `ownerPlaced`; keep `handoffs` only if the harness observes it. | low |
| 3 | 94 | — | `repeat` is a named stutter used only so tests can show "a repeat does not place a second call"; `step` already has no other stutter. Fine, but it is the stutter; name it `stutter` or inline `s' = s`. | Optional rename. | none |
| 4 | 36-50 | — | Owner-side call lifecycle (`hold`, `toggleKeypad`, `ringStops`, missed counts) is the native dialer's behaviour; `index.mjs:218` records it as an unexecuted platform obligation. The model still checks the renderer's invariants (`ControlsOnlyInCall`, `MissedSeenBounded`) that phone-adapter mirrors. | Keep; note in the model header which half is replayed. | none |

## Proposed end state
Model stays (live product code: `runtime/telephony-executor.ts`, `prototype/phone-adapter.ts`, `runtime/aosp-telephony.ts`
all exist and none is on a DECISIONS delete list). Drop `ownerPlaced`; one header line saying which actions the
TypeScript replay drives. If Stage F splits `phone-adapter.ts`, update the manifest path only (the harness imports
by module, not by text).
