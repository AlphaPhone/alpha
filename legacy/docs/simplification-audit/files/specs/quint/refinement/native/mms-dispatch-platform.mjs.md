# specs/quint/refinement/native/mms-dispatch-platform.mjs
- Lines: 185 | Kind: Quint refinement platform builder (Java source surgery: slices upstream MMS members and rewrites the SMS stub set by anchor) | Verdict: PORT
- Covers: Builds the host-JVM compile set for `NativeMmsDispatch`: the reviewed-MMS members of upstream `TelephonyPlugin`/`MmsStore` plus Android/Capacitor stand-ins (Uri.Builder, Bitmap, LinearLayout, Telephony.Mms, ContentResolver MMS rows, SmsManager.sendMultimediaMessage). Duplicates: `sms-dispatch-platform.mjs` (same technique, same `between`/`replace` helpers). Callers/importers: only `native/mms-dispatch.mjs:8` (`git grep mmsPlatform`).

Product text read (through the `plugin`, `store`, `provider` arguments; staged patched copies from `test/fixtures/native-source.mjs`, or the historical revision): `vendor/eliza/plugins/plugin-native-messages/.../TelephonyPlugin.java`, `MmsStore.java`, `SmsProviderReader.java` (the last only passed through to `smsMembers`).
Anchors on product text: `' // ---- Reviewed native MMS'` … `' @Override protected void handleOnDestroy()'` (TelephonyPlugin); `' static final int ADDRESS_FROM'` … `' public static boolean isDefaultSmsApp'`, `' public static long persistOutgoingMms'` … `' // ---- Notices'` and the regex `^ static Uri fileUri\(SmsRoleConfiguration[^\n]+\n` (MmsStore).
Anchors on the SMS stub set (exact-once): `'import android.content.Intent;'`, `' static String newFileName()'`, `'SmsDispatchTraces.write'`, `'!event.equals("smsSendUpdated")'`, `' public File getNoBackupFilesDir()'`, `' public byte[] getByteArrayExtra'`, `' public String toString()'`, `' public boolean isFinishing()'`, `' public String title,message;'`, `'  public AlertDialog create()'`, `EXTRA_MMS_DATA` line, the throwing `sendMultimediaMessage` line, `'\n}}'`, `'import android.provider.Telephony.Sms;'`, `' public boolean refuseInsert;'`, `'  if(refuseInsert)return null;'`, `'  if(!where.equals(Sms.TYPE'`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-13 | C3/C5 | Private `slice`/`replace` twins of `sms-dispatch-platform.mjs:3-7` (`between`); research counts `between()` in 12 harnesses. | One helper in a shared harness support module, or gone after the port. | None |
| 2 | 21-34 | T10 | Copies member ranges out of upstream `TelephonyPlugin.java` and `MmsStore.java` by comment/signature anchors; any upstream reorder, comment edit or formatter run breaks it. | Compile the whole `TelephonyPlugin.java`/`MmsStore.java` (staged) against complete Capacitor/Android stand-ins; no member extraction. If the classes pull too many Android types, ask upstream to split the reviewed-MMS dispatcher into its own class (D14 follow-up). | High (stub surface grows) |
| 3 | 19, 38-183 | T10/C5 | Second layer of surgery: edits the generated SMS stub files by exact text. The MMS fixture is coupled to the SMS fixture's formatting. | Fold MMS additions into one shared Android stub library used by both SMS and MMS (research: 127 hand-written stub files). | Medium |
| 4 | 61-100, 141-183 | C5 | `LinearLayout`, `ImageView`, `Bitmap`, `Bundle`, `Uri.Builder`, `ContentResolver` stand-ins duplicated in spirit across `*-platform.mjs`. | Shared stub set. | Low |
| 5 | 36-37 | — | `SmsFixtureSupport` shadows `java.lang.System` to control the clock. Legitimate port. | Keep in the shared set. | None |
| 6 | whole | D8 | Dense one-line Java in template strings. | Format when ported. | None |

## Proposed end state
Gone as a separate file: MMS and SMS share one platform module that writes a fixed stub set and compiles the
staged upstream messages classes whole. No anchors on product text; stub additions are files, not string edits.
Model `NativeMmsDispatch` (live, `specs/quint/native/manifest.json:2543`) keeps passing.
