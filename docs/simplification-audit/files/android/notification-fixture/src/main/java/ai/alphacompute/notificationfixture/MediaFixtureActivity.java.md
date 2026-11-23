# android/notification-fixture/src/main/java/ai/alphacompute/notificationfixture/MediaFixtureActivity.java
- Lines: 76 (8.8 KB) | Role: separate-UID "foreign media" seeder: writes synthetic JPEG/MP4 rows into MediaStore under a disposable secondary user and keeps a JSON ledger, for the Photos foreign-library permission campaign | Verdict: DELETE (owner decision) — otherwise SIMPLIFY
- Importers: declared in `notification-fixture/src/main/AndroidManifest.xml:4`; no code or script launches it (grep `MediaFixture`: only the manifest and itself; grep `photosForeign` in scripts/.github: 0). Its counterpart `android/app/src/androidTest/.../PhotosForeignLibraryInstrumentedTest.java` checks the ack string `"owned-disposable-alpha-media"` and name prefix `"alpha-foreign-"+run+"-"`, and is listed in `scripts/android-instrumentation.ts:255` as a manual campaign needing "a separate-UID synthetic ledger" — the args (`photosForeignRun`, `photosForeignIds`, …) are supplied by no script. Reads asset `src/main/assets/synthetic-blue.mp4` (documented by `synthetic-media-provenance.json`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-76 | A7 | A campaign driver with no in-repo runner: the seed → ids → instrumented test hand-off is manual `adb am start` work that no script, workflow or doc in the repo performs. | Owner: if the foreign-Photos campaign is not run, delete this file, manifest line 4, `src/main/assets/synthetic-blue.mp4`, `synthetic-media-provenance.json`, `PhotosForeignLibraryInstrumentedTest.java` and the `PhotosForeignLibrary` row in `scripts/android-instrumentation.ts:255`. | Low; loses only a manual campaign. |
| 2 | 23-74 | D8 / D9 | Dense one-line methods (`read`, `save`, `owned`, 400-char seed loop line 57-58), 60-line lambda in `handle`. | If kept: formatter, split into `seed`, `cleanup`, `mutate(index, rename|delete)`. | None |
| 3 | 40 | B4 | `byte[] value=readBounded(in,16384);if(value.length>16384)throw …` — `readBounded` already throws above the limit. | Delete the second check. | None |
| 4 | 31-32 | C3 | `readBounded(InputStream,int)` and `sha(byte[])` hex: twins of `VideoCopyPreservationInstrumentedTest.hash/readAll` (`:33,46`), and the 10 Java SHA-256→hex / 7 bounded-read copies in app main (research §4). | Separate APK: keep local if kept; disappears with the delete. | — |
| 5 | 71-72 | B1 | `catch(JSONException ignored){}` and `try{…save(receipt)…}catch(Exception ignored){}` — a failed receipt write leaves the `complete:false` receipt and the runner cannot tell why. | If kept, let the save failure surface in the UI text like the result. | Low |
| 6 | 52 | B1 | `if(receipt.exists())return;` silently ignores a repeated request id. | If kept, update the view text ("duplicate request") so the runner sees it. | Low |
| 7 | 47 | B3 | Re-checks user id against an intent extra that the same runner computed. | Acceptable safety fence for a destructive MediaStore writer; keep if kept. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `WORK` single-thread executor | const | 23 | 25 thread pools in app (research C3) | Local (separate APK) |
| `uuid(String)` | helper | 27 | `FixtureActivity.java:17`, `PrivateSocketProbeService.java:58` | Local / deleted |
| `readBounded` | helper | 31 | `VideoCopyPreservationInstrumentedTest.readAll` (`:46`), app `BoundedIo` candidates | Local / deleted |
| `sha` | helper | 32 | `VideoCopyPreservationInstrumentedTest.hash` (`:33`), 10× in app main | Local / deleted |
| `save` (AtomicFile JSON) | helper | 30 | — | Local / deleted |

## Proposed end state
Deleted with its manifest entry, asset, provenance note and the campaign test (0 lines). If the owner keeps the campaign: ~70 formatted lines, add a runner script under `scripts/` that seeds, reads the ledger and passes the `photosForeign*` args, so the campaign is reproducible.

## Verification
None automated today. After deletion: `node scripts/build-notification-fixture.ts` (lint), `node --test test/android-instrumentation-runner.test.mjs` (campaign reachability list), `npm run verify`.
