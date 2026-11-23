# specs/quint/refinement/native/sms-dispatch-platform.mjs
- Lines: 436 | Kind: refinement fixture; **slices upstream shared source** (T10) + large Android port set | Verdict: PORT (needs upstream seam, D14) + SIMPLIFY
- Covers: generated sources for `sms-dispatch.mjs`: excerpts of upstream `TelephonyPlugin`, `MmsStore`, `SmsProviderReader`, and closed ports for radio (`SmsManager`), SMS provider, receivers, dialogs, keyguard, user manager, subscriptions. Callers/importers: `sms-dispatch.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-58 | T10 | Text cuts of upstream `plugins/plugin-native-messages/.../TelephonyPlugin.java`: `' public static final Pattern NUMBER'` → `' /** Runs a request that launches'`; `' private android.app.AlertDialog review;'` → `' // ---- Reviewed native MMS'`; regex `^ @Override protected void handleOnDestroy\(\)[^\n]+`. `MmsStore.java`: `' public static boolean isDefaultSmsApp'` → `' /** Inserts one incoming SMS'`; `' public static long persistOutgoingSms'` → `' /**\n  * Marks one conversation'`. `SmsProviderReader.java`: regexes `^ static (int|long|String) (longAt|intAt|textAt)\([^\n]+` (one-line bodies). Plus hand-written replacements for the cut-away members (`stopObserving`, `fencedRead`, MMS file helpers). | Upstream follow-up: move SMS review/dispatch out of `TelephonyPlugin` into a Capacitor-free class (e.g. `SmsReviewedSend`) and expose `MmsStore` SMS helpers / `SmsProviderReader` as whole compilable classes. Then compile them whole here. Until then the slices stay, pinned to `upstream.lock.json`. | M |
| 2 | 60-436 | C5 | ~380 lines of Android/Capacitor stubs; `Uri`, `Intent`, `PendingIntent`, `PluginCall`, `Plugin`, `JSObject`, `AlertDialog`, `KeyguardManager`, `Looper/Handler` are re-written in most platform files with slight variations. | Pull the generic ones into `refinement/native/support/`; keep SMS-specific behaviour (radio modes, provider attribution query oracle, receiver goAsync counts) here. | M |
| 3 | 414-436 | – | Shadows `java.lang.System` with a package-local `System` to control `currentTimeMillis` — clever but invisible to readers. | Keep, with a one-line comment saying why. | L |
| 4 | 267-322 | – | The provider stub asserts the exact selection string and column list of the attribution query: it is an independent oracle of provider usage, useful. | Keep. | – |

## Proposed end state
Stub module reduced to SMS-specific ports (~200 lines) importing shared Android/Capacitor stubs; upstream members
compiled whole once the upstream split lands. Until then, document the anchors here as the only text pins.
