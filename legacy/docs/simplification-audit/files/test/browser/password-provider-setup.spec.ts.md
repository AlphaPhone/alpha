# test/browser/password-provider-setup.spec.ts
- Lines: 132 | Kind: Playwright, chromium; rendered Passwords page over a hand-written `AlphaDevice` password-provider fake | Verdict: MERGE into `journeys/settings.spec.ts` (Passwords: provider rows), 10 tests → 3
- Covers: Proton Pass row shows Android's reported installation/selection; setup and install handoffs never claim success, return to Alpha (appResumed) re-reads; unrecognized publisher, disabled, unknown and unavailable states never offer Open or a fabricated ready state; Browser menu → Password manager opens the page with a working Settings back path; a plain browser offers no provider. Duplicates: `password-manager.spec.ts:106-113` (no-provider browser), `dev-password-provider.spec.ts`, Quint `password-provider-dialog` (host `test/quint-password-provider-dialog.test.mjs`). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-40 | T7, C4 | Inline Capacitor fake (8 plugin headers) duplicated by `password-manager.spec.ts:115-161`. | Shared typed bridge handler. | Medium. |
| 2 | 70-77, 93-106, 119-132 | T7 | Six tiny tests each map one (installation, selection, support, handoff result) tuple to a row label. | One table-driven test over the tuples: {installed/none→None, unrecognized/other→Other, unrecognized/proton→Unverified, disabled/proton→Disabled, unknown→—, support unavailable→Unavailable, unexpected handoff→Unavailable}; each asserts label and no Open. | Low. |
| 3 | 47-69, 85-92 | T4 | Three handoff-return tests (setup→none→proton, install→installed, setup→other). | One case: setup handoff then resume twice (none, then proton); one install case. | Low. |
| 4 | 78-83 | T4 | Duplicates `password-manager.spec.ts:106-113`. | Keep one. | None. |
| 5 | 5, 43-46 | B3 | `page:any` everywhere. | `Page` type. | None. |

## Proposed end state
Three cases: (1) handoffs: setup and install never claim success, resume re-reads, Open appears only for a verified selected provider; (2) table-driven status mapping; (3) Browser menu → Password manager and back to Settings. The fixture comes from the typed bridge harness.
