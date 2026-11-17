package android.telecom;
/** Test stand-in: the public API (no isInEmergencyCall, as in the public SDK). */
public class TelecomManager {
 public String dialer = "com.android.dialer";
 public boolean inCall;
 public String getDefaultDialerPackage() { return dialer; }
 public boolean isInCall() { return inCall; }
}
