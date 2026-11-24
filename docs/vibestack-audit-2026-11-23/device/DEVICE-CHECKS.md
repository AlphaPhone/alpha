# On-device equivalence checklist: Vibestack image against legacy v630

For after `steps/07-postflash-checks.sh` passes. Written 2026-11-23 from reading; none of it has been run against
a Vibestack build. This is device evidence for the listed turns and screens. It is not an APK build, an emulator
result or owner acceptance.

## Ground rules

1. **Never approve.** No Approve, Call, Send or Allow on any card, sheet or Android dialog. Call and SMS cards are
   read and **declined**. Before even declining, read the card's number or recipient and check it is the one the
   request named (on 2026-11-18 "call 415-555-0100" once produced a card for another number and a blind approve
   dialed it). If the card names a different target: stop, keep the evidence, report.
2. **No voice, no real calls.** Do not open Talk, do not play audio near the phone, do not place or answer a call.
   Those checks are marked **OWNER** and are written as numbered steps for him.
3. **No credentials.** If the sign-in page appears, stop. Do not type an email, code or password. The owner signs in.
4. **Writes need this run's yes.** Checks marked **ASK** create or change something of the owner's (a calendar
   event, a note, a reminder). Run them only after the owner agrees for this run, and clean up what they created.
5. One CDP client per page. Agree with any other session before attaching.
6. Use the test number `415-555-0100` only.
7. Check the network first: `adb shell dumpsys connectivity | grep "VPN CONNECTED"` must print nothing (a dead
   gnirehtet reverse tether black-holes all traffic and makes sign-in look broken).

