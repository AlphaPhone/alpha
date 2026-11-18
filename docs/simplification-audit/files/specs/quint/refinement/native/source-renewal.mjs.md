# specs/quint/refinement/native/source-renewal.mjs
- Lines: 53 | Kind: Quint refinement harness (Java) | Verdict: PORT (with platform) + SIMPLIFY
- Covers: model `NativeSourceRenewal` (live) — renewal notice taps, exact token per source/owner/revision, revoke/refusal/flip races, failed clear and owner withdrawal. Compiles `SourceRenewalNotices`, `SourceRenewalHost`, `HostedNoticePoster`, `HostedResultNotices`, `PluginWorkers` whole + upstream `NoticeOwner`. Duplicates: `test/quint-native-source-renewal.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-31 | B3/T1 | Asserts the native manifest lists the notifications module and that no patch targets `NoticeOwner` — with zero patches the second is vacuous; the first is a config pin. | Delete both. | L |
| 2 | 24 | B5 | Hashes `NativeDigestHost.java` and `NativeDigestSources.java`, which the platform replaces with fakes. | Drop from `sources`. | L |
| 3 | 32-33 | C3 | Hand-written pinned-blob assertion (same as six other harnesses). | Shared helper or drop. | L |
| 4 | 14 | A63 | `SourceRenewalHost.java` merges into `SourceRenewalNotices` per delete-candidates A63. | Update `product` list with that merge. | L |

## Proposed end state
~35 lines compiling the renewal product classes (including the extracted bridge class) and vendor `NoticeOwner`.
