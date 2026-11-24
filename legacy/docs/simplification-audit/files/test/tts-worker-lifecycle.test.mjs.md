# test/tts-worker-lifecycle.test.mjs
- Lines: 17 | Kind: spawn wrapper (T9) around `scripts/test-tts-startup.ts` and `scripts/test-tts-worker-lifecycle.ts` | Verdict: DELETE
- Covers: upstream standalone speech route warm-up/retry and upstream speech worker pipe-failure/cancellation handling. Duplicates: upstream's own tests (see `files/scripts/test-tts-startup.ts.md` and `files/scripts/test-tts-worker-lifecycle.ts.md`, both DELETE). Callers/importers: `npm test`; it is the only caller of the two scripts.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | T9 | The test is a shell around scripts that are the real tests. | Delete with both scripts. | none |
| 2 | — | T5 | The scripts exercise upstream worker code. | Upstream owns that coverage. | low |
| 3 | 13 | T8 | 10 s spawn timeout per script. | Saved. | none |

## Proposed end state
File and both `scripts/test-tts-*.ts` deleted. Alpha's own voice journeys (`journeys/voice.spec.ts`) cover speech as the
product uses it.
