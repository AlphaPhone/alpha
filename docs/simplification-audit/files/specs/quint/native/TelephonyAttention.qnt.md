# specs/quint/native/TelephonyAttention.qnt
- Lines: 67 | Kind: Quint model (live) | Verdict: KEEP
- Covers: Home Messages/Phone attention cards: shown only on an admitted image with loaded sources and unread items; one tap opens thread/list/Recents/Voicemail; reading elsewhere clears. Duplicates: `test/telephony-presenters.test.mjs` exercises the same presenter functions as unit cases (T3); `test/browser/aosp-telephony-views.spec.ts` drives the rendered views. Callers/importers: `quint:check`, `refinement/native/telephony.mjs:144-195` (`checkTelephonyAttention`, run from `refinement/native/index.mjs:171`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | – (good) | `telephony.mjs` bundles `apps/app/src/prototype/telephony-presenters.ts` with esbuild and calls its exports. This is the import style every other harness should be ported to. | Keep. | – |
| 2 | manifest `sources` | T10 | Manifest lists `telephony-attention.ts` and `home-overview-cards.ts` as sources, but the harness only imports `telephony-presenters.ts`. The extra pins only make `quint:changed` re-run on unrelated Home-card edits. | Trim `sources` to the module the harness imports (plus anything it transitively bundles, which `capture` already hashes). | Low |
| 3 | 61-67 | T4 | Seven scenarios; `test/telephony-presenters.test.mjs` asserts card visibility/target for the same presenter, a unit test duplicating this campaign for the card part. | In the host-test cleanup, drop the card cases from `telephony-presenters.test.mjs`; keep formatting cases only if a journey does not cover them. | Low |
| 4 | 12-14 | – | `messagesCard` / `phoneCard` as derived vals keep state minimal. Fine. | None. | – |

## Proposed end state
Model unchanged. Manifest `sources` reduced to `telephony-presenters.ts`. The model + esbuild replay stays the
single non-browser coverage of the card visibility/target rule; the Home-row rendering is left to a
`journeys/home-shell.spec.ts` (or `journeys/inbox.spec.ts`) case on the AOSP fixture.
