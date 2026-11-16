package android.content;
/** Test stand-in: the parts of Context AlphaCallState reads. */
public class Context {
 public String packageName = "ai.alphacompute.alphaphone";
 public java.util.Set<String> granted = new java.util.HashSet<>();
 public java.util.Map<Class<?>, Object> services = new java.util.HashMap<>();
 public android.content.pm.ApplicationInfo info = new android.content.pm.ApplicationInfo();
 public String getPackageName() { return packageName; }
 public int checkSelfPermission(String permission) { return granted.contains(permission) ? 0 : -1; }
 @SuppressWarnings("unchecked") public <T> T getSystemService(Class<T> type) { return (T) services.get(type); }
 public android.content.pm.ApplicationInfo getApplicationInfo() { return info; }
 public java.util.concurrent.Executor getMainExecutor() { return Runnable::run; }
}
