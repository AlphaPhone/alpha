package android.app;
public class AppOpsManager {
 public static final String OPSTR_READ_PHONE_STATE = "android:read_phone_state";
 public static final int MODE_ALLOWED = 0;
 public int mode = 1;
 public int noteOpNoThrow(String op, int uid, String packageName) { return mode; }
}
