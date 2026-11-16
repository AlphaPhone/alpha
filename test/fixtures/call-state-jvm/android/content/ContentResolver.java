package android.content;
/** Test stand-in: answers PhoneLookup with fixed rows {name, number} and records the query. */
public class ContentResolver {
 public java.util.List<String[]> rows = new java.util.ArrayList<>();
 public String lastUri;
 public android.database.Cursor query(android.net.Uri uri, String[] columns, String selection, String[] args, String order, android.os.CancellationSignal cancel) {
  lastUri = uri.text;
  java.util.Iterator<String[]> next = rows.iterator();
  return new android.database.Cursor() {
   String[] row;
   public boolean moveToNext() { if (!next.hasNext()) return false; row = next.next(); return true; }
   public boolean moveToFirst() { return moveToNext(); }
   public String getString(int column) { return row[column]; }
   public void close() {}
  };
 }
}
