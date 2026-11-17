package android.telephony;
/** Test stand-in: E.164 for NANP ("US") numbers only; anything else cannot be formatted. */
public class PhoneNumberUtils {
 public static String formatNumberToE164(String number, String iso) {
  String d = number.replaceAll("[^0-9+]", "");
  if (d.startsWith("+")) return d.length() > 4 ? d : null;
  if (!"US".equals(iso)) return null;
  if (d.length() == 10) return "+1" + d;
  if (d.length() == 11 && d.startsWith("1")) return "+" + d;
  return null;
 }
}
