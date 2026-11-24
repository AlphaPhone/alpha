# test/browser/aosp-telephony-views.spec.ts
- Lines: 221 | Kind: Playwright spec, chromium, 13 tests; real UI journeys on `telephony-fixture.ts`, one in-page import | Verdict: KEEP as the base of `journeys/telephony.spec.ts` (rename/move), with one REWRITE
- Covers: Phone (recents, keypad, voicemail, no-voicemail carrier), Messages (Home card, single bottom bar, Alpha drafts, suggested replies consent, send target, permissions, recipient picks), Contacts (search, edit with version, delete confirm), Settings phone info. Duplicates: partial overlap with `aosp-contacts`/`aosp-phone` (merge those in here). Callers/importers: none; imports `telephony-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 86-106 | T6 | "a draft Alpha was asked for" calls `placeAskedSmsDraft` via `import('/src/prototype/sms-adapter.ts')` five times. | Drive it as the agent would: the resident stub returns an SMS draft action for a composer request; assert the field. If the agent path is not stubbable yet, keep this one import as the documented exception. | Medium. |
| 2 | 6, 189 | P12 | `window.telephonyInputs` untyped bag. | Read through the harness recorder (`__alphaTest.calls`). | None. |
| 3 | 10-14 | C3 | Local `overlaps()` box helper; similar geometry helpers in a11y specs. | Move to `harness/a11y.ts`. | None. |
| 4 | 3-5 | A8 | Evidence-boundary comment restated per file. | Keep one line. | None. |

## Proposed end state
Becomes `journeys/telephony.spec.ts` (only if the AOSP renderer paths stay in this repo; owner question from research §10.7). Absorbs the four contacts steps and the two phone steps from the sibling specs, uses `telephony-fixture.ts` with an added `{image:false}` shape. About 15 tests, no `/src` imports except possibly the SMS-draft case.
