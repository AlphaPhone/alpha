# test/home-views-model.test.mjs
- Lines: 361 | Kind: transplant (cuts ~30 top-level functions and shell methods out of `apps/app/src/prototype/model.js` by text — `\nfunction name(`, `\nvar NAME =`, `\n  name(` — and runs them in `vm` with a queued fake view API) + unit calls into `home-cards.ts` | Verdict: DELETE
- Covers: dialer digits/call replacement, Maps one-point route, model download timers, Inbox Undo restore, per-view flag cleanup on leave, Contacts letter sections with accent folding, lock-screen camera containment, recording stopped on camera mode change, module latches released on unmount, Home agenda memoisation, storage probe throttling. Duplicates: `test/browser/aosp-contacts.spec.ts`, `dev-contacts.spec.ts` (Contacts), `camera-*` specs (camera modes), `native-insets.spec.ts:117` (Undo notice), `home-daily-overview.spec.ts` (agenda). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-31 | T2 / T10 | Text slicer for `model.js` (cross-file-actions U-R10 lists ~30 pinned names): the main blocker for the `model.js` split (D1). | Delete. | Low |
| 2 | 132-166, 234-256 | A3 (D2) | `walRestoreCard` and `secureAdmits(true,'wallet')` exercise Wallet, which is deleted. | Delete with Wallet. | Low |
| 3 | 53-105 | T3 | Dialer cases on `pnDigits`/`pnCallId` with fake `PN` globals. | Drop; dialer behaviour belongs to the telephony journey if the dialer stays. | Low |
| 4 | 197-233, 234-276 | — | Three user-visible rules worth a journey: Contacts list has one section per letter with accents folded and `#` last; a lock-screen camera session cannot open Maps/Notes by any route; switching camera mode while recording stops the recording first. | Carry to `journeys/camera-photos.spec.ts` (secure camera; mode switch while recording) and the Contacts journey (section headers with "Émile", "Zoë", "123"). | Medium: secure-camera containment has no browser case found |
| 5 | 120-131, 167-196, 277-361 | T3 | Timer/latch/memoisation internals (leave clears flags, unmount releases latches, probe throttle). | Drop. | Low |

## Proposed end state
File deleted. Three journey cases carried as above; the rest is implementation detail of `model.js` that its split
will replace.
