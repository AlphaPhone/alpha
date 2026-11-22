package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.eliza.plugins.agent.connection.ConnectionTransport;
import ai.eliza.plugins.agent.connection.DelegationCallback;
import ai.eliza.plugins.agent.connection.PendingRequests;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** First-party renderer transport and encrypted storage. Never injected into browser pages. Transport bounds, route
 * policy, delegation-return admission and the request registry are the shared plugin-native-agent connection
 * policies; this class keeps Alpha's plugin name, link scheme, hosts (ConnectionRoutes), slots and Android plumbing. */
@CapacitorPlugin(name = "AlphaConnection")
public final class AlphaConnectionPlugin extends Plugin {
 /** Alpha's Cloud delegation return link: alphaphone://cloud-delegation?state=...&(code|error)=... */
 static final String DELEGATION_SCHEME="alphaphone",DELEGATION_HOST="cloud-delegation";
 private volatile Uri delegationCallback;
 private volatile String workspaceCallback;
 private final Object foregroundLock=new Object();
 private boolean foreground;
 @Override public void load() { super.load(); synchronized(foregroundLock){foreground=getActivity().getLifecycle().getCurrentState().isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)||getActivity().hasWindowFocus();}captureDelegationCallback(getActivity().getIntent());captureWorkspaceCallback(getActivity().getIntent()); }
 @Override protected void handleOnNewIntent(Intent intent) { super.handleOnNewIntent(intent); captureDelegationCallback(intent);captureWorkspaceCallback(intent); }
 private void captureDelegationCallback(Intent intent) {
  Uri uri = intent == null ? null : intent.getData();
  if(uri==null || !DELEGATION_SCHEME.equals(uri.getScheme()) || !DELEGATION_HOST.equals(uri.getHost()))return;
  try {
   java.util.Map<String,java.util.List<String>> query=new java.util.HashMap<>();
   for(String name:uri.getQueryParameterNames())query.put(name,uri.getQueryParameters(name));
   if(DelegationCallback.admit(DELEGATION_SCHEME,DELEGATION_HOST,uri.getScheme(),uri.getHost(),uri.getPort(),uri.getUserInfo(),uri.getFragment(),uri.getPath(),query)==null)return;
   getActivity().setIntent(intent);delegationCallback=uri;notifyListeners("cloudDelegationCallback",new JSObject(),true);
  }catch(Exception ignored){ /* Invalid unsolicited links never enter the authentication flow. */ }
 }
 @PluginMethod public void readDelegationCallback(PluginCall call) {
  JSObject out=new JSObject();Uri uri=delegationCallback;
  if(uri==null){out.put("callback",JSONObject.NULL);call.resolve(out);return;}
  JSObject value=new JSObject();value.put("state",uri.getQueryParameter("state"));
  if(uri.getQueryParameter("code")!=null)value.put("code",uri.getQueryParameter("code"));else value.put("error","access_denied");
  out.put("callback",value);call.resolve(out);
 }
 @PluginMethod public void clearDelegationCallback(PluginCall call) {
  String state=call.getString("state");Uri uri=delegationCallback;
  if(uri!=null&&state!=null&&state.equals(uri.getQueryParameter("state"))){delegationCallback=null;Intent intent=getActivity().getIntent();if(intent!=null&&uri.equals(intent.getData()))intent.setData(null);}
  call.resolve();
 }

 /** Workspace return uses only its own native protected pending slot, on the build's verified App Link host
  * (BuildConfig.ELIZAOS_APP_LINK_HOST, the sign-in return host). */
 private GoogleWorkspaceReturnFlow workspaceFlow(){
  return new GoogleWorkspaceReturnFlow(BuildConfig.ELIZAOS_APP_LINK_HOST,new GoogleWorkspaceReturnFlow.Store(){
   public String credential()throws Exception{return storage().readCredentialSlot("cloud:production");}
   public String pending()throws Exception{return storage().readCredentialSlot(GoogleWorkspaceReturn.SLOT);}
   public boolean comparePending(String expected,String value)throws Exception{return storage().compareExchangeCredentialSlot(GoogleWorkspaceReturn.SLOT,expected,value);}
  });
 }
 private GoogleWorkspaceReturn.Binding workspaceBinding(PluginCall call,String raw)throws Exception {
  return GoogleWorkspaceReturnFlow.binding(call.getString("environment"),call.getString("userId"),call.getString("organizationId"),call.getString("credentialId"),raw);
 }
 private String workspaceAppLinkAssociation(){
  String callback=GoogleWorkspaceReturn.callback(BuildConfig.ELIZAOS_APP_LINK_HOST);
  if(callback==null||android.os.Build.VERSION.SDK_INT<31)return null;
  try{
   android.content.pm.verify.domain.DomainVerificationManager manager=getContext().getSystemService(android.content.pm.verify.domain.DomainVerificationManager.class);
   android.content.pm.verify.domain.DomainVerificationUserState state=manager==null?null:manager.getDomainVerificationUserState(getContext().getPackageName());
   if(state==null)return null;
   Integer domain=state.getHostToStateMap().get(BuildConfig.ELIZAOS_APP_LINK_HOST);
   Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(callback));intent.addCategory(Intent.CATEGORY_BROWSABLE);intent.addCategory(Intent.CATEGORY_DEFAULT);intent.setPackage(getContext().getPackageName());
   boolean ownCallback=!getContext().getPackageManager().queryIntentActivities(intent,android.content.pm.PackageManager.MATCH_DEFAULT_ONLY).isEmpty();
   return GoogleWorkspaceReturn.association(state.isLinkHandlingAllowed(),ownCallback,java.util.Objects.equals(domain,android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_VERIFIED),java.util.Objects.equals(domain,android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_SELECTED));
  }catch(Exception unavailable){return null;}
 }
 @PluginMethod public void prepareGoogleWorkspaceReturn(PluginCall call){
  submit(call,()->{try{
   String association=workspaceAppLinkAssociation();
   if(association==null||!"production".equals(call.getString("environment"))){call.resolve(new JSObject().put("supported",false));return;}
   final long owner=AlphaLocalAgentPlugin.credentialAuthorityEpoch();
   String raw=storage().readCredentialSlot("cloud:production");
   GoogleWorkspaceReturn.Binding binding=workspaceBinding(call,raw);
   JSONObject saved=new JSONObject(raw);if(saved.has("expiresAt")&&saved.getLong("expiresAt")<=System.currentTimeMillis())throw new IllegalArgumentException();
   // The identity read is an optional pre-check: a failure that says nothing about the account falls back to the manual return.
   String token=saved.getString("token");JSONObject identity;
   try{identity=readCloudIdentity(token,10000);}catch(Exception unread){if(!GoogleWorkspaceReturnFlow.manualReturn(unread))throw unread;call.resolve(new JSObject().put("supported",false));return;}
   if(!binding.userId.equals(identity.optString("userId"))||!binding.organizationId.equals(identity.optString("organizationId")))throw new SecurityException();
   byte[] bytes=new byte[32];new java.security.SecureRandom().nextBytes(bytes);String nonce=java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
   final String redirect=AlphaLocalAgentPlugin.withCredentialAuthority(owner,()->workspaceFlow().prepare(binding,nonce,System.currentTimeMillis()));
   workspaceCallback=null;
   call.resolve(new JSObject().put("supported",true).put("redirectUrl",redirect).put("state",nonce).put("association",association));
  }catch(Exception unavailable){call.reject("Google return preparation could not be verified","workspace-binding");}});
 }
 private void captureWorkspaceCallback(Intent intent){
  final String url=intent==null||intent.getData()==null?null:intent.getData().toString();
  if(GoogleWorkspaceReturn.parse(BuildConfig.ELIZAOS_APP_LINK_HOST,url)==null)return;
  storageTasks.submit(()->{try{
   if(destroyed||workspaceAppLinkAssociation()==null||!workspaceFlow().captureAllowed(url,System.currentTimeMillis()))return;
   workspaceCallback=url;notifyListeners("googleWorkspaceReturn",new JSObject(),true);
  }catch(Exception ignored){/* Invalid or retired returns are not authority. */}},()->{});
 }
 @PluginMethod public void consumeGoogleWorkspaceReturn(PluginCall call){
  submitStorage(call,()->{try{
   final String url=workspaceCallback;
   if(workspaceAppLinkAssociation()==null){call.resolve(new JSObject().put("result","none"));return;}
   GoogleWorkspaceReturn.Callback result=workspaceFlow().consume(workspaceBinding(call,storage().readCredentialSlot("cloud:production")),url,System.currentTimeMillis());
   if(result==null){call.resolve(new JSObject().put("result","none"));return;}
   if(java.util.Objects.equals(workspaceCallback,url))workspaceCallback=null;
   getActivity().runOnUiThread(()->{Intent current=getActivity().getIntent();if(current!=null&&current.getData()!=null&&url.equals(current.getData().toString()))current.setData(null);});
   JSObject out=new JSObject().put("result",result.result);if(result.connectionId!=null)out.put("connectionId",result.connectionId);call.resolve(out);
  }catch(Exception invalid){call.resolve(new JSObject().put("result","none"));}});
 }
 @PluginMethod public void cancelGoogleWorkspaceReturn(PluginCall call){
  submitStorage(call,()->{try{workspaceFlow().cancel(call.getString("state"));call.resolve();}catch(Exception invalid){call.reject("Google return could not be cancelled");}});
 }

 private static final int RESPONSE_LIMIT = ConnectionTransport.RESPONSE_LIMIT;
 /** A map view asks for about 15 tiles at once (MapLibre sends up to 16 in parallel); four workers queued
  * them four deep behind one another, so a screen of one-second tile reads took over four seconds. */
 private final ExecutorService workers = Executors.newFixedThreadPool(16);
 private final SerialStorageTasks storageTasks = new SerialStorageTasks();
 private volatile boolean destroyed;
 private final PendingRequests requests = new PendingRequests();
 /** Bridge messages already queued during Activity teardown can arrive after shutdown. */
 private boolean submit(PluginCall call,Runnable task) {
  if(destroyed){call.reject("Connection closed");return false;}
  return PluginWorkers.submit(workers,task,()->call.reject("Connection closed"));
 }
 private boolean submitStorage(PluginCall call,Runnable task) {
  return storageTasks.submit(()->{if(destroyed)call.reject("Connection closed");else task.run();},()->call.reject("Connection closed"));
 }
 /** The renderer call a browser handoff settles exactly once. */
 private static PendingRequests.Call settles(PluginCall call){return new PendingRequests.Call(){public void resolve(){call.resolve();}public void reject(String message){call.reject(message);}};}
 private static String required(String value, int max) { return ConnectionTransport.required(value,max); }
 private static Object parseJson(String value) throws Exception { return ConnectionTransport.parseJson(value); }
 /** Stable error code for a definite refusal above a slot's byte cap; nothing was written. */
 static final String STORAGE_FULL="storage-full";
 static final String STORAGE_FULL_MESSAGE="Secure storage is full. Nothing was written.";
 private long credentialIntent(String name){
  if(RendererCredentialSlots.credentialSlot(name))return AlphaLocalAgentPlugin.reserveCredentialIntent(foregroundLock,()->{if(destroyed)throw new IllegalStateException("Connection closed");});
  synchronized(foregroundLock){if(destroyed)throw new IllegalStateException("Connection closed");return 0;}
 }
 private AlphaCredentialStore storage(long intent){
  return new AlphaCredentialStore(getContext(),()->{if(destroyed)throw new IllegalStateException("Connection closed");if(intent!=0)AlphaLocalAgentPlugin.requireCredentialIntent(intent);});
 }
 private AlphaCredentialStore storage(){return new AlphaCredentialStore(getContext(),()->{if(destroyed)throw new IllegalStateException("Connection closed");});}
 void writeCredentialSlot(String name,String value)throws Exception{storage().writeCredentialSlot(name,value);}
 String readCredentialSlot(String name)throws Exception{return storage().readCredentialSlot(name);}
 /** The native Calendar sync consent (renderer-inaccessible); read only for a sync write. */
 private String calendarSyncConsent()throws Exception{return readCredentialSlot(CalendarSyncBridge.SLOT);}
 void removeCredentialSlot(String name)throws Exception{storage().removeCredentialSlot(name);}
 /** Required before rendering or persisting mock mode; never resumes automatically. */
 @PluginMethod public void pauseNotificationCollection(PluginCall call) {
  submit(call,()->{try{NotificationAccess.pause(getContext(),true);call.resolve();}catch(Exception failure){call.reject("Notification collection could not be paused");}});
 }
 private static URI validatedUrl(String text, boolean allowDevelopment) throws Exception {
  return ConnectionTransport.validatedUrl(text, allowDevelopment, false);
 }
 private static byte[] readBounded(InputStream input, int limit) throws Exception { return ConnectionTransport.readBounded(input, limit); }
 /** Native-owned read routes; URLs and credentials never come from Calendar renderer calls. */
 static JSONObject readCloudIdentity(String token)throws Exception {return readCloudIdentity(token,20000);}
 static JSONObject readCloudIdentity(String token,int timeoutMs)throws Exception {
  JSONObject response=readCloudObject(token,"/api/v1/user",timeoutMs);
  if(!Boolean.TRUE.equals(response.opt("success")))throw new SecurityException("Cloud identity unavailable");
  return LocalAgentProviderAdmission.verifiedCloudIdentity(response.getJSONObject("data"));
 }
 static JSONObject readCalendarSyncCapabilities(String token,String grant,String calendar)throws Exception {
  if(!java.util.UUID.fromString(grant).toString().equalsIgnoreCase(grant)||calendar==null||calendar.isEmpty()||calendar.length()>1024||calendar.chars().anyMatch(c->c<32||c==127))throw new IllegalArgumentException();
  JSONObject response=readCloudObject(token,"/api/v1/eliza/google/calendar/sync-v1/capabilities?grantId="+java.net.URLEncoder.encode(grant,"UTF-8")+"&calendarId="+java.net.URLEncoder.encode(calendar,"UTF-8"));
  return response;
 }
 private static JSONObject readCloudObject(String token,String path)throws Exception {return readCloudObject(token,path,20000);}
 private static JSONObject readCloudObject(String token,String path,int timeoutMs)throws Exception {
  if(!AlphaLocalAgentPlugin.validProviderToken(token,16384))throw new IllegalArgumentException();
  HttpURLConnection connection=(HttpURLConnection)validatedUrl(CloudDeployment.PRODUCTION_API+path,false).toURL().openConnection();
  try{
   connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);
   connection.setConnectTimeout(timeoutMs);connection.setReadTimeout(timeoutMs);connection.setRequestMethod("GET");
   connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("Authorization","Bearer "+token);
   int status=connection.getResponseCode();if(status!=200)throw new LocalAgentProviderAdmission.CloudReadFailure(status);if(connection.getContentLengthLong()>RESPONSE_LIMIT)throw new SecurityException("Cloud read unavailable");
   byte[] bytes;try(InputStream input=connection.getInputStream()){bytes=readBounded(input,RESPONSE_LIMIT);}
   // A body that is not one JSON object (an HTML error page, trailing text) is unreadable, not an answer about the account.
   Object parsed;try{parsed=parseJson(new String(bytes,StandardCharsets.UTF_8));}catch(IllegalArgumentException unreadable){parsed=null;}
   if(!(parsed instanceof JSONObject))throw new org.json.JSONException("Cloud read unreadable");
   return (JSONObject)parsed;
  }finally{connection.disconnect();}
 }
 private enum RequestOperation { CLI_CREATE, CLI_POLL, IDENTITY, BILLING_LIMITS, ENTITLEMENT, ENTITLEMENT_KEYS, REDEEM, OTHER }
 private enum RequestStage { VALIDATE, CONNECT, WRITE, STATUS, READ, PARSE, RESOLVE }
 /** Never include exception messages, request identifiers or transport data in diagnostics. */
 private static String debugRequestFailure(RequestOperation operation,RequestStage stage,int status,Exception error) {
  if(!BuildConfig.DEBUG)return null;
  String code="ALPHA_TRANSPORT:"+operation+":"+stage+":"+status+":"+error.getClass().getName();
  android.util.Log.d("AlphaConnection",code);
  return code;
 }
 @Override protected void handleOnPause(){synchronized(foregroundLock){foreground=false;}requests.pauseAll();super.handleOnPause();}
 @Override protected void handleOnResume(){
  super.handleOnResume();
  captureWorkspaceCallback(getActivity().getIntent());
  synchronized(foregroundLock){foreground=true;foregroundLock.notifyAll();}
  requests.resumeAll();
 }
 @Override protected void handleOnDestroy() {
  synchronized(foregroundLock){destroyed=true;foregroundLock.notifyAll();}
  requests.cancelAll();
  storageTasks.close();workers.shutdownNow(); super.handleOnDestroy();
 }
}
