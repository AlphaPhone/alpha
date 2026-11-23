# apps/app/src/prototype/subview-accessibility.ts
- Lines: 213 | Role: Wraps seven views' `render` to add subview focus refs, scrim-popup inline-modal refs and "covered" flags; exports `keepFocusOnScreen`; and (unrelated) installs the assistant-reply live-region announcer. | Verdict: SPLIT
- Importers: `apps/app/src/main.tsx:16` (`installSubviewAccessibility` L176, `installReplyAnnouncer` L179, `keepFocusOnScreen` L271). Text/path pins: `test/accessibility-coverage.test.mjs:187` (`/pageCovered:!!out\.editing/`) and `:298-300` (regex per POPUPS entry `${view}:\[[^\n]*\['${key}'`); `test/final-ui-lifecycle.test.mjs` slices from `type ReplyShell =` and strips types (T2); `specs/quint/application/manifest.json:94,1453,3307,10046`; `specs/quint/refinement/{application/canonical-calendar-editor-close,legacy/calendar-navigation}.mjs`; `test/browser/{accessibility-lifecycle,notes-photos-list-focus}.spec.ts`; `test/support/feature-parity.mjs:425`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 146-213 | D11 / D1 | `installReplyAnnouncer` (assistant reply live region, 68 lines) has nothing to do with subview focus; it lives here by accident. | MOVE to `prototype/reply-announcer.ts`; update `main.tsx:16` import and `test/final-ui-lifecycle.test.mjs` path/marker. | Low |
| 2 | 27-46 | D9 / D10 | One loop over `['inbox','workflows']` with `if(name==='inbox'){…}` inside: inbox creates and returns `runFocus`/`builderFocus` (workflow concepts) and workflows creates `attachmentModal`/`providerModal`/`discardModal` it never uses. | Two explicit blocks (inbox, workflows), each creating only what it returns. Keep every key the template binds (check `template.html` for `inbox.runFocus` etc. before dropping). | Low |
| 3 | 13-20, 47-53 | D2 | Accessibility is attached by sniffing render-output keys per view (`out.menu`, `out.shareSheet`, `out.b?.sheetOn`, `out.ed?.menuShown||out.vo?.menuShown||out.lk?.menuShown`) and wrapping 7 views' `render` (research P2: last layer of the notes/calendar/workflows onions). | When each view gets one owner (research P2), the owner declares its popups and covered flags; this table becomes data that owner passes to `popupFocus`. | Medium (order: must stay outermost of the render chain) |
| 4 | 14-19 | B2 | `out.closeMenu?.()`, `out.closeSheet?.()`, `out.sheet?.close?.()` — some are genuinely optional per view state, but each popup is open only when its own close exists. | Leave until #3; then type the view outputs. | — |
| 5 | 6, 157, 164, 194 | C1 | `type Bag=Record<string,any>` and `type ReplyShell = Record<string, any>` (same thing, two names in one file). | Shared `ShellHost`/`ViewValues` types. | None |
| 6 | 186, 196-197, 210 | D3 | Announcer state kept as ad-hoc shell fields `replyAnnouncerLive`, `replyAnnouncerIdentity`, `replyAnnounced`, `replyAnnouncedId` plus module globals `region/frame/regionOwner`. | Keep in a `WeakMap<Shell,AnnouncerState>` inside the new module. | Low |
| 7 | 195 | C3 | `JSON.stringify([this.connectionSession??'',this.restoredHistory?.conversationId??''])` session-identity tuple (repeated repo-wide). | `sessionKey()` helper in `runtime/`. | None |
| 8 | 177, 197 | B2 | `owner.voiceConversationActive?.()` — installed by voice-adapter on every production shell. | Call directly (or make it a required `ShellHost` member). | Low |
| 9 | 183-192 | B2 / D7 | `originalMount?.apply`, `originalUnmount?.apply`, `originalUpdate?.apply` — base methods always exist (`model.js:5196,5273,5300`). | Call directly. | Low |
| 10 | 89, 129 | C6 | Focusable selector `'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]'` duplicated in one file. | One `FOCUSABLE` const. | None |
| 11 | 69-75 | — | Bare `{}` block for Settings popups; fine but reads like leftover. | Fold into the POPUPS loop (settings has no subviews: `keys=[]`). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` / `ReplyShell` | type | 6, 157 | ~50 files | `prototype/shell-types.ts` |
| `Popup`, `POPUPS`, `popupFocus` | type/const/helper | 7-24 | — | view owners (later) |
| `subviewFocus`, `reviewFocus`, `focusHistory`, `FocusTarget` | helper/type | 80-144 | `runtime/inline-modal.ts`, `prototype/keyed-list-focus.ts` (related focus helpers) | `prototype/focus/` alongside `keyed-list-focus.ts` |
| `keepFocusOnScreen` | helper | 123-130 | — | stays |
| `REPLYING`, `LIMIT`, `say`, `bounded`, `agentTail` | const/helper | 158-180 | visually-hidden CSS string L171 vs any `.sr-only` class in `phone.css` | `prototype/reply-announcer.ts` |

## Proposed end state
`subview-accessibility.ts` (~140 lines): `installSubviewAccessibility` with explicit inbox/workflows blocks and one table-driven loop for the other views (Settings folded in), plus the focus helpers and `keepFocusOnScreen`. `reply-announcer.ts` (~70 lines) holds the live region with per-shell state in a WeakMap. No lines of behaviour removed; ~10 lines of duplication removed.

## Verification
`test/accessibility-coverage.test.mjs` (regex pins — update or retire per T1), `test/final-ui-lifecycle.test.mjs` (slice marker moves with the file), Playwright `accessibility-lifecycle.spec.ts`, `notes-photos-list-focus.spec.ts`, Quint `canonical-calendar-editor-close` and `calendar-navigation` replays; `npm run test:browser` + production variant; TalkBack check on device is separate acceptance.
