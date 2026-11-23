# apps/app/src/maps/navigation-voice.ts
- Lines: 69 | Role: Alpha subclass of upstream `NavigationVoice` — routes guidance speech to on-device or app speech, defers instructions while the screen is off and resumes only the still-current instruction | Verdict: SIMPLIFY
- Importers: 1 app (prototype/maps-adapter.ts:9).
- Text/path pins (heavy, T2/T10): test/navigation-voice.test.mjs:8-10 and test/browser/native-speech.production.spec.ts:66-68 strip `^import .*;\n` and `^export ` from this file and eval it with injected `createOnDeviceVoice`, `document`, `speechRoute`, `speakAppText`, `connectionController` — every import must stay a single line and the module may not gain new imported names without updating both tests; test/navigation-voice-pause.test.mjs:22 loads `NavigationVoice` the same way; specs/quint/refinement/services/maps-guidance-voice.mjs:3,33 bundles it; specs/quint/services/manifest.json:5050-5079 pins symbols `NavigationVoice`, `latest`, `owed`, `resume`, `owe`, `hiddenDuringSpeech`, `speakAppText`; test/support/feature-parity.mjs:325.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 59, 62, 66 | C6 | `document.removeEventListener('visibilitychange',this.resume)` written four times (and `addEventListener` once) | Private `stopResume()`/`startResume()` methods | Low; manifest pins `resume`, keep that name |
| 2 | 39 | D9, C3 | `if(hiddenDuringSpeech&&(error as {name?:string})?.name==='AbortError'&&(error as {code?:unknown})?.code!=='speech-cleanup-unconfirmed'&&!signal.aborted&&instruction?.current())` — one 200-char condition with two casts; the `name==='AbortError'` test is hand-written in 18 renderer files | Extract `const resumable = (error: unknown) => hiddenDuringSpeech && isAbortError(error) && !cleanupUnconfirmed(error) && !signal.aborted && !!instruction?.current();` using a shared `isAbortError` in runtime/abort-signal.ts | Low; navigation-voice tests inject only the five names above, so a new import of `isAbortError` must be added to the test's injected names (or defined in this file) |
| 3 | 50-55 | C4 | `update()` snapshots eight fields (`session`, `residentInference`, `providerStatus.revision`, cloud environment, `sessionId`, `credentialId`, `connectionMode`, `open`) and compares them all in `current()` — a hand-rolled "still the same owner" fence, one of ~15 in the renderer (research n–z P11) | Use the shared owner-snapshot helper once it exists (`ownerSnapshot()`/`sameOwner()` on connectionController); until then extract `ownerFence()` in this file returning `() => boolean` | Medium: the eight-field set is behaviour (the StaleOwed witness); keep every field |
| 4 | 21-46 | D8 | Constructor body is a dense closure with `let failure, self` captured before `super` returns; several statements per line | Keep the `self` capture (needed because the callback runs before `this` is usable) but format one statement per line and name the closure `speak` | Low; tests eval the text — formatting is safe as long as imports stay single-line |
| 5 | 1 | D13 | deep relative import | alias | Low |
| 6 | 7 | C1 | local `type Instruction = {key;text;current}` | none elsewhere; keep | — |

No A-pattern issues: every branch is reachable (`speechRoute()` returns device/cloud).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Instruction` | type | 7 | none | stays |
| AbortError test (inline) | helper | 39 | 18 files in apps/app/src (`name==='AbortError'`) | `isAbortError` in runtime/abort-signal.ts |
| eight-field owner fence | helper | 50-55 | runtime/native-reading-voice.ts:18-25, paired-voice.ts:22-35, view-navigation.ts:84-89 and others (research n–z P11) | shared owner-fence helper on connectionController |

## Proposed end state
~60 lines: same class, `startResume/stopResume`, a named `resumable(error)` predicate, an `ownerFence()` helper for the eight-field snapshot, one statement per line. Pinned identifiers (`latest`, `owed`, `resume`, `owe`, `hiddenDuringSpeech`) unchanged.

## Verification
test/navigation-voice.test.mjs, test/navigation-voice-pause.test.mjs, test/browser/native-speech.production.spec.ts, test/browser/dev-maps-voice.spec.ts; quint services maps-guidance-voice refinement; `npm run verify`.
