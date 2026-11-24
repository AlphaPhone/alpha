# specs/quint/legacy/core/check-interaction-session-refinement.mjs
- Lines: 253 | Kind: Quint refinement harness (legacy model of upstream-only code; real SQLite) | Verdict: DELETE
- Covers: 12 schedules / 121 checkpoints of upstream `MessageInteractionSessionAuthority` (`packages/core/src/messaging/interaction-sessions.ts`) and `SqliteMessageInteractionSessionStore` (`packages/agent/src/services/sqlite-message-interaction-session-store.ts`) on a temp `node:sqlite` journal against `legacy/CoreInteractionSession.qnt`. Duplicates: none in this repo. Callers/importers: `specs/quint/refinement/legacy/index.mjs:16`, `test/quint-core-interaction-session.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6, §2.9 | Neither file is in `scripts/core-state-patch.ts` `CORE_STATE_TARGETS`; the product ships upstream bytes unchanged, so this checks upstream behaviour that can only change on a pin bump. | Delete; offer the harness upstream (D14 follow-up list). | Loses consumer-side evidence for interaction-session leases; upstream owns it. |
| 2 | 16-21 | — | esbuild `onResolve` rewires `@elizaos/core` to two leaf files: a bundling shim, not product code. | Gone. | None. |
| 3 | 236-242 | B5 | Narrative assumptions in receipts. | Gone. | None. |
| 4 | — | owner | Whether the product actually uses message interaction sessions (native choice callbacks) on device is not visible from this harness. | Owner question. | — |

## Proposed end state
Delete harness, `legacy/CoreInteractionSession.qnt` + manifest entry, index row and `test/quint-core-interaction-session.test.mjs`.
