# specs/quint/native/NativeGmailBackground.qnt
- Lines: 355 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP; remove one duplicated branch
- Covers: the Gmail background WorkManager worker and bridge: grant selection/withdrawal epochs, encrypted cursor and continuation, history 403/409 budget, notice posting without reposts, tap consume/release custody. Duplicates: host tests `gmail-background-binding.test.mjs`, `gmail-lifecycle-custody` (source-text, T1, listed in cross-file-actions) — this model plus its harness is the behavioural coverage that should stay. Callers/importers: `native/manifest.json` (19 tests, 10 invariants), harness `refinement/native/gmail-background.mjs` + `gmail-background-platform.mjs` + `GmailBackgroundTraces.java`; `test/quint-native-gmail-background.test.mjs`; native aggregate; README `:808`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 184-185 | B4 | `finishWorker` repeats `else if (s.owner==s.remoteOwner and not(s.online)) retry(cleared)` twice; the second is unreachable. | Delete line 185. | L |
| 2 | harness | T10 (upstream) | Product classes compile whole. `gmail-background-platform.mjs:17-19,174` slices **upstream** `NativeProviderAdmission.java` (`cloudId(`…`cloudIdentity(`, asserts `verifiedCloudIdentity`). `GmailBackgroundTraces.java` reflects on the field `io` (cross-file-actions). | Upstream follow-up (D14) to expose the identity helper; keep the field name stable (G5 applies to the worker class name). | M |
| 3 | 4-10 | D9 | 40-field state record; 19 scenario tests. It is the largest model in this chunk, but each field is observed by the harness (48 observed fields). | None. | - |
| 4 | test wrapper | T4, B5 | Run twice; pins `traces 31`, `observedFields 48`. | One runner; `> 0`. | L |

## Proposed end state
Same model minus the dead duplicate branch. Keep as the behavioural coverage for Gmail background delivery once the
source-text host tests are deleted.
