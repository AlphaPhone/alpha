# specs/quint/refinement/native/saved-sign-in-recovery.mjs
- Lines: 0 (file deleted in this worktree, with `SavedSignInRecoveryReplay.java`) | Kind: – | Verdict: DELETE (already done)
- Covered legacy saved Cloud sign-in recovery (D1/C5 `LegacyCloudRecovery`). Remaining references: none in `test/`, `scripts/`, `specs/` (grep for `saved-sign-in-recovery|SavedSignInRecovery` returns nothing); `forward-replays.mjs` and `credential-coordinator.mjs` are modified in the same change. Confirm `specs/quint/native/manifest.json` has no model entry left for it.
