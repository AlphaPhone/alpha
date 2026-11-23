# specs/quint/legacy/photos-library/README.md
- Lines: 45 | Kind: documentation for a historical Quint comparison harness | Verdict: DELETE (with `legacy/photos-library/` and `PhotosLibrary.qnt`, C17/D11)
- Covers: prose for `check-photos-library-refinement.mjs` (batch favourite, selection patch, Trash/Recover/Delete forever, viewer swipe, Favorites filter, share review and stale-review refusal, Replace original vs Save copy). Duplicates: harness `assumptions` (`check-photos-library-refinement.mjs:456-461`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-45 | P6 | Documents a replay against a historical design model; nothing live depends on it. | Delete. | None |
| 2 | 13-19 | — | Lists the one behaviour with no other end-to-end coverage: a peer revision change while the share review is open makes Share refuse ("Item changed") without a second chooser call. | Carry into `journeys/camera-photos.spec.ts` (chunk summary). | Low |

## Proposed end state
File removed with `specs/quint/legacy/photos-library/`.
