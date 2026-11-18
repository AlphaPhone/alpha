# specs/quint/application/RendererHostedInbox.qnt
- Lines: 98 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Browser and Android-fallback digest retention: rows recorded and indexed before provider acknowledgement, stale bodies cannot replace history, refused notices retried. Duplicates: RendererDigestQueue (same module, queue concern). Callers/importers: `renderer-hosted-inbox.mjs` (aggregate) <- `test/quint-renderer-hosted-inbox.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based (`bundledSource` of `digest-inbox.ts`, calls `createDigestInbox`). | None. | - |
| 2 | manifest | A7 | Sources `runtime/digest-inbox.ts` (A103 merge), `runtime/hosted-digests.ts` (B297/B298 trims) and upstream `.eliza/.../hosted-digests.ts`. | Update paths with A103. | M |
| 3 | 161-169 | - | Seeds `evicted`/`retained` represent existing on-device rows; no legacy envelope, so D1 does not touch it. | None. | - |

## Proposed end state
- Keep; follows A103 path move; fate tied to owner question Q-HOST-5.