Who runs a check: **AGENT** (read-only or navigation only), **ASK** (agent, after the owner's yes for this run),
**OWNER** (he does it himself).

## How to drive

- **adb, read-only:** `adb -s "$ALPHA_SERIAL" exec-out screencap -p > NN.png`, `shell dumpsys …`,
  `shell input keyevent KEYCODE_HOME` / `KEYCODE_BACK` (navigation only). Avoid `input tap` by coordinates.
- **WebView over Chrome DevTools:** the image is userdebug, so the release launcher's WebView exposes its devtools
  socket (this is how v612-v630 were driven). The legacy driver is `~/.cache/alpha-v612/driver/`:
  - `./fwd.sh` forwards `tcp:9333` to `localabstract:webview_devtools_remote_<pid>` and checks the Alpha page
    (`https://localhost/`) is there. It never restarts the adb server.
  - `node cdp.mjs alpha`, `node cdp.mjs eval '<expr>'`, `node cdp.mjs screenshot out.png`.
  - `node say.mjs "message"` sends one chat message and prints the reply and any review card;
    `node say.mjs --inspect` and `node selftest.mjs` are read-only. **Never pass `--approve`.**
- **The driver was written for the legacy DOM.** `say.mjs` relies on `data-alpha-agent-row`,
  `[data-alpha-turn-status]`, `.alpha-action-review`, `[data-alpha-chat-proposal]`, `button[data-alpha-proposal-act]`
  and `html[data-active-view]`. None of these attribute names appears under `apps/app/src/web/{assistant,shell,telephony}`
  at 7c2338706 (present there: `data-alpha-composer`, `data-alpha-layer`, `data-alpha-message-id`,
  `data-alpha-transcript`, `data-alpha-toast`). So on Vibestack run `./fwd.sh`, `node selftest.mjs` and
  `node say.mjs --inspect` first; expect them to need porting. Until then drive by exact visible text:

  ```js
  // what is on screen
  JSON.stringify({url: location.href, text: document.body.innerText.slice(0, 2000)})
  // every button label
  [...document.querySelectorAll('button,[role=button]')].map(b => (b.getAttribute('aria-label') || b.innerText).trim()).filter(Boolean)
  // click the one button with exactly this label inside the element that contains the checked target text
  (() => { const card = [...document.querySelectorAll('[data-alpha-message-id], article, section, li')]
             .filter(e => e.innerText.includes('4155550100')).pop();
           if (!card) return 'no card with that number';
           const b = [...card.querySelectorAll('button')].filter(x => x.innerText.trim() === 'Decline');
           if (b.length !== 1) return 'Decline buttons in card: ' + b.length;
           b[0].click(); return 'declined'; })()
  ```

  These snippets are untested against the Vibestack page; check what they return before trusting a click.
- **Evidence:** for each check save a device screenshot and the page text under
  `work/v$N/device-checks/<phase>/<id>.{png,txt}`.

## Order

1. **Before the flash, on legacy v630:** `PHASE=pre ./07-postflash-checks.sh`, then every AGENT check below, to
   fill the "legacy showed" cells marked *capture before flashing*. The legacy driver works as is on v630.
2. Flash (steps 1-6), `./07-postflash-checks.sh`, owner unlocks the phone.
3. The same checks on the Vibestack build, then the OWNER list.

## Known before testing (alpha 7c2338706; re-check against the handed-over commit)

These rows of `docs/vibestack-audit-2026-11-23/REGISTER.md` predict failures. A failure they explain is still a
failure of equivalence; record it against the row.

| Row | What it predicts on the phone |
|---|---|
| A-001 | The agent starts on an empty state directory: legacy conversations, memory, schedules and workflows are not there after the update (data stays on disk under `files/.eliza`, unread) |
| A-015, E-004 | A completed sign-in is not adopted by the Cloud request path; native sign-in still calls routes the Vibestack Cloud does not serve. Sign-in state may not survive, and a fresh sign-in may not work |
| E-011, A-014 | Device headers do not cross the agent socket at the pin, so call/SMS **proposal cards may never appear** from a chat request |
| A-017 | An approved text is refused natively (`not-approved`). Not exercised here: nothing is approved |
| A-012, A-013 | Legacy page storage (theme, saved Maps places, conversation selection, voice and calendar choices, Gmail account choice) and several encrypted draft slots are not adopted |
| A-009 | Agent-side Calendar and Gmail writes are refused whatever Settings shows (`host.json` launches with both switches off) |
| alpha-android gap 6 | Reminder and workflow notifications are not posted after a reboot until Alpha is opened |
| alpha-android gap 7 | The resident agent and its foreground notification start at every boot regardless of the owner's runtime mode |
| A-034 | New abstract socket `<package>.workflow.v1` under the privileged-app SELinux domain: look for `avc: denied` |
| open-items | "Home flashes before the required sign-in page"; no screen draws the bar's proposal card with Approve; digest schedule screens not ported |

## Checks

"Legacy showed" cites the evidence. *Capture before flashing* means nothing I read records it.

### A. Sign-in state kept

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| A1 | AGENT | After unlock, screenshot; CDP page text | *Capture before flashing* (the 12:12 baseline screenshot shows Maps with the dock, so the app was past sign-in; the account itself is not recorded) | No sign-in page. Same first screen as before the flash |
| A2 | AGENT | Open Settings from Home, read the Account row by text. Do not record the address in any report, only "same / different" | *Capture before flashing* | Same account, same plan line |
| A3 | AGENT | `node cdp.mjs eval 'Capacitor.Plugins.AlphaCloudSignIn.status()'` (read-only; plugin name from the 2026-11-11 note, still registered per the register) | 2026-11-11 after the VPN fix: `inApp/email/phone/google: true` | Methods known, signed-in state reported, no 40 s probe |
| A4 | AGENT | `adb shell pm get-app-links ai.alphacompute.alphaphone` | `verified` after re-verification on 2026-11-11 | Still `verified` (an image update can re-run verification; `legacy_failure` usually means it ran offline) |
| A5 | OWNER | Only if A1 fails: see OWNER 5 | — | — |

### B. Home and library

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| B1 | AGENT | `adb shell input keyevent KEYCODE_HOME`, screenshot, page text | *Capture before flashing*. Dock in the baseline screenshot: Alpha orb, keyboard, microphone | Alpha's Home (Alpha holds HOME); date, tiles and dock present; no blank frame, no sign-in flash |
| B2 | AGENT | List tile labels by text | *Capture before flashing* | Same tiles, plus Clock (new on Vibestack, register A-355). A missing legacy tile is a fail |
| B3 | AGENT | Open the app library by its control's exact label; list app names | *Capture before flashing* | Same installed apps listed; opening and closing returns to Home |
| B4 | AGENT | Press Home from inside Maps, then Back from Home | *Capture before flashing* | Home returns to Alpha's Home; Back on Home leaves Home in place |

### C. Chat turn with a real model

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| C1 | AGENT | Type "what is 17 times 23?" in the composer (`data-alpha-composer`), tap the composer's own Send | Typical Cloud text turn 1.8-2.1 s with a 4-8 s tail (2026-11-06); v620 once showed "Reply failed" | One user row, one reply containing 391 within 60 s; no "Reply failed", no rate-limit toast |
| C2 | AGENT | "what's on my calendar today" (read only) | *Capture before flashing* | A reply that reads the calendar or says it is empty; not an error |
| C3 | AGENT | Scroll the conversation up | *Capture before flashing*: earlier turns are listed | Record whether pre-flash turns are still shown (A-001 predicts they are not). Not shown = fail of "state kept", recorded against A-001 |
| C4 | AGENT | Force nothing; after C1 read `adb logcat -d` for the app pid, crash buffer | *Capture before flashing* | No FATAL EXCEPTION for the app; no new `avc: denied` |

### D. Call and SMS proposal cards: read, then DECLINED

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| D1 | AGENT | Send "call 415-555-0100". Read the card. Check the number. Tap **Decline** on that card only | v625 run #43: "Review this request on your phone before it can run." / "Number: 4155550100" / proposal card, "Needs approval", button `Call`. Declining was never exercised by the legacy runs: *capture before flashing* | Card names 4155550100; has a Decline; after Decline the card reads Declined; `adb shell dumpsys telecom` shows no call; the Phone app shows no new outgoing entry. No card at all = fail (see E-011) |
| D2 | AGENT | Send "text 415-555-0100 saying v$N test". Read the card. Check the recipient and body. Tap **Decline** | v625 run #44: same review line, "To: 4155550100", proposal card | Card names 4155550100 and the body; Decline works; card reads Declined; the Messages thread for that number shows no new outgoing message |
| D3 | AGENT | Send "open the phone dialer" | v625: "The keypad is open. Nothing was dialed." | Keypad opens, nothing dialed |
| D4 | AGENT | Send "open messages" and "open contacts" | Both prompts were in the v625 list; their replies were not read here: *capture before flashing* | Views open and list threads / contacts (image telephony on: needs release build + overlay + feature) |
| D5 | OWNER | Real approvals and calls: OWNER 2-4 | — | — |

### E. Calendar

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| E1 | AGENT | "open calendar" | v625: "Opening Calendar." | Calendar opens, today's events shown; same connected/not-connected state as before |
| E2 | ASK | "add an event called v$N check tomorrow at 3pm" | v625: "Done, v625 check is on Tuesday, Nov 24 at 3:00 PM EST." (the phone is on Eastern time) | Event exists at 3 PM tomorrow in the same calendar |
| E3 | ASK | "move v$N check to 4pm"; "rename the calendar event v$N check to v$N verified"; "delete the calendar event v$N verified" | v625 list ran all three; v620 once answered "Partly done · Check first" | Each done; the event is gone at the end (no "couldn't look up" after an applied delete) |

### F. Notes

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| F1 | AGENT | "open notes"; count and list titles | *Capture before flashing* | Notes written before the flash are still reachable (Vibestack shows legacy notes through a read-only "Previous Notes" route, per the register). A missing note is a fail |
| F2 | ASK | "create a note called v$N check saying first line"; "add the line second line to v$N check"; "rename the note v$N check to v$N notes"; "delete the note v$N notes" | v625: "Done, v625 check is saved with first line as the body." … "Done, v625 notes is deleted." | Same outcomes; nothing left behind |

### G. Files

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| G1 | AGENT | "open files"; read the top-level listing | *Capture before flashing* | Same listing; no Android permission dialog (all-files access is an image policy) |
| G2 | AGENT | Open one existing file's preview, close it | *Capture before flashing* | Preview renders |

### H. Inbox read

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| H1 | AGENT | "open my email inbox"; read the thread list (subjects only in evidence; do not copy bodies into reports) | *Capture before flashing* | Same Google account state; threads load |
| H2 | AGENT | Open one thread, read, go back. No reply, no archive | *Capture before flashing* | Body renders; nothing changed in the mailbox |

### I. Maps

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| I1 | AGENT | "open maps"; screenshot | v630 run #06: "Opening Maps."; `baseline/screen-1212.png`: Google Maps raster tiles, Search field, a pin, locate button, "Google Maps" badge | Tiles render (not blank), Search present |
| I2 | AGENT | "show me Coit Tower on the map" | v630 run #07: "No maps provider adapter is available." (a legacy defect) | Record the reply. A place shown is better than legacy, not a regression; the same error is equal |
| I3 | AGENT | "directions to it" | v630 #08: asks for a starting point because the phone's location is not available | Same, or a route |
| I4 | AGENT | Saved places list | *Capture before flashing* | Saved places kept (A-012 predicts not) |

### J. Browser

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| J1 | AGENT | "open the browser" | v630 #01: "Opening Browser." | Browser view |
| J2 | AGENT | "open example.com" | v630 #02: "Opening example.com." | Page loads |
| J3 | AGENT | "open wikipedia.org in a new tab"; "show my open tabs" | v630 #03-05: "Opening wikipedia.org.", "Showing your open tabs in Browser." | Two tabs listed |
| J4 | AGENT | "go back", "reload the page" | v620: "I asked the browser to reload the page. It may still be loading." | Navigation works |

### K. Camera open

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| K1 | AGENT | "open camera"; screenshot; leave with Home. Do not press the shutter or record | The prompt was in the v625 list; *capture the screenshot before flashing* | Live viewfinder (not black), no permission dialog; leaving releases the camera (`adb shell dumpsys media.camera` shows no client) |

### L. Clock and reminder

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| L1 | AGENT | Open the Clock tile (Vibestack); on legacy, "open workflows" | Legacy kept alarms in Workflows / the AOSP Clock; Clock tile is new | Opens; timers, stopwatch, world clocks present |
| L2 | ASK | "remind me in 3 minutes to check v$N"; wait; read the Alpha reminder in the notification shade | *Capture before flashing* | A reminder notification from Alpha at the time, once |
| L3 | ASK | "create a workflow called Alpha device test that sends me a reminder every morning at 9", then delete it | v625: "Created “Alpha device test”. It is off until you turn it on. It can’t send you a notification …" | Same outcome; deleted at the end |
| L4 | AGENT | Reminders created before the flash | *Capture before flashing* | Still listed (legacy `reminder-creations` slots are not adopted: predicted fail) |

### M. Settings facts

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| M1 | AGENT | Settings → General / About: version line | 0.1.0, versionCode 630 | 0.1.0, versionCode `$N` |
| M2 | AGENT | Settings → Phone: IMEI and SIM rows are filled. Do not copy the values; record "same / different / empty" | *Capture before flashing* (needs `READ_PRIVILEGED_PHONE_STATE`, granted in the baseline) | Filled and the same |
| M3 | AGENT | Settings → Privacy and Agent connection: status lines | *Capture before flashing* | Agent connected / listening; listener row consistent with the image (no Sense listener staged) |
| M4 | AGENT | Appearance (light/dark) | *Capture before flashing* | Same theme (open-items lists the theme among legacy keys that are not adopted: predicted fail, A-012) |

### N. Updates

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| N1 | AGENT | Settings → General: read the update controls by text | *Capture before flashing*. On 2026-11-16 the public channel had no release | Same controls present |
| N2 | AGENT | Tap "Check for updates" (a network read) | No update offered | Completes without error and offers nothing. If it offers an update: **do not install** (a /data update over the system app outranks the image and can drop the roles); report |
| N3 | AGENT | After N2: `adb shell dumpsys package ai.alphacompute.alphaphone \| grep -E "codePath\|versionCode"` | `/product/priv-app/AlphaPhone`, 630 | Still `/product/priv-app/AlphaPhone`, `$N` |
| N4 | OWNER | "Allow automatic updates" opens Android's install-source page: OWNER 6 | — | — |

### P. After a reboot (agent, read-only apart from the reboot the owner agrees to)

| ID | Who | Drive | Legacy showed | Pass |
|---|---|---|---|---|
| P1 | ASK | `adb reboot`; owner unlocks; rerun `./07-postflash-checks.sh` | Roles kept across two no-wipe reflashes (v99, v100, 2026-11-16) | Same result as the first run; roles still Alpha's |
| P2 | AGENT | `adb shell dumpsys activity services ai.alphacompute.alphaphone` before opening Alpha | *Capture before flashing* (legacy starts the agent only when the owner chose on-device or hybrid) | Record whether the agent service and its notification are up (gap 7 predicts always) |

## OWNER checks (numbered steps for Shaw)

Nothing below is run by an agent. Each is one run; an earlier yes does not carry over.

1. **Spoken conversation.** On Home tap the microphone in the dock. Say "what time is it". Expected as on
   legacy: your words appear as a chat turn, Alpha answers aloud within a few seconds, and speaking over the answer
   stops it. Then say "stop listening" or tap the keyboard icon. Note anything it transcribed that you did not say.
2. **Outgoing call.** Type "call <a number you choose>". Read the card: the number must be yours. Tap Call /
   Approve. Expected: Alpha's in-call screen, audio both ways, End hangs up, the call appears in the call log.
3. **Incoming call.** Call the Pixel from another phone. Expected: Alpha's incoming-call screen (Alpha holds
   DIALER), answer and decline both work, a missed call shows afterwards.
4. **Approved text and incoming text.** Type "text <your other number> saying Vibestack check". Read the card,
   tap Approve. Expected: delivered once, shown in the thread. Reply from the other phone: the reply arrives in
   Alpha's Messages (Alpha holds SMS) with a notification. On alpha 7c2338706 the approved card send is expected
   to be refused (`not-approved`, register A-017); typing in the Messages composer and tapping Send should work.
5. **Sign-in, only if the sign-in page appeared after the flash.** Sign in the way you normally do. Tell the lane
   that it appeared: "sign-in state kept" then failed, even if signing in again works.
6. **Automatic updates.** Settings → General. If "Allow automatic updates" is shown, tap it, choose "Allow from
   this source" on Android's page, go back. Expected: the row updates without restarting Alpha.
7. **Camera capture and photo.** Open Camera, take one photo, open Photos, see it, delete it.
8. **Your own judgement.** Use the phone for a few minutes the way you do. Anything that looks, sounds or behaves
   differently from this morning's build is a finding, whether or not a row above covers it.
