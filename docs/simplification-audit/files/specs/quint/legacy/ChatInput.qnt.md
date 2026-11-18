# specs/quint/legacy/ChatInput.qnt
- Lines: 84 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: chat composer overlay design (no leak of draft, no stray open, back-in-order, draft kept, one touch-down); 6 scenario runs. Duplicates: live models `application/ChatDock`, `ComposerSend`, `ChatAttachments`. Callers/importers: `legacy/manifest.json`; `legacy/README.md`; `test/fixtures/quint/ChatInputCurrentComparison.qnt`; `legacy/chat-input/check-chat-input-refinement.mjs`; `test/quint-legacy-chat-input-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (`quint:compare --models=ChatInput,...`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/ChatDock`, `ComposerSend`, `ChatAttachments`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`legacy/chat-input/check-chat-input-refinement.mjs` (reads mismatch receipt JSON, line 348)) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | — | P4 | Only consumer of `quint:compare` (with SettingsNav, HomeLayout, GoogleConnect) is `quint-model-check.yml`, which has never completed (research ci-and-formal). | Remove the compare step / workflow with the legacy family. | Low |

## Proposed end state
Delete `specs/quint/legacy/ChatInput.qnt`, its `legacy/manifest.json` entry, `legacy/chat-input/check-chat-input-refinement.mjs` (reads mismatch receipt JSON, line 348), `legacy/manifest.json`; `legacy/README.md`; `test/fixtures/quint/ChatInputCurrentComparison.qnt`; `legacy/chat-input/check-chat-input-refinement.mjs`; `test/quint-legacy-chat-input-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (`quint:compare --models=ChatInput,...`).. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (NoLeak, BackInOrder, DraftKept, OneTouchDown) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
