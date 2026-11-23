# test/browser/shell-toast.spec.ts
- Lines: 106 | Kind: Playwright spec (`chromium`); it raises toasts by walking React fiber internals to the shell's `toast()` method (T6 backdoor) and waits with fixed sleeps; 8 tests | Verdict: **MERGE** into `journeys/home-shell.spec.ts` ("notices" section), on the Playwright fake clock
- Covers: the shell toast lifetime. A long message stays for its reading time and a short one for 1.9 s. A toast with Undo stays at least 5 s. Passive notices queue behind a pending Undo, consecutive deletions keep both Undo callbacks in order, keyboard focus on Undo holds the toast and focus returns afterwards, and tap, Enter or Space dismisses a plain toast and restores focus. Duplicates: host test `test/accessibility-timeout.test.mjs` (Android time-to-act scale, named in the header). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T6 | `raise()` finds `__reactFiber$` on `[data-screen]` and climbs to a `stateNode.toast`. This depends on React internals and on the class-component shape of `model.js`, so it breaks with the D1 split. | Raise toasts through real actions: delete a note or event (Undo toast), save something (short toast). If a long message has no natural trigger, expose a dev-only `?tools=1` hook under the `dev/` boundary. | Medium: it needs product actions that emit each toast kind. |
| 2 | 26, 30, 37, 71, 81 | T8 | Fixed sleeps of 9.5 s, 1.5 s, 4.7 s, 6.5 s and 5.5 s, about 28 s of wall time per run, plus 60 s timeouts. | `page.clock.install()` and `clock.runFor(ms)` to cross each threshold exactly. | Low |
| 3 | 94-106 | – | The Enter and Space dismissal loop is fine. | Keep as one parametrised step. | none |

## Proposed end state
A "notices" section in the Home/shell journey on the fake clock. Each case triggers a toast through a real action and
advances the clock to each threshold: reading time, the Undo minimum, focus hold, queueing, two Undos in order, and the
three ways to dismiss. There is no fiber walk and no sleep.
