# test/app-update-automatic.test.mjs
- Lines: 228 | Kind: source transplant (slices `settings-adapter.ts` between `// settings-facts:begin/end` and `pollAutomaticUpdate` .. `let gmail =`; `main.tsx` `prepareMountedUpdate` .. `let nativeAppUpdateGate`; the generated upstream `.eliza/.../app-update-gate.ts`; runs in `vm` and JSDOM; uses the `cloud-voice-view` vm fixture) | Verdict: DELETE; carry three behaviours to `journeys/settings.spec.ts`
- Covers: automatic update discovery sends only admitted bytes for the installed flavor/signer; skips when permission is missing or a session is pending; scheduler backoff on "starting"; disposal/backgrounding retire late reads; offline/editing retry; a focused editor or active compact voice (including pending retirement) refuses readiness. Duplicates: the Quint harnesses `specs/quint/refinement/application/automatic-app-update-schedule.mjs` (slices the same `settings-facts` and `pollAutomaticUpdate` markers and runs `createAppUpdateScheduler`) and `mounted-update-admission.mjs` (slices the same `prepareMountedUpdate` range and runs `watchMountedAppUpdates`); upstream `vendor/eliza/packages/ui/src/state/__e2e__/app-update-gate.test.ts` for the gate; `test/browser/settings-device-facts.spec.ts` for rendered update rows. Callers/importers: `npm test`; imports `test/support/strip-types.mjs`, `test/fixtures/cloud-voice-view.mjs` (many other importers, survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-18, 132-133, 161-163 | T2, T4 | Same slices as the two Quint harnesses; double execution of the same scenarios. | Delete; the Quint harnesses keep the coverage until they are ported to imports (T10). | low |
| 2 | 13 | T1 | Top-level `assert.ok(poll.includes('automatic:true'))` on source text. | n/a | none |
| 3 | 17-18, 109 | T5 | Executes the upstream gate from generated `.eliza/` output. | n/a; upstream tests it. | none |
| 4 | 139-176 | T2 | Builds a voice shell from the vm `cloudVoiceViewFixture`. | n/a | none |

Cases worth carrying to `journeys/settings.spec.ts` (with the AlphaDevice fixture already used by `settings-device-facts.spec.ts`):
1. An automatic update never starts while a compact voice conversation (or its pending retirement) is active.
2. A focused editor refuses automatic readiness; a manual update explains the refusal.
3. A pending Android session or missing install permission starts no automatic install.

## Proposed end state
File removed; three journey steps; scheduler timing stays in the Quint replay.
