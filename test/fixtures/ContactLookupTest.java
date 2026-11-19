package ai.alphacompute.alphaphone;

import android.content.Context;

/** AP-16 AC-20: the approval card names a contact only for an exact number match. */
public final class ContactLookupTest {
 static void check(boolean result, String what) { if (!result) throw new AssertionError(what); }
 public static void main(String[] args) {
  Context context = new Context();
  // PhoneLookup's loose match: trailing digits of another country's number.
  context.resolver.rows.add(new String[] { "Mom", "+44 20 7946 0103" });
  check(AlphaContactLookup.name(context, "+1 202 794 60103", null) == null, "a loose match names nobody");
  check(context.resolver.lastUri.endsWith("/%2B1+202+794+60103"), "PhoneLookup is asked for the number");
  // The exact number, in any formatting, names its contact; a later exact row is found too.
  context.resolver.rows.add(new String[] { "Carmen Ruiz", "+1 (555) 010-0103" });
  check("Carmen Ruiz".equals(AlphaContactLookup.name(context, "+15550100103", null)), "exact match after a loose one");
  check(AlphaContactLookup.name(context, "15550100103", null) == null, "a missing '+' is a different number");
  context.resolver.rows.clear();
  context.resolver.rows.add(new String[] { " ", "+15550100103" });
  check(AlphaContactLookup.name(context, "+15550100103", null) == null, "a blank name names nobody");
  check(AlphaContactLookup.digits("+1 (555) 010-0103").equals("+15550100103") && AlphaContactLookup.digits("ext").isEmpty(), "digits");
  // With the SIM's country, a national number and its E.164 form are the same number.
  android.telephony.TelephonyManager phone = new android.telephony.TelephonyManager();
  context.services.put(android.telephony.TelephonyManager.class, phone);
  context.resolver.rows.clear();
  context.resolver.rows.add(new String[] { "Carmen Ruiz", "+1 555-010-0103" });
  check(AlphaContactLookup.name(context, "(555) 010-0103", null) == null, "no country: national digits differ");
  phone.simCountry = "us";
  check("Carmen Ruiz".equals(AlphaContactLookup.name(context, "(555) 010-0103", null)), "US SIM: national equals E.164");
  check(AlphaContactLookup.name(context, "(555) 010-0104", null) == null, "a different number");
  phone.simCountry = ""; phone.networkCountry = "US";
  check("Carmen Ruiz".equals(AlphaContactLookup.name(context, "555 010 0103", null)), "network country when no SIM");
  check(AlphaContactLookup.exactName(java.util.List.of(new String[][] { { "A", "123" } }), "abc") == null, "an unparseable target names nobody");
  System.out.println("PASS contact lookup: exact numbers only");
 }
}
