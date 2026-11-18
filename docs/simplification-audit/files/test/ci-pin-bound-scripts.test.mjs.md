# test/ci-pin-bound-scripts.test.mjs
- Lines: 35 | Kind: source/data consistency (imports Python modules for their constants; hashes `AlphaCalendarPlugin.java`; cross-checks three JSON records) | Verdict: DELETE
- Covers: `scripts/ci/calendar-bridge.py` `SDK` equals `upstream.lock.json` and its `HOST` equals sha256 of `AlphaCalendarPlugin.java`; `reproduce-paradee-model.py --print-config` matches `host-speech-assets.json` and `android/voice-host/qualified-voice-host.json`. Duplicates: `calendar-bridge.py:216-219` enforces both pins itself at run time in `android.yml`. Callers/importers: `npm test` glob only (research table misdescribes it as "runs a Python unittest").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-23 | B5/T1 | `HOST` is a hash pin of a product file: every edit of `AlphaCalendarPlugin.java` must also edit the CI script. The test only moves the failure from the Android lane to `npm test`. `SDK` is already read from `upstream.lock.json` (line 17 of the script), so that assertion is tautological. | Delete the test; owner question whether the `HOST` pin in `calendar-bridge.py` should go too (it is evidence ceremony). | Low |
| 2 | 25-35 | A7/P4 | `reproduce-paradee-model.py` is run only by dispatch-only `reproduce-paradee-model.yml` (scripts research: delete candidate). | Delete with the reproduction workflow; if kept, the consistency belongs in `scripts/voice-host.ts` record admission. | Low |

## Proposed end state
Deleted. The calendar bridge keeps (or drops) its own run-time pin; the Paradee reproduction is retired or its record
check moves to the voice-host admission script.
