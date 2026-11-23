# specs/quint/refinement/application/renderer-digest-queue.mjs
- Lines: 119 | Kind: Quint refinement harness, import-based (`bundledSource('apps/app/src/runtime/digest-inbox.ts')`, synthetic storage and provider ports) | Verdict: KEEP
- Covers: per-scope FIFO of hosted workflow digest inbox sync calls — same-scope serialisation, abort of queued/held callers without early hand-off, Android renderer-fallback scope separate from browser scope, refused predecessor still releases (live model `RendererDigestQueue.qnt`, manifest ~l.3183). Duplicates: `RendererHostedInbox` uses the same `createDigestInbox` but single-caller; no Playwright spec covers concurrent same-scope syncs. Callers/importers: `index.mjs:89`, `test/quint-renderer-digest-queue.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | Product path, not D5: `digest-inbox.ts` wraps upstream `DigestInbox` (re-exported by `hosted-digests.ts` from `.eliza/…/plugin-workflow/src/client/hosted-digests.ts`) and is imported by `main.tsx`, `automations-adapter.ts`, `hosted-background.ts`. | Keep. | — |
| 2 | 83-84, 114 | B5 | `captureSources([driver, implementation, …])` and then `boundInputs` with `sources: [driver, ...sources, ...extraSources]` — captured twice. | One capture. | None |
| 3 | 30-58 | — | Imperative but readable scenario API; good model for other harnesses. | Keep. | — |

## Proposed end state
Unchanged apart from a single source capture; registered once.
