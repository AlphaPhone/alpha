# test/browser/dev-connection-setup.spec.ts
- Lines: 23 (6 call sites, 8 tests after the profile loop) | Kind: Playwright `chromium`, dev build, UI through the diagnostics dialog plus Storage/locks patches | Verdict: **MERGE** into `journeys/dev-surface.spec.ts` (1 case)
- Covers: development connection profiles (local, cloud, remote) save a scripted reply, chat, reload and restore history with no external requests; failed selection save; separate histories per profile; Home cancels a locked reply save; another tab retires the session; a workflow Write step uses the development reply. Duplicates: the "Development reply" chat round-trip is exercised by most dev specs that connect a profile. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`, `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | D5 | Loop runs the `cloud` and `remote` profiles; both are C4 paths (personal Cloud, paired remote). | Keep only `local`. | none |
| 2 | 6-8 | — | Local: save scripted reply, connect, chat, reload, restore conversation, no external request. | Carry; external-request fence comes from the harness. | none |
| 3 | 9-11, 15-17 | P3 | `Storage.prototype.setItem` patch; `navigator.locks` hold plus synthetic `launcher-home`. | Delete. | Low |
| 4 | 12-14 | D5 | Separate histories rely on the `remote` profile. | Delete. | none |
| 5 | 18-20 | T6 | Another tab writes `alpha.connection.selection.v1` directly; asserts on `connectionController` snapshot. | Delete. | Low |
| 6 | 21-23 | A1, P2 | Workflow Write test seeds `alpha.dev.app.workflows` and opens Notes through `openLegacyNotes`. | Delete; the workflows journey runs a Write step. | Low |
| 7 | 5 | A8 | Comment "Diagnostic-only fixture; no production Settings shortcut." | Gone. | none |

## Proposed end state
One case in `journeys/dev-surface.spec.ts`: connect the local development profile with a scripted reply, chat, reload and restore the conversation. Delete the file.
