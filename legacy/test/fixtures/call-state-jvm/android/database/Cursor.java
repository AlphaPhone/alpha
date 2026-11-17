package android.database;
public interface Cursor extends java.io.Closeable { boolean moveToNext(); boolean moveToFirst(); String getString(int column); void close(); }
