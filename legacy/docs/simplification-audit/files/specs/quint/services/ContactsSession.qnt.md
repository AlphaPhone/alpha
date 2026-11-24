# specs/quint/services/ContactsSession.qnt
- Lines: 108 | Kind: Quint model, live (6 tests, 7 invariants, 4 witnesses, 10 symbol pins) | Verdict: KEEP; drop the symbol pins
- Covers: the Contacts view's in-memory address-book read. It covers availability (image admission, view open, page visible), the epoch fence for superseded reads, the loading flag, paging, search, and the editor overlay. Properties: an inactive view holds no rows, rows need access, "more" needs rows, loading has current work, and a deferred view is not open. Sources: `apps/app/src/prototype/contacts-adapter.ts`, `runtime/image-contacts.ts`, `prototype/mvp-features.ts` (exist). Duplicates: none in Quint. A Playwright contacts journey may cover the user path. Callers: harness `refinement/services/contacts-session-replay.mjs` (87 lines, `sourceModule` through `identity-comms-traces.mjs`, no text slicing), via `forward-replays.mjs`; wrapper `test/quint-contacts-session.test.mjs`; aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest symbols | T10 | It pins `epoch`, `loading`, `readable`, `available`, `editor` and `clear` in `contacts-adapter.ts`, plus `installContactsAdapter`, `applyImageContacts`, `isMvpView` and `admitImageContacts`. The first six are common words that any rewrite keeps matching or trivially breaks. They prove nothing. `contacts-adapter.ts` is marked SIMPLIFY and `install*Adapter` is a D2 pattern slated for replacement. | Drop `symbols`. | low |
| 2 | 4 | — | The comment explains `active` as the adapter's copy. Good mapping. | — | none |
| 3 | 64-70 | — | `step` is guarded by `s.epoch < 6` on most actions, which bounds the state space. Fine. | — | none |

## Proposed end state
Model unchanged, without `symbols`. When the `install*Adapter` pattern is replaced (stage F), update `sources` and keep the harness on exported functions.
