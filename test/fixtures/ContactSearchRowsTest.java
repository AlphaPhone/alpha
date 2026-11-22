package ai.alphacompute.alphaphone;

import org.json.JSONArray;
import org.json.JSONObject;

/** Contact search over one ContactsCatalog page: a contact the catalog lists by id only is left out. */
public final class ContactSearchRowsTest {
 static void check(boolean result, String what) { if (!result) throw new AssertionError(what); }
 static JSONObject row(String id, String name, String... phones) throws Exception {
  return new JSONObject().put("id", id).put("lookup", "key-" + id).put("name", name).put("revision", "1").put("starred", false)
   .put("phones", new JSONArray(java.util.Arrays.asList(phones))).put("emails", new JSONArray().put(name.toLowerCase().replace(' ', '.') + "@example.com"));
 }
 public static void main(String[] args) throws Exception {
  // ContactsCatalog.list answers {id, incomplete, reason} for a contact with more than 32 numbers or an oversized field.
  JSONObject oversized = new JSONObject().put("id", "2").put("incomplete", true).put("reason", "too-many-fields");
  JSONArray page = new JSONArray().put(row("1", "Sam Lee", "+15555550100")).put(oversized).put(row("3", "Sam Okafor", "+15555550101", "+15555550102"));
  JSONArray found = AlphaContactLookup.searchRows(page, value -> value.length() > 8 ? value.substring(0, 8) : value);
  check(found.length() == 2, "the oversized contact is skipped and the search still answers");
  JSONObject first = found.getJSONObject(0), second = found.getJSONObject(1);
  check(first.getString("id").equals("1") && second.getString("id").equals("3"), "the complete contacts, in order");
  check(first.getString("lookupKey").equals("key-1") && !first.getBoolean("starred"), "lookup key and starred");
  check(second.getString("displayName").equals("Sam Okaf") && second.getJSONArray("phoneNumbers").getString(1).equals("+1555555"), "text is clipped");
  check(second.getJSONArray("phoneNumbers").length() == 2 && second.getJSONArray("emailAddresses").length() == 1, "every number and address");
  check(AlphaContactLookup.searchRows(new JSONArray().put(oversized), value -> value).length() == 0, "only an oversized contact: no match, not a failure");
  JSONObject longKey = row("4", "Long Key").put("lookup", "k".repeat(513));
  check(AlphaContactLookup.searchRows(new JSONArray().put(longKey), value -> value).getJSONObject(0).getString("lookupKey").isEmpty(), "an oversized lookup key is not passed on");
  System.out.println("PASS contact search rows: incomplete contacts skipped");
 }
}
