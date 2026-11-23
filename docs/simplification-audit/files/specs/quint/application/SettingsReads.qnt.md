# specs/quint/application/SettingsReads.qnt
- Lines: 151 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: MERGE into `SettingsCapabilityReads.qnt` (device-facts part into `SettingsSession.qnt`)
- Covers: Settings async reads: device facts generation fence, facts a resume behind another view leaves unread, capability read with abort identity and 10 s limit, licences load once. Duplicates: `SettingsCapabilityReads.qnt` (capability read, limit, licences: same behaviour, same `licensesLoadOnceTest`), `SettingsSession.qnt` (device-facts generation fence, unmount retires reads). Callers/importers: manifest only (11 symbol pins in `settings-adapter.ts`, incl. code fragments `async function refresh()`, `Authorization not verified`). No harness, no test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | - | C5/T4 | Third Settings read model; its capability and licence half duplicates SettingsCapabilityReads, its device-facts half duplicates SettingsSession's generation fence. | Carry only the unique cases: to SettingsSession `resumeBehindViewTest` (resume behind another view leaves facts unread; Back reads them); to SettingsCapabilityReads `capabilityLimitTest` (late answer after limit stays not-verified), `hiddenAccountChangeTest`, `backAfterHiddenResetTest`. Then delete this file, its manifest entry and README row. | M |
| 2 | manifest | T10 | Never executed against code; only symbol pins. | Goes with the merge. | L |

## Proposed end state
- Deleted after its four unique scenarios move to the two remaining Settings models.
