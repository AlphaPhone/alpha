package ai.alphacompute.alphaphone;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.CancellationSignal;
import android.provider.ContactsContract;

/**
 * AP-16 AC-20: the contact a number belongs to, for the call approval card. Android's PhoneLookup
 * finds candidates over the whole address book, but it matches loosely (trailing digits), so a
 * candidate names the card only when its stored number is exactly the number that will be dialed:
 * the same E.164 number for the SIM's country (or, when either cannot be formatted, the same digits).
 * Otherwise the card shows the number with no name.
 * Read-only; the caller holds the Contacts read fence.
 */
final class AlphaContactLookup {
 private AlphaContactLookup() {}

 /**
  * One ContactsCatalog page as contact search results. A contact the catalog could not read
  * completely is listed there by id only ({@code incomplete}); it is left out, so one oversized
  * contact never fails the whole search.
  */
 static org.json.JSONArray searchRows(org.json.JSONArray rows, java.util.function.UnaryOperator<String> clip) throws org.json.JSONException {
  org.json.JSONArray records = new org.json.JSONArray();
  for (int i = 0; i < rows.length(); i++) {
   org.json.JSONObject row = rows.getJSONObject(i), item = new org.json.JSONObject();
   if (row.optBoolean("incomplete")) continue;
   item.put("id", row.getString("id")); item.put("lookupKey", row.getString("lookup").length() > 512 ? "" : row.getString("lookup"));
   item.put("displayName", clip.apply(row.getString("name"))); item.put("starred", row.getBoolean("starred"));
   org.json.JSONArray phones = new org.json.JSONArray(), emails = new org.json.JSONArray();
   for (int j = 0; j < row.getJSONArray("phones").length(); j++) phones.put(clip.apply(row.getJSONArray("phones").getString(j)));
   for (int j = 0; j < row.getJSONArray("emails").length(); j++) emails.put(clip.apply(row.getJSONArray("emails").getString(j)));
   item.put("phoneNumbers", phones); item.put("emailAddresses", emails); records.put(item);
  }
  return records;
 }

 /** The display name of the contact whose number is exactly this one, or null. */
 static String name(Context context, String number, CancellationSignal cancel) {
  Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
  String[] columns = { ContactsContract.PhoneLookup.DISPLAY_NAME, ContactsContract.PhoneLookup.NUMBER };
  try (Cursor rows = context.getContentResolver().query(uri, columns, null, null, null, cancel)) {
   if (rows == null) return null;
   java.util.List<String[]> candidates = new java.util.ArrayList<>();
   while (rows.moveToNext()) candidates.add(new String[] { rows.getString(0), rows.getString(1) });
   String iso = country(context);
   return exactName(candidates, number, value -> e164(value, iso));
  }
 }

 /** The SIM's (else the network's) country, upper case, or null. */
 static String country(Context context) {
  android.telephony.TelephonyManager phone = context.getSystemService(android.telephony.TelephonyManager.class);
  if (phone == null) return null;
  String iso = phone.getSimCountryIso();
  if (iso == null || iso.isEmpty()) iso = phone.getNetworkCountryIso();
  return iso == null || iso.isEmpty() ? null : iso.toUpperCase(java.util.Locale.ROOT);
 }

 /** The E.164 form for the country, or the plain digits when it cannot be formatted. */
 static String e164(String number, String iso) {
  String formatted = iso == null ? null : android.telephony.PhoneNumberUtils.formatNumberToE164(number, iso);
  return formatted != null ? formatted : digits(number);
 }

 /** The first candidate {name, number} whose number is exactly the target; null when none is. */
 static String exactName(java.util.List<String[]> candidates, String target) {
  return exactName(candidates, target, AlphaContactLookup::digits);
 }
 static String exactName(java.util.List<String[]> candidates, String target, java.util.function.Function<String, String> normalize) {
  if (digits(target).isEmpty()) return null;
  String wanted = normalize.apply(target);
  if (wanted == null || wanted.isEmpty()) return null;
  for (String[] row : candidates) {
   if (row == null || row.length < 2 || row[0] == null || row[0].isBlank() || digits(row[1]).isEmpty()) continue;
   if (wanted.equals(normalize.apply(row[1]))) return row[0];
  }
  return null;
 }

 /** A leading '+' and the digits, with formatting removed; empty when there are no digits. */
 static String digits(String number) {
  if (number == null) return "";
  StringBuilder out = new StringBuilder();
  for (int i = 0; i < number.length(); i++) {
   char c = number.charAt(i);
   if (c >= '0' && c <= '9') out.append(c);
   else if (c == '+' && out.length() == 0) out.append(c);
  }
  return out.length() == 0 || out.toString().equals("+") ? "" : out.toString();
 }
}
