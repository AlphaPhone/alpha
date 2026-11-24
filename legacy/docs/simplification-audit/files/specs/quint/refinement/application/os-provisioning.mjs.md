# specs/quint/refinement/application/os-provisioning.mjs
- Lines: 97 | Kind: Quint refinement harness on the host JVM for AOSP Provision code; Java text observer injection (T10, mild) | Verdict: KEEP
- Covers: AOSP setup wizard Welcome/Completion: HOME role request with generation/timeout fences, destroyed activity and device-management authority loss, LatinIME default unless the owner chose one, explicit Appearance apply (`android/aosp/branding/provision/AlphaWelcome.java`, `AlphaAppearance.java`, `AlphaFreshPresets.java`, `AlphaFreshSetupPolicy.java`). Model `OSProvisioning.qnt`.
- Duplicates: `test/aosp-fresh-presets.test.py` compiles the same policy classes with its own Java probe (T4, partial; FreshTest covers completed/managed/home-failure/IME choices). Callers: `test/quint-os-application-refinement.test.mjs`, `index.mjs:112`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 80-84 | T10 | Inserts `Probe.enterPresets()`, `Probe.keyboardResult(...)`, `Probe.fail()` at three exact Java lines of `AlphaWelcome.java`. | Acceptable for image code that cannot be run as a module; alternatively observe only via the stubbed ports (settings writes, completion callback) and drop the phase field. | Low. |
| 2 | 19-20, 37 | — | Reads private fields (`waiting`, `generation`) and finds the private `$Completion` controller by reflection. | Keep; brittle only on rename of those members, which a reviewer sees. | Low. |
| 3 | 73-75 | B5 | Hashes non-executed inputs (`index.mjs`, aggregate test, scripts). | Drop. | Low. |
| 4 | — | T4 | Python FreshTest duplicates the IME/managed/home cases. | Keep one: this harness (model-backed) and delete the overlapping Python cases, or vice versa; decide in the test chunk. | Low. |

## Proposed end state
Same 12 traces, Java probe in a file, observer anchors documented as the contract, no duplicate Python coverage.
