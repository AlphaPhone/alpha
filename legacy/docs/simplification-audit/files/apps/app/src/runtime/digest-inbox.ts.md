# apps/app/src/runtime/digest-inbox.ts
- Lines: 10 | Role: chooses the native result inbox or the renderer `DigestInbox` fallback. | Verdict: MERGE into apps/app/src/runtime/hosted-background.ts
- Importers: 2 product (`runtime/hosted-digest-ui.tsx` – `createDigestInbox`; `runtime/hosted-background.ts` – type `ResultInbox`). Text/path pins: `scripts/test-local-digest-storage.ts`, `specs/quint/application/manifest.json`, `specs/quint/refinement/application/hosted-digest-refresh.mjs`, `renderer-digest-queue.mjs`, `renderer-hosted-inbox.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | D4/C5 | Ten-line module whose interface `ResultInbox` is implemented in `hosted-background.ts` (`NativeResultInbox`) and whose function has one caller. | Move `ResultInbox` and `createDigestInbox` into `hosted-background.ts` (which already owns the native inbox) and delete this file; update the 3 Quint refinement harnesses and the script import paths. | Low |
| 2 | 4 | D9 | `input.android` and `input.nativeReady` booleans plus a `native` thunk. | Keep; small and explicit. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ResultInbox` | interface | 2 | implemented by `DigestInbox` (`hosted-digests.ts`) and `NativeResultInbox` | `hosted-background.ts` |

## Proposed end state
File deleted; ~9 lines added to `hosted-background.ts`.

## Verification
`scripts/test-local-digest-storage.ts`, Quint `hosted-digest-refresh`, `renderer-digest-queue`, `renderer-hosted-inbox` refinements, `test/browser/digest-inbox-migration.spec.ts`.
