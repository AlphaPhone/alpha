# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CloudDelegationCallbackInstrumentedTest.java
- Lines: 62 | Role: `alphaphone://cloud-delegation` callbacks through MainActivity and `AlphaConnection.readDelegationCallback/clearDelegationCallback`: cold retention across recreation, warm delivery, malformed-link rejection, error callbacks. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` phases `cloud-callback-cold` / `cloud-callback-warm` (method names + gate `cloudDelegationNative`), asserted by `scripts/ci/test-pending-recovery-phases.py:54`; run in resident-android.yml recovery-ui job. No `CLASS_REGISTRY` entry.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-27 | C3 / T7 | Private `js`, `waitFor`, `call(body)` promise-capture (`window.__cloudCallbackTest=null;Promise.resolve().then(async()=>{…})`) | Shared `WebViewTestDriver.call/await` | Low |
| 2 | 49, 53 | T8 | Fixed sleeps `SystemClock.sleep(250)` (drain) and `SystemClock.sleep(200)` per malformed link before asserting no event | Keep the 200 ms negative-window (it is the observation window for "no event"); replace the 250 ms drain with waiting for the retained cold event count to stabilise | Low |
| 3 | 57 | C3 | Hand-written poll for an error callback | Shared poll helper | None |
| 4 | 52 | D8 | 11 malformed URIs on one line | One per line | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `state()` | helper | 16 | `CloudSignInFlow.newState()` (upstream) produces the same 32-byte base64url state | use `CloudSignInFlow.newState()` if its format matches the delegation contract, else keep |
| `intent(uri)` | helper | 17 | CloudSignInCallback:24 identical | `AppNavigation.viewIntent(uri)` |
| `gate()` | helper | 19 | CloudSignInCallback:27 same shape | keep (gate text pinned by runners) |
| `js`/`waitFor`/`call` | helper | 20-27 | ~77 poll copies; ClockAgentReview/Connection/CloudVoice capture helpers | `WebViewTestDriver` |

## Proposed end state
Both @Test methods kept (names pinned by pending-recovery-ui.py). Private bridge helpers replaced; `intent(uri)` shared with
CloudSignInCallback; malformed cases one per line. Estimated 62 -> ~55 lines.

## Verification
`python3 scripts/ci/test-pending-recovery-phases.py`; recovery-ui job phases `cloud-callback-cold`/`cloud-callback-warm`.
