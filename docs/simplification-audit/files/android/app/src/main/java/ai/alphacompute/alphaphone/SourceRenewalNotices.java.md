# android/app/src/main/java/ai/alphacompute/alphaphone/SourceRenewalNotices.java
- Lines: 50 (line 26 is 1,273 characters) | Role: persisted ledger of digest-source renewal notices: arm, post, capture tap, pending, settle, withdraw other owners, clear | Verdict: SIMPLIFY
- Importers: `SourceRenewalHost` (constructs), `AlphaHostedResultsPlugin` via the host. Text/path pins: `test/fixtures/SourceRenewalNoticesTest.java` + `test/source-renewal-notices.test.mjs` (javac), `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{SourceRenewalTraces.java,source-renewal.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26, 43-46, 49 | D8 (P4) | Six methods written as single lines of 400-1,273 chars. | Format; each method becomes 10-20 readable lines. | None (T1 tests that regex this file may need updating). |
| 2 | 26, 43, 44, 46, 49 | C5 | `List<String> keys=new ArrayList<>();rows.keys().forEachRemaining(keys::add);` 5×. | `private static List<String> keys(JSONObject)`. | None. |
| 3 | 30, 37, 43, 44, 45 | C5 | `rows.remove(key);save(rows);poster.cancel(key);` (stale-row drop) 5×. | `private void drop(JSONObject rows, String key)`. | None. |
| 4 | 11-13 | C1 (P7) | Local `Store` interface (single-slot read/write) — twin of the six slot interfaces; `Guard` here has a different shape (`describe`) and is misnamed. | Use shared slots + `SLOT`; rename `Guard` to `Source`. | Low. |
| 5 | 26 | C3 | Renewal key = `hash(JSONArray of 6 identity fields + expiry)`; same field list as `selection()` (19) and `sameSelection` (48) and `NativeDigestSources.slot`. | One `SELECTION_FIELDS` constant. | None (key bytes unchanged). |
| 6 | 46 | C6 | `"https://device.alpha.invalid"` literal (also `NativeOwnerReminderHost:43`). | `NativeDeviceEnrollmentKey.LOCAL_ORIGIN`. | None. |
| 7 | 47-48 | — | `sameSelection` exists because Android org.json lacks `similar()`; fine. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `RenewalStale`, `RenewalUnverifiable` | exception | 8, 10 | `NativeDigestSources.SourceChanged` (mapped) | here |
| `Store` | interface | 11 | 6 slot interfaces | shared slots |
| `Guard` | interface | 12 | name clash with 7 `Guard {check()}` types | rename `Source` |
| `Poster` | interface | 13 | `HostNoticePoster` methods | here |
| `SLOT` | const (persisted) | 6 | `RendererCredentialSlots` lists `hosted-notices` | here |

## Proposed end state
~110 physical / ~45 logical lines after formatting with `keys`, `drop`, `SELECTION_FIELDS`; plus `get(Context)` merged
from `SourceRenewalHost`. Persisted row format (`selection`, `expiresAt`, `phase`, `pending`) unchanged.

## Verification
`test/source-renewal-notices.test.mjs`, Quint `source-renewal.mjs`, renewal notice instrumentation.
