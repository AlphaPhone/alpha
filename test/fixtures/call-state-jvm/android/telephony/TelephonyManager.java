package android.telephony;
/** Test stand-in: records listener registration. */
public class TelephonyManager {
 public final java.util.List<TelephonyCallback> registered = new java.util.ArrayList<>();
 public boolean refuse;
 public void registerTelephonyCallback(java.util.concurrent.Executor executor, TelephonyCallback callback) { if (refuse) throw new SecurityException("READ_PHONE_STATE"); registered.add(callback); }
 public void unregisterTelephonyCallback(TelephonyCallback callback) { registered.remove(callback); }
}
