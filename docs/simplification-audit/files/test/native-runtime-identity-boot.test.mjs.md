# test/native-runtime-identity-boot.test.mjs
- Lines: 158 | Kind: transplant on the JVM (slices `getLocalAgentBootState`, `projectLocalAgentBootState`, `isTerminalBootStatus` and a constant from upstream `vendor/eliza/.../ElizaAgentService.java`, and `startupRefusalMessage`/`shutdownConfirmed` from `AlphaLocalAgentPlugin.java`, into a generated harness compiled with upstream `ResidentAttachment.java`) plus source regexes | Verdict: DELETE
- Covers: a resident whose runtime identity was refused reports `dead`, stays unattachable, surfaces a startup refusal and is not mistaken for a confirmed shutdown. Duplicates: `test/resident-attachment.test.mjs` (attachment refusals), Quint `ResidentCoordinatorTraces.java`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-20, 47-89 | T2, T5 | Most code under test is upstream (`ElizaAgentService`, `ResidentAttachment`). | Delete; upstream follow-up for the boot projection. | Low |
| 2 | 51-77 | A8 | Fallback branch rebuilding "the old actual projection" for a source that no longer exists. | Gone. | None |
| 3 | 56-65, 151-154 | T1 | Regexes over upstream method text. | Gone. | None |
| 4 | 82-86 | T2 | Alpha's `startupRefusalMessage`/`shutdownConfirmed` sliced by brace counting. | If wanted, test them after extraction into a small class in the plugin split. | Low |

## Proposed end state
File deleted. Alpha's refusal message is visible in `journeys/startup-permissions.spec.ts` (resident start refused
shows the refusal), which is where the user sees it.
