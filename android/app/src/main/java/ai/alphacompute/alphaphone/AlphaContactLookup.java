package ai.alphacompute.alphaphone;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.CancellationSignal;
import android.provider.ContactsContract;

/**
 * AP-16 AC-20: the contact a number belongs to, through Android's own number matching (PhoneLookup)
 * over the whole address book, so the call approval card names the person. Read-only; the caller
 * holds the Contacts read fence.
 */
final class AlphaContactLookup {
 private AlphaContactLookup() {}

 /** The display name of the contact with this number, or null when none has it. */
 static String name(Context context, String number, CancellationSignal cancel) {
  Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
  try (Cursor rows = context.getContentResolver().query(uri, new String[] { ContactsContract.PhoneLookup.DISPLAY_NAME }, null, null, null, cancel)) {
   if (rows == null || !rows.moveToFirst()) return null;
   String name = rows.getString(0);
   return name == null || name.isBlank() ? null : name;
  }
 }
}
