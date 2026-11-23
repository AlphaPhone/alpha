# specs/quint/refinement/services/contacts-session-replay.mjs
- Lines: 87 | Kind: Quint MBT replay (bundles the real `contacts-adapter.ts`, `mvp-features.ts`, `image-contacts.ts` via `sourceModule` with four regex-specifier stubs; drives a fake `Shell` class) | Verdict: KEEP; SIMPLIFY (one entry point, drop canary, typed plugin stub)
- Covers: the Contacts view keeps rows while a refresh loads, ignores superseded reads, handles revoked access, rereads after the system editor returns, and follows image admission — against `ContactsSession.qnt` (scenarios, witnesses, 60 random walks). Duplicates: `test/contacts-adapter.test.mjs` (stub unit test of the same adapter; host-test review should DELETE it in favour of this). Callers/importers: `test/quint-contacts-session.test.mjs` (`runContactsSessionCase1`) and `forward-replays.mjs:15` (`runContactsSessionReplay`, services aggregate) — T4.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-17 | T10 (specifier pins) | Stubs keyed by regex on import specifiers `platform-plugins$`, `native-adapter$`, `browser/dev-profile$`, `runtime/aosp-image$`. app-15 moves `native-adapter.ts` → `runtime/return-to-app.ts`; app-12 adds a typed `runtime/contacts-plugin.ts`. Either change silently un-stubs or fails. Not text slicing: modules are imported whole. | Stub at one seam: the typed contacts plugin module and the return-to-app module, by resolved path; update in the same change as those moves. | Medium |
| 2 | 36-46 | D2 / T6-like | Fake `Shell` class with `S`, `setState`, `vget`, `toast`, `goHome`; `installContactsAdapter(Shell, views)` monkey-patches it. Ties the harness to the adapter-install pattern the structural pass (D2) replaces. | When `contacts-adapter` becomes a module with explicit inputs, call it directly; until then keep. | Medium |
| 3 | 27-29 | A1 / A8 | Comment "This legacy session models the supported read-only host… The current adapter probes write access first; this host deterministically remains read-only" — the port forces `writable:false`, so the write-access path of the live adapter is never covered. | Reword the comment (not "legacy"); owner question whether writable Contacts needs a trace. | Low |
| 4 | 71-86 | B5 / T4 | `runContactsSessionCase1(t, {canaries})` runs a self-test canary (a deliberately wrong projection must be rejected) and asserts trace count; `runContactsSessionReplay` is the same without canary. Two exports for one campaign; `t` unused. | One export `runContactsSessionReplay()`; delete the canary and exact-count assertion; keep the per-action coverage check. Keep only one caller (aggregate or per-model test). | Low |
| 5 | 3 | C1 | Header line "Existing source-executing MBT harness, shared by its original owning tests and the strict services receipt" is history narration. | Delete. | None |

## Proposed end state
~70 lines: one exported replay, stubs on two typed seams, no canary, one caller. Keeps Contacts coverage that no Playwright
journey currently provides (a `journeys/contacts` or `inbox` journey would not replace the held-port race schedules).
