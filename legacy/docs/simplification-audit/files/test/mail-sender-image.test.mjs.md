# test/mail-sender-image.test.mjs
- Lines: 16 | Kind: unit (pure, real import of `runtime/mail-sender-image.ts`) | Verdict: MERGE into `test/integration/inbox.test.mjs`
- Covers: sender avatars map only exact known domains to bundled icons, never send the address, and refuse local/hostile domains. Duplicates: none found (`grep -rl "icons/senders" test/browser` empty). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-16 | T3 (kept exception) | Privacy-relevant pure mapping with a hostile-input table an inbox journey would not enumerate. | Fold the three tests into one table-driven case in the inbox integration file. | Low |

## Proposed end state
One case in `test/integration/inbox.test.mjs`; a journey `journeys/inbox.spec.ts` may additionally assert one known-sender icon renders.
