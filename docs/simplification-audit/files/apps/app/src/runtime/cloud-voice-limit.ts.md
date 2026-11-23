# apps/app/src/runtime/cloud-voice-limit.ts
- Lines: 67 | Role: reads the retry facts of a Cloud speech HTTP 429 — `readCloudVoiceLimit` (from `Retry-After` + JSON body; used by the dev browser bridge) and `cloudVoiceLimitOf` (from a voice error's `data`, used in product); bounded-wait core has LemmaScript contracts. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `cloud-voice.ts:10` (`cloudVoiceLimitOf`), `browser/cloud-connection.ts` (`cloudVoiceLimitOf`, `CloudVoiceLimitFacts`), `scripts/browser-cloud-dev-bridge.ts` (`readCloudVoiceLimit`, type).
  Text/path pins: `LemmaScript-files.txt:15`, `specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy(.gen)` (pins `finiteWaitSeconds`, `MAX_RETRY_AFTER_SECONDS`), `specs/lemma/README.md`, `specs/quint/refinement/native/speech-cleanup-latch.mjs` (stubs `cloudVoiceLimitOf`), `test/cloud-voice-limit.test.mjs` (also compiles `CloudVoiceLimit.java`), `test/cloud-voice-profile.test.mjs`, `test/fixtures/cloud-voice-view.mjs`, `test/subscription-entitlement.test.mjs` (comment), `test/support/feature-parity.mjs:491`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-54 | D6 | `readCloudVoiceLimit` parses raw HTTP 429s for the "development browser-resident route" only (header comment 3-4); product reads go through native `CloudVoiceLimit.java`. Only importer: `scripts/browser-cloud-dev-bridge.ts`. | Keep in this file (it shares the verified `finiteWaitSeconds` with the dev bridge and mirrors the Java twin), but mark it dev-only; if the dev bridge moves to a `dev-server/` folder, move `readCloudVoiceLimit` + `isoInstant` with it and import `finiteWaitSeconds`. | Low; Lemma file list must follow. |
| 2 | 14-16 | D4 | `waitSeconds(value)` = `Number.isFinite(value) ? finiteWaitSeconds(value) : undefined` — split only so the annotated core takes a finite number. | KEEP (needed by the Dafny translation); add nothing. | — |
| 3 | 13 | C3 | `record()` plain-object guard; ~35 twins (`cloud-protocol.ts:124`, …). | Import from `lib/parse.ts` once it exists (non-throwing variant). Note: Lemma does not cover `record`, so moving it is safe. | Low. |
| 4 | 57-67 | B3 (justified) | `cloudVoiceLimitOf` re-validates `data` from the native plugin reject — the native bridge is a trust boundary per the catalogue; keep. Comment "validated again" is accurate. | KEEP. | — |
| 5 | 8 | D7 | "Function exports only: Node contract tests and the Vite bridge evaluate this source directly." — test-shaped constraint. | Delete the sentence when the Node transplant tests go (T2). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudVoiceLimitFacts` | type | 10 | Java `CloudVoiceLimit` record (intentional twin) | keep |
| `record` | helper | 13 | `cloud-protocol.ts:124`, `cloud-personal-protocol.ts:20`, `cloud-service-info.ts:4`, … | `lib/parse.ts` |
| `isoInstant` | helper | 28-32 | `cloud-protocol.ts:138 timestamp` (looser) | keep (stricter, bounded) |
| `finiteWaitSeconds` | helper | 18-27 | Java `CloudVoiceLimit` | keep (Lemma) |

## Proposed end state
Unchanged logic, ~64 lines: `record` imported from the shared parse module, test-shaped comment removed; `readCloudVoiceLimit` labelled (or relocated with the dev bridge).

## Verification
`npm run lemma` (Dafny for `finiteWaitSeconds`), `test/cloud-voice-limit.test.mjs` (incl. Java twin parity), `test/browser-cloud-dev-bridge.test.mjs`, `specs/quint/refinement/native/speech-cleanup-latch.mjs`.
