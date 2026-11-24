# apps/app/src/browser/clock.ts
- Lines: 87 | Role: browser alarm owner: one-second poll of alarm reminders, cross-tab ring ownership via Web Locks, notification chime, and the Alarms dialog. | Verdict: SIMPLIFY
- Importers: 1 (`register.ts:5,35`). Text/path pins: `specs/quint/application/manifest.json:97,2531,6403-6444` (symbols `BrowserClock`, `owns`, `ringing`, `soundTimer`, `'alpha.browser.alarm-owner'`, `ifAvailable`, `stopSound`, `retire`, `allowed`, `poll`), `specs/quint/ui-return-review-20261109.md`, `test/browser/journey-c-alarms.spec.ts`, `test/calendar-view-rules.test.mjs`, `test/locale-time-usage.test.mjs`, `test/fixtures/browser-daily-stores.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35 | A1 | `window.addEventListener('storage',event=>{if(event.key==='alpha.browser.reminders.v1')…})` — `storage` fires only for `localStorage` writes; that key is now an IndexedDB document key (`reminder-store.ts:5`) and nothing writes it to `localStorage`. Cross-tab refresh already comes from `alpha:reminders-document-changed` (line 30). | Delete the listener. | Low |
| 2 | 49 | B2 | `else if(navigator.locks){…}` — Web Locks exist in every supported browser and WebView; without them alarms silently never ring. | Call `navigator.locks.request` unconditionally. | Low |
| 3 | 39 | C3 / D5 | `allowed()` = hidden ∨ `devBackground==='true'` ∨ (`testMocksEnabled` ∧ mock mode) ∨ locked — the foreground predicate duplicated in `notice-action.ts`, `notifications.ts:21`, `hosted-results.ts:17`, plus a test-mocks clause. | `foregroundBlocked()` shared helper; dev clause owned by the dev module. Keep the method name `allowed` (manifest). | Low |
| 4 | 41, 47 | C3 | Release sequence `this.stopSound();this.owns=false;this.ringing='';this.release?.();this.release=undefined;` duplicated (retire also closes the dialog). | `private releaseRing()` used by both. | None |
| 5 | 64, 83-84 | C4 / B4 | Theme-token copy loop for body-mounted dialogs, yet line 83 mounts inside `.os` whenever the shell exists; the `else{document.body.append(dialog);dialog.showModal();}` fallback and `if(!shell)previous?.focus()` exist only for a missing shell. | Require `.os`, delete the token copy and body fallback. | Low |
| 6 | 56 | B1 | `catch(error){…'Couldn’t refresh'}` — unused binding; mapping to status copy is specified. | `catch{`. | None |
| 7 | 60-81 | D12 / D8 | Imperative DOM with ~12 inline `style.cssText` strings; 700-char `render`. | CSS classes; split `render`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Alarm` | type | 9 | `Reminder`/`DeletableReminder` rows (`reminder-deletions.ts`, `daily.ts`) | `Pick<DeletableReminder,…>` |
| `ringingAlarms` | helper | 10 | none | keep |
| `button()` | helper | 61 | dialog button builders (`calendar-meeting.ts:7`, `domain-recovery.ts`) | dialog kit |

## Proposed end state
~75 lines; no dead storage listener; unconditional lock; shared foreground predicate; dialog always inside `.os`. Manifest-pinned member names unchanged.

## Verification
Quint alarm-owner model (`specs/quint/application`), `test/browser/journey-c-alarms.spec.ts`, `test/browser/dev-clock.spec.ts`.
