package ai.alphacompute.alphaphone;

/** Fixed diagnostic vocabulary only; never emits exception text or caller data. */
final class NativeNotificationDiagnostics {
 enum Stage { CAPTURE_OWNER, READ_OWNER, FENCE, PERSIST_OWNER, INBOX, SUBSCRIBE }
 private static String family(Exception failure) {
  return failure instanceof SecurityException?"security":failure instanceof org.json.JSONException?"json":failure instanceof java.io.IOException?"io":"other";
 }
 static void failure(Stage stage,Exception failure) {
  android.util.Log.w("AlphaNotification","stage="+stage.name()+" family="+family(failure));
 }
 enum Persist { SESSION, AGENT, INSTALLATION, PROVIDER, RECORD, PREVIOUS, STORE, FINAL }
 static void persistFailure(Persist stage,Exception failure) {
  android.util.Log.w("AlphaNotification","persist="+stage.name()+" family="+family(failure));
 }
 static void ownerRead(String path,int status) {
  String stage;
  switch(path){
   case "/api/auth/me":stage="auth-me";break;
   case "/api/agents":stage="agents";break;
   case "/api/client-devices/context":stage="device-context";break;
   default:return;
  }
  android.util.Log.w("AlphaNotification","ownerRead="+stage+" status="+(status>=100&&status<=599?status:0));
 }
}
