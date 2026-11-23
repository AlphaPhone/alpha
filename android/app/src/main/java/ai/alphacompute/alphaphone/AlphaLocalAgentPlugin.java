package ai.alphacompute.alphaphone;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.eliza.plugins.securestore.nativeonly.CredentialIntentFence;
import ai.alphacompute.alphaphone.runtime.CredentialRequestFence;
import ai.alphacompute.alphaphone.runtime.NativeProviderSlot;
import ai.alphacompute.alphaphone.runtime.ResidentAttachment;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** First-party local runtime bridge. Runtime and owner bearer tokens stay native. */
@CapacitorPlugin(name="Agent")
public final class AlphaLocalAgentPlugin extends Plugin {

/** Content-free classification of one failed attach. Never stores exception text. */
private static final class ResidentAttachDiagnostic {
  enum Stage { TOKEN, STATUS, ENROLLMENT }
  Stage stage = Stage.TOKEN;
  private int status;

  void response(int value) { status = value >= 100 && value <= 599 ? value : 0; }

  boolean retryable(Throwable error) {
    return error instanceof RuntimeRootChanged
      || stage == Stage.STATUS && (error instanceof java.io.IOException || status >= 500);
  }

  String failure(Throwable error) {
    String kind = error instanceof java.net.SocketTimeoutException ? "SocketTimeoutException"
      : error instanceof java.io.IOException ? "IOException"
      : error instanceof SecurityException ? "SecurityException"
      : error instanceof IllegalStateException ? "IllegalStateException"
      : error instanceof org.json.JSONException ? "JSONException" : "Exception";
    return "category=resident-attach method=GET stage=" + stage.name().toLowerCase(java.util.Locale.ROOT)
      + " status=" + status + " errorClass=" + kind;
  }
}

 private final ExecutorService workers=Executors.newFixedThreadPool(2);
 private final ExecutorService voiceWorkers=new java.util.concurrent.ThreadPoolExecutor(1,1,0L,java.util.concurrent.TimeUnit.MILLISECONDS,new java.util.concurrent.SynchronousQueue<>());
 private final ExecutorService rendererWorkers=new java.util.concurrent.ThreadPoolExecutor(1,1,0L,java.util.concurrent.TimeUnit.MILLISECONDS,new java.util.concurrent.SynchronousQueue<>());
 // Set only from in-process debug instrumentation (ResidentWorkflowCrashInstrumentedTest); no route,
 // intent or preference activation. In a debug build in a secondary user it may point the stored provider at a
 // loopback model: only the keys below, and only http://127.0.0.1 base URLs.
 static volatile java.util.function.Function<JSONObject,java.util.Map<String,String>> instrumentationLaunchEnvironment;
 /** Provider keys and model selectors the legacy launch exported; the launch model now comes from host.json. */
 static final String[] LAUNCH_MODEL_ENVIRONMENT={
  "ELIZAOS_CLOUD_API_KEY","ELIZAOS_CLOUD_BASE_URL","ELIZAOS_CLOUD_SMALL_MODEL","ELIZAOS_CLOUD_LARGE_MODEL","ELIZAOS_CLOUD_IMAGE_DESCRIPTION_MODEL",
  "ELIZAOS_CLOUD_USE_INFERENCE","ELIZAOS_CLOUD_USE_EMBEDDINGS","ELIZAOS_CLOUD_EMBEDDING_MODEL","ELIZAOS_CLOUD_EMBEDDING_DIMENSIONS",
  "CEREBRAS_API_KEY","CEREBRAS_BASE_URL","CEREBRAS_MODEL","CEREBRAS_SMALL_MODEL","CEREBRAS_LARGE_MODEL",
  "OPENAI_API_KEY","OPENAI_BASE_URL","ELIZA_PROVIDER","CARTESIA_API_KEY","CARTESIA_API_KEY_FILE"};
 private static final java.util.Set<String> INSTRUMENTATION_LAUNCH_KEYS=java.util.Set.of("CEREBRAS_BASE_URL","OPENAI_BASE_URL","OPENAI_API_KEY","ELIZA_PROVIDER");
 private static String rootToken,ownerToken,ownerIdentity,notificationAgent;
 private static long expiresAt;
 private static final Object lifecycleLock=new Object(), enrollmentLock=new Object();
 private static long lifecycleEpoch;
 private static volatile long credentialMutationEpoch=-1;
 private static long credentialShutdownRequest=-1;
 private static long credentialShutdownRetryEpoch=-1;
 // The stop request of a commit that threw: its write may or may not have landed. Starts stay
 // fenced, and the owner's Start/Retry reissues strict teardown (retryCredentialShutdown).
 private static long uncertainCommitRequest=-1;
 private static String startRequestId;
 private static long startRequestEpoch;
 private static boolean startOwnsLaunch;
 /** Last-intent-wins credential fence (plugin-native-agent), guarded by the lifecycle lock. */
 private static final CredentialIntentFence credentialIntents=new CredentialIntentFence(lifecycleLock);
 private final CredentialRequestFence providerConfigurations=new CredentialRequestFence(lifecycleLock,credentialIntents);
 private static long powerAuthorizationMutationEpoch;
 private volatile long providerSurfaceGeneration;
 private volatile AutoCloseable providerReveal;
 private volatile String providerRevealRequestId;
 static long credentialAuthorityEpoch(){synchronized(lifecycleLock){return powerAuthorizationMutationEpoch;}}
 /** Compound credential-slot operations must enter before acquiring the vault lock. */
 static Object credentialLifecycleLock(){return lifecycleLock;}
 /** Revalidate an async operation against semantic credential changes, using the existing lock order. */
 static <T> T withCredentialAuthority(long owner,java.util.concurrent.Callable<T> action)throws Exception{
  synchronized(lifecycleLock){
   if(owner!=powerAuthorizationMutationEpoch)throw new SecurityException("Cloud authority changed");
   synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){return action.call();}
  }
 }
 /** Shared sign-in reads and delivery: the credential writers' lifecycle then vault lock order, never inside a mutation. */
 static <T> T withCredentialRead(java.util.concurrent.Callable<T> read)throws Exception{
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   if(credentialMutationEpoch>=0)throw new IllegalStateException("Credential mutation in progress");
   return read.call();
  }}
 }
 /** Vault before lifecycle can deadlock against any writer; fail fast instead. */
 private static void requireLockOrder(){
  if(Thread.holdsLock(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK)&&!Thread.holdsLock(lifecycleLock))throw new IllegalStateException("lock order");
 }
 /** Noncritical slots share the canonical lock order without changing credential authority. */
 static <T> T withCredentialSlotMutation(Runnable guard,java.util.concurrent.Callable<T> commit)throws Exception{
  requireLockOrder();
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   guard.run();return commit.call();
  }}
 }
 /** Native-only authorization mutation marker. Both locks are already held by credential commit. */
 static void powerAuthorizationChanged(){
  if(!Thread.holdsLock(lifecycleLock)||!Thread.holdsLock(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK))throw new IllegalStateException("Credential lock order required");
  powerAuthorizationMutationEpoch++;
  AlphaVoiceCloudPlugin.retireProviderAuthority();
  for(AlphaLocalAgentPlugin instance:new java.util.ArrayList<>(instances))instance.closeProviderReveal();
 }
 /** A protected launch constraint, never authority minted by stored account correlation alone. */
 static final class PowerLaunchPin implements ai.eliza.plugins.system.SenseListenerClient.PowerLaunchValidator {
  private final Context context;private final long mutation;private final String account,generation;
  private PowerLaunchPin(Context context,long mutation,JSONObject admitted)throws Exception{this.context=context.getApplicationContext();this.mutation=mutation;account=admitted.getString("accountRef");generation=admitted.getString("sessionGeneration");}
  public boolean isCurrent(){synchronized(lifecycleLock){
   if(mutation!=powerAuthorizationMutationEpoch||stopping||credentialMutationEpoch>=0||credentialShutdownRequest!=-1||context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return false;
   try{JSONObject now=new AlphaCredentialStore(context).providerAdmissionSnapshot();return "elizacloud".equals(now.optString("provider"))&&"production".equals(now.optString("environment"))&&account.equals(now.getString("accountRef"))&&generation.equals(now.getString("sessionGeneration"));}catch(Exception unavailable){return false;}
  }}
  public boolean authorize(String candidate,java.util.function.BooleanSupplier consume){synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   // Native credential commit and grant issuance are one atomic authorization point. SDK
   // enters without its own locks; callback checks its current lease under app -> SDK order.
   return account.equals(candidate)&&isCurrent()&&consume.getAsBoolean();
  }}}
 }
 static PowerLaunchPin capturePowerLaunchPin(Context context){synchronized(lifecycleLock){
  if(stopping||credentialMutationEpoch>=0||credentialShutdownRequest!=-1||context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return null;
  try{JSONObject admitted=new AlphaCredentialStore(context).providerAdmissionSnapshot();if(!"elizacloud".equals(admitted.optString("provider"))||!"production".equals(admitted.optString("environment")))return null;return new PowerLaunchPin(context,powerAuthorizationMutationEpoch,admitted);}catch(Exception unavailable){return null;}
 }}
 private final java.util.Set<String> cancelledStarts=new java.util.HashSet<>();
 private static boolean accepting=true,stopping;
 private volatile boolean disposed;
 // Provider admission generation the running agent process was launched with (configureLaunch).
 private static String launchedGeneration;
 // This surface's start requests that attached. Cancelling one never retires the shared launch.
 private final ResidentAttachment.Requests attachedStarts=new ResidentAttachment.Requests();
 // Set when this surface's attach could not be verified; its next start takes the full path.
 private boolean attachUnverified;
 // Each Activity bridge (MainActivity, AlphaAssistActivity) has its own plugin instance. Calls,
 // streams and their invalidators belong to the instance that admitted them, so one surface's
 // destruction cancels only its own work. The runtime, epoch and enrollment stay process-wide.
 private final ResidentRecoveryReview recoveryReview=new ResidentRecoveryReview();
 private final java.util.Set<PluginCall> pending=new java.util.HashSet<>();
 /** Plain requests the renderer can withdraw, by the id it chose. Guarded by lifecycleLock. */
 private final java.util.Map<String,PluginCall> withdrawable=new java.util.HashMap<>();
 private final java.util.Map<String,ElizaAgentService.LocalStreamHandle> streams=new java.util.HashMap<>();
 private final java.util.Map<String,Runnable> streamInvalidators=new java.util.HashMap<>();
 private static final java.util.Set<AlphaLocalAgentPlugin> instances=new java.util.HashSet<>();
 @Override public void load(){super.load();synchronized(lifecycleLock){if(!disposed)instances.add(this);}watchKeyguard();}
 private android.content.BroadcastReceiver keyguardWatch;
 private Boolean keyguardPosted;
 /** Whether Android's keyguard shows over this surface now; an unknown keyguard counts as locked. */
 private boolean keyguardShown(){
  android.app.KeyguardManager keyguard=getContext().getSystemService(android.app.KeyguardManager.class);
  return keyguard==null||keyguard.isKeyguardLocked();
 }
 private void postKeyguard(){
  boolean locked=keyguardShown();
  synchronized(this){if(disposed||Boolean.valueOf(locked).equals(keyguardPosted))return;keyguardPosted=locked;}
  notifyListeners("keyguardChanged",new JSObject().put("locked",locked));
 }
 private void watchKeyguard(){
  android.content.IntentFilter filter=new android.content.IntentFilter();
  filter.addAction(android.content.Intent.ACTION_SCREEN_OFF);
  filter.addAction(android.content.Intent.ACTION_SCREEN_ON);
  filter.addAction(android.content.Intent.ACTION_USER_PRESENT);
  keyguardWatch=new android.content.BroadcastReceiver(){@Override public void onReceive(Context context,android.content.Intent intent){postKeyguard();}};
  androidx.core.content.ContextCompat.registerReceiver(getContext(),keyguardWatch,filter,androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
  synchronized(this){keyguardPosted=keyguardShown();}
 }
 private void unwatchKeyguard(){
  android.content.BroadcastReceiver held=keyguardWatch;keyguardWatch=null;
  if(held!=null)try{getContext().unregisterReceiver(held);}catch(IllegalArgumentException alreadyGone){/* Not registered. */}
 }
 @Override protected void handleOnResume(){super.handleOnResume();postKeyguard();}
 /** Android's keyguard now, consuming nothing: `locked` is true while the keyguard shows or cannot be read.
  * `keyguardChanged` posts the same fact when the screen turns off or on and when the owner unlocks. */
 @PluginMethod public void keyguard(PluginCall call) {
  boolean locked=keyguardShown();
  synchronized(this){keyguardPosted=locked;}
  call.resolve(new JSObject().put("locked",locked));
 }
 /** This instance only: used when its own bridge is destroyed. Caller holds lifecycleLock. */
 private void invalidateOwnCalls(){
  recoveryReview.clear();
  for(var notify:streamInvalidators.values())notify.run();streamInvalidators.clear();
  for(var handle:streams.values())handle.cancel();streams.clear();
  for(PluginCall call:pending)call.reject("Local agent connection changed. A dispatched operation may still have completed; inspect its receipt before retrying.","LOCAL_AGENT_EPOCH_CHANGED");
  pending.clear();
 }
 /** Runtime lifecycle changes (start, stop, cancelled start) supersede every surface's work. Caller holds lifecycleLock. */
 private static void invalidateCalls(){
  for(AlphaLocalAgentPlugin instance:new java.util.ArrayList<>(instances))instance.invalidateOwnCalls();
 }
 /** Package-private observation for instrumentation; never a Capacitor method. */
 int ownedWorkCount(){synchronized(lifecycleLock){return pending.size()+streams.size();}}
 static boolean enrollmentPresent(){synchronized(lifecycleLock){return rootToken!=null&&ownerToken!=null;}}
 /** Instrumentation-only: register a synthetic in-flight stream owned by this instance. */
 void adoptStreamForTest(String id,ElizaAgentService.LocalStreamHandle handle,Runnable invalidator){if(!BuildConfig.DEBUG)throw new IllegalStateException();synchronized(lifecycleLock){instances.add(this);streams.put(id,handle);streamInvalidators.put(id,invalidator);}}
 static void enrollForTest(String root,String owner,String identity,long expiry){if(!BuildConfig.DEBUG)throw new IllegalStateException();synchronized(lifecycleLock){rootToken=root;ownerToken=owner;ownerIdentity=identity;expiresAt=expiry;}}
 static void launchedGenerationForTest(String generation){if(!BuildConfig.DEBUG)throw new IllegalStateException();synchronized(lifecycleLock){launchedGeneration=generation;}}
 static long lifecycleEpochForTest(){if(!BuildConfig.DEBUG)throw new IllegalStateException();synchronized(lifecycleLock){return lifecycleEpoch;}}
 /** Instrumentation-only: the production attach admission against a synthetic runtime observation. */
 String attachForTest(JSONObject bootState,String currentRoot,String currentGeneration){if(!BuildConfig.DEBUG)throw new IllegalStateException();synchronized(lifecycleLock){return attachLocked(bootState,currentRoot,currentGeneration);}}
 /** Caller holds lifecycleLock. Read-only: null when this surface may attach to the running resident. */
 private String attachRefusalLocked(JSONObject bootState,String currentRoot,String currentGeneration){
  if(disposed)return "bridge-closed";
  ResidentAttachment.Facts facts=new ResidentAttachment.Facts();
  facts.accepting=accepting;facts.stopping=stopping;facts.credentialMutating=credentialMutationEpoch>=0;facts.credentialShutdownPending=credentialShutdownRequest!=-1;facts.attachUnverified=attachUnverified;
  facts.currentRoot=currentRoot;facts.enrolledRoot=rootToken;facts.ownerToken=ownerToken;facts.ownerIdentity=ownerIdentity;facts.expiresAt=expiresAt;facts.now=System.currentTimeMillis();
  facts.launchedGeneration=launchedGeneration;facts.currentGeneration=currentGeneration;
  return ResidentAttachment.refusal(bootState,facts);
 }
 /** Caller holds lifecycleLock. Attaching supersedes only this surface's own earlier work: the
  * runtime epoch, the owner enrollment and every other surface's calls and streams are untouched. */
 private String attachLocked(JSONObject bootState,String currentRoot,String currentGeneration){
  String refusal=attachRefusalLocked(bootState,currentRoot,currentGeneration);
  if(refusal==null)invalidateOwnCalls();
  return refusal;
 }
 /**
  * The native owner a cold listener wake is bound to (SenseListenerClient.admitOwner): the stored
  * provider admission generation, a random UUID or NO_PROVIDER_GENERATION and never a credential.
  * A Cloud account change between the wake and the renderer's first authenticated binding changes
  * it, so that wake only opens the assistant. Null when the stored admission is invalid.
  */
 static String invocationOwner(Context context){return INVOCATION_OWNER.get(()->readProviderOwner(new AlphaCredentialStore(context)),System.currentTimeMillis());}
 /** Cached invocationOwner: mutateCredentials invalidates it around every provider/Cloud commit, and it is read again once the Cloud credential's expiresAt passes. */
 private static final InvocationOwnerCache INVOCATION_OWNER=new InvocationOwnerCache();
 /** Stored provider admission generation; NO_PROVIDER_GENERATION when no provider is stored (the agent runs unbound and surfaces attach to it as to a bound one); null when legacy or no longer valid. Never writes. */
 private static String storedProviderGeneration(AlphaCredentialStore store){try{return readProviderOwner(store).value;}catch(Exception unavailable){return null;}}
 /** The stored generation and when it may stop holding with no write: an elizacloud generation fails once its credential's expiresAt passes (NativeProviderAdmission.cloudProviderToken). */
 private static InvocationOwnerCache.Owner readProviderOwner(AlphaCredentialStore store)throws Exception{
  String saved=store.readCredentialSlot("local-agent-provider:v1");if(saved==null)return new InvocationOwnerCache.Owner(LocalAgentProviderAdmission.NO_PROVIDER_GENERATION,Long.MAX_VALUE);
  String cloud="elizacloud".equals(new JSONObject(saved).optString("provider"))?store.readCredentialSlot("cloud:production"):null;
  long validUntil=Long.MAX_VALUE;
  if(cloud!=null){try{JSONObject credential=new JSONObject(cloud);if(credential.has("expiresAt"))validUntil=InvocationOwnerCache.deadline(credential.opt("expiresAt"));}catch(Exception unreadable){validUntil=Long.MIN_VALUE;}}
  return new InvocationOwnerCache.Owner(LocalAgentProviderAdmission.currentGeneration(saved,cloud),validUntil);
 }
 /**
  * A system broadcast starts the resident only while no surface is stopping it or changing its
  * provider. The check and ElizaAgentService.start share lifecycleLock, as start() does, so a stop
  * cannot slip between them. The epoch is left alone: a running resident is not restarted and its
  * attached surfaces keep their in-flight calls.
  */
 static ResidentScheduleRearm.Decision startResidentIfAdmissible(Context context,String action,boolean userUnlocked,boolean runtimePackaged,boolean ownerEnabled){
  return ResidentScheduleRearm.admitAndStart(lifecycleLock,action,userUnlocked,runtimePackaged,ownerEnabled,
   ()->accepting&&!stopping&&credentialMutationEpoch<0&&credentialShutdownRequest==-1,()->ElizaAgentService.start(context));
 }
 private void rejectPending(PluginCall call,String message){synchronized(lifecycleLock){if(pending.remove(call))call.reject(message);}}

 private static final class Superseded extends Exception {}
 private static final class RuntimeRootChanged extends Exception {}
 private static final class EnrollmentReadUnavailable extends Exception {
  EnrollmentReadUnavailable(java.io.IOException cause){super(cause);}
 }
 // Owner, provider and account changes retire shade notices first (AlphaCanonicalNotifications.forget);
 // start, cancel, 401 and destroy keep the same owner, so its posted notices stay.
 private static void clearEnrollment(){AlphaCanonicalNotifications.suspendForRestart();rootToken=null;ownerToken=null;ownerIdentity=null;notificationAgent=null;expiresAt=0;}
 static long currentCredentialIntent(){return credentialIntents.current();}
 static long reserveCredentialIntent(){return credentialIntents.reserve();}
 /** Check bridge ownership under lifecycle admission before superseding another credential intent. */
 static long reserveCredentialIntent(Object ownerLock,Runnable assertOwner){
  synchronized(lifecycleLock){synchronized(ownerLock){assertOwner.run();return credentialIntents.reserve();}}
 }
 static void requireCredentialIntent(long intent){credentialIntents.require(intent);}
 interface CredentialMutation<T> {
  boolean requiresShutdown()throws Exception;
  T commit()throws Exception;
 }
 /** Slot classification/commit are atomic; observing shutdown must never hold the vault lock. */
 static <T> T mutateCredentials(Context context,Runnable assertOwner,CredentialMutation<T> mutation)throws Exception {
  requireLockOrder();
  final long epoch;
  synchronized(lifecycleLock){
   assertOwner.run();
   synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
    if(!mutation.requiresShutdown())return commitCredentials(mutation);
   }
   startRequestId=null;startOwnsLaunch=false;
   AlphaCanonicalNotifications.forget(context);
   invalidateCalls();epoch=++lifecycleEpoch;credentialMutationEpoch=epoch;accepting=false;stopping=true;clearEnrollment();
  }
  // The service's stop ACK proves absence but keeps starts fenced (CredentialShutdownLease). As the
  // shared CredentialMutationConductor does: a completed commit releases this exact request, a stop
  // with no commit attempt abandons it (released at its ACK), and an uncertain commit keeps it.
  long stopRequest=-1;boolean commitAttempted=false,commitFailed=false;
  try{
   synchronized(lifecycleLock){assertOwner.run();if(epoch!=lifecycleEpoch||credentialMutationEpoch!=epoch)throw new Superseded();credentialShutdownRequest=-2;stopRequest=ElizaAgentService.reserveCredentialShutdown();credentialShutdownRequest=stopRequest;ElizaAgentService.retryCredentialShutdown(context,stopRequest);}
   long deadline=android.os.SystemClock.elapsedRealtime()+15000;
   while(true){
    synchronized(lifecycleLock){assertOwner.run();if(epoch!=lifecycleEpoch||credentialMutationEpoch!=epoch)throw new Superseded();}
    JSONObject status=ElizaAgentService.getLocalAgentBootState(context);
    synchronized(lifecycleLock){
     assertOwner.run();if(epoch!=lifecycleEpoch||credentialMutationEpoch!=epoch)throw new Superseded();
     if(shutdownConfirmed(status)&&ElizaAgentService.isCredentialShutdownConfirmed(stopRequest)){
      synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){commitAttempted=true;return commitCredentials(mutation);}
     }
    }
    if(android.os.SystemClock.elapsedRealtime()>=deadline)throw new IllegalStateException("Native shutdown unconfirmed");
    Thread.sleep(50);
   }
  }catch(Throwable failure){
   // Only the commit follows commitAttempted. A failure after it may be a written slot or a refusal
   // before any write (a changed or expired credential); both keep the fence until the owner retries.
   commitFailed=commitAttempted;throw failure;
  }finally{
   synchronized(lifecycleLock){
    if(stopRequest>=0){
     if(!commitAttempted)ElizaAgentService.abandonCredentialShutdown(stopRequest);else if(!commitFailed)ElizaAgentService.releaseCredentialShutdown(stopRequest);
     // This request superseded any earlier uncertain one in the lease.
     uncertainCommitRequest=commitFailed?stopRequest:-1;
    }
    if(credentialMutationEpoch==epoch)credentialMutationEpoch=-1;
   }
  }
 }
 /** Every provider and Cloud credential write commits here; the cached listener owner never outlives one. */
 private static <T> T commitCredentials(CredentialMutation<T> mutation)throws Exception{INVOCATION_OWNER.invalidate();try{return mutation.commit();}finally{INVOCATION_OWNER.invalidate();}}
 static boolean providerAdmissionReadable(){return credentialMutationEpoch<0;}
 private void requireCurrent(long epoch) throws Superseded {
  synchronized(lifecycleLock){if(disposed||!accepting||epoch!=lifecycleEpoch)throw new Superseded();}
 }
 private long admittedEpoch() throws Superseded {
  synchronized(lifecycleLock){requireCurrent(lifecycleEpoch);return lifecycleEpoch;}
 }
 private void resolveCurrent(PluginCall call,long epoch,JSObject result) throws Superseded {
  synchronized(lifecycleLock){requireCurrent(epoch);if(pending.remove(call))call.resolve(result);}
 }
 /** A surface that attaches again supersedes its own earlier calls without advancing the epoch, so
  * a queued request must still be this surface's pending call before it pairs or is dispatched. */
 private void requireOwned(PluginCall call,long epoch) throws Superseded {
  synchronized(lifecycleLock){requireCurrent(epoch);if(!pending.contains(call))throw new Superseded();}
 }
 private void rejectSuperseded(PluginCall call){synchronized(lifecycleLock){if(pending.remove(call))call.reject("Local agent connection changed. A dispatched operation may still have completed; inspect its receipt before retrying.","LOCAL_AGENT_EPOCH_CHANGED");}}

 private boolean runtimePackaged() { return runtimePackaged(getContext()); }
 /** True when this build carries the on-device runtime bundle and its launcher. */
 static boolean runtimePackaged(Context context) {
  try {
   try(var ignored=context.getAssets().open("agent/agent-bundle.js")){}
   return new File(context.getApplicationInfo().nativeLibraryDir,"libeliza_bun.so").isFile();
  } catch(Exception unavailable) { return false; }
 }
 /** Hosted inference stays on Qwen through Cerebras; the model is not selectable. */
 static final String CEREBRAS_PROVIDER_MODEL=LocalAgentProviderAdmission.CEREBRAS_PROVIDER_MODEL;
 // Provider slot binding, readback and the Cerebras key check are shared (plugin-native-agent NativeProviderSlot).
 static String providerCheckFailure(int status,String body,String model){return NativeProviderSlot.providerCheckFailure(status,body,model);}
 /** Alpha's encrypted provider slot, as the shared binding sees it. */
 static NativeProviderSlot.Store providerSlot(AlphaCredentialStore store){return new NativeProviderSlot.Store(){
  public String readProvider()throws Exception{return store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);}
  public long authorityEpoch(){return credentialAuthorityEpoch();}
  public void assertCurrent(){store.assertCurrent();}
  public String compareExchangeProvider(String previous,String selection)throws Exception{
   JSONObject next=new JSONObject(selection);
   if(next.optBoolean("unbound")){
    if(!store.compareExchangeCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT,previous,selection))return null;
    return store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);
   }
   if(!"elizacloud".equals(next.optString("provider")))return store.compareExchangeProviderAdmission(previous,selection,null,null,null);
   String cloud=store.readCredentialSlot("cloud:production");
   if(previous!=null&&LocalAgentProviderAdmission.currentGeneration(previous,cloud)!=null
      &&"elizacloud".equals(new JSONObject(previous).optString("provider")))
    return store.compareExchangeProviderAdmission(previous,selection,"cloud:production",cloud,new JSONObject(previous).getJSONObject("verifiedCloudIdentity"));
   if(!store.compareExchangeCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT,previous,selection))return null;
   return store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);
  }
  public void removeProvider(boolean onlyIfPresent)throws Exception{if(onlyIfPresent)store.removeProviderIfPresent();else store.removeCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);}
 };}
 /** Verify before saving: a key is stored only after the check accepts it, then read back. */
 static String saveVerifiedProvider(AlphaCredentialStore store,String key,String model,NativeProviderSlot.KeyCheck check) throws Exception {return NativeProviderSlot.saveVerifiedProvider(providerSlot(store),key,model,check,PRODUCT_NAME);}
 static final String PRODUCT_NAME="Alpha Phone";
 /** Retires the provider binding and confirms by reading it back. */
 static JSObject clearProviderSlot(AlphaCredentialStore store,boolean onlyIfPresent) throws Exception {
  try{return new JSObject(NativeProviderSlot.clearProviderSlot(providerSlot(store),onlyIfPresent).toString());}
  catch(org.json.JSONException impossible){throw new IllegalStateException(impossible);}
 }
 /** Which surface hosts this bridge. Only Alpha's own alpha.assistant flag (set by
  * AlphaAssistActivity after dropping caller extras) is reported; never caller content. */
 @PluginMethod public void launchSurface(PluginCall call) {
  android.app.Activity activity=getActivity();
  boolean assistant=activity instanceof AlphaAssistActivity&&activity.getIntent()!=null&&activity.getIntent().getBooleanExtra(AlphaAssistActivity.EXTRA_ASSISTANT,false);
  call.resolve(new JSObject().put("assistant",assistant));
 }
 /** How this assistant surface was opened: "listener" (the image's always-on listener, see
  * ai.eliza.plugins.system.SenseInvocation) for the first read of a listener launch, then "assist".
  * `locked` reports whether the keyguard is showing now; {@link #keyguard} reads that alone. */
 @PluginMethod public void takeInvocation(PluginCall call) {
  android.app.Activity activity=getActivity();
  boolean assistant=activity instanceof AlphaAssistActivity&&activity.getIntent()!=null&&activity.getIntent().getBooleanExtra(AlphaAssistActivity.EXTRA_ASSISTANT,false);
  String invocation=assistant?((AlphaAssistActivity)activity).takeInvocation():null;
  // The renderer never opens the microphone behind the keyguard; unknown keyguard state counts as locked.
  boolean locked=keyguardShown();
  call.resolve(new JSObject().put("assistant",invocation!=null).put("invocation",invocation).put("locked",locked));
 }
 /** Read-only: checks the stored Cloud admission and the current runtime independently. A matching
  * admission stays valid while the watchdog starts the process and owner enrollment is renewed. */
 @PluginMethod public void residentAttachment(PluginCall call) {
  final String credentialId=call.getString("credentialId");
  PluginWorkers.submit(workers,()->{try{
   JSONObject bootState=ElizaAgentService.getLocalAgentBootState(getContext());
   synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
    AlphaCredentialStore store=new AlphaCredentialStore(getContext());
    String saved=store.readCredentialSlot("local-agent-provider:v1"),refusal=null;
    if(credentialId!=null){
     try{
      JSONObject provider=new JSONObject(saved);
      if(!"elizacloud".equals(provider.optString("provider"))||!credentialId.equals(provider.optString("credentialId"))||!CLOUD_PROVIDER_MODEL.equals(provider.optString("model")))refusal="provider-changed";
     }catch(Exception unreadable){refusal="provider-unadmitted";}
    }
    boolean bindingRetained=false;
    if(refusal==null){
     String generation=storedProviderGeneration(store);
     refusal=attachRefusalLocked(bootState,ElizaAgentService.localAgentToken(),generation);
     if(credentialId!=null&&generation!=null){
      String phase=bootState.optString("state");
      boolean booting="runtime-not-running".equals(refusal)&&("restarting".equals(phase)||"booting".equals(phase));
      boolean enrolling="not-enrolled".equals(refusal)||"runtime-changed".equals(refusal)||"enrollment-expiring".equals(refusal);
      bindingRetained=(booting&&(launchedGeneration==null||generation.equals(launchedGeneration)))||
        (enrolling&&generation.equals(launchedGeneration));
     }
    }
    JSObject result=new JSObject(ResidentAttachment.describe(refusal).toString());
    if(credentialId!=null&&(refusal==null||bindingRetained))result.put("bindingGuard",store.providerBindingGuard(saved));
    if(bindingRetained)result.put("bindingRetained",true);
    call.resolve(result);
   }}
  }catch(Exception unavailable){call.resolve(new JSObject().put("attachable",false).put("reason","unavailable"));}},()->{call.reject("Local agent bridge is closed.");});
 }
 /** The owner's Settings switches for agent Gmail changes and Calendar edits. Off never disconnects Google;
  * the on-device Google host refuses agent writes unless this file says on. */
 @PluginMethod public void setGoogleAgentAccess(PluginCall call){
  final Boolean gmailChanges=call.getBoolean("gmailChanges"),calendarEdits=call.getBoolean("calendarEdits");
  if(gmailChanges==null||calendarEdits==null){call.reject("Invalid Google access.");return;}
  PluginWorkers.submit(workers,()->{
   try{GoogleAgentAccessFile.write(GoogleAgentAccessFile.in(getContext().getFilesDir()),gmailChanges,calendarEdits);call.resolve();}
   catch(Exception unavailable){call.reject("Google access could not be saved.");}
  },()->{call.reject("Local agent bridge is closed.");});
 }
 /** Owner-selected direct provider configuration; shared admission owns validation and secure CAS. */
 @PluginMethod public void configureProvider(PluginCall call) {
  try{requireProviderOwner(true);}catch(Exception unavailable){call.reject("Open unlocked Settings to manage provider keys.");return;}
  final long surface=providerSurfaceGeneration;
  if(!runtimePackaged()){call.reject("On-device agent is unavailable in this version.");return;}
  String key=call.getString("apiKey",""),model=call.getString("model",CEREBRAS_PROVIDER_MODEL);
  String cartesia=call.getString("cartesiaKey",null);
  if(cartesia!=null&&!validProviderToken(cartesia,1024)){call.reject("Enter a valid Voice key or leave it unchanged.");return;}
  if(!validProviderToken(key,1024)||!model.matches("[A-Za-z0-9][A-Za-z0-9._/-]{0,127}")){call.reject("Enter a valid Cerebras key.");return;}
  if(!CEREBRAS_PROVIDER_MODEL.equals(model)){call.reject(PRODUCT_NAME+" uses "+CEREBRAS_PROVIDER_MODEL+" on Cerebras.");return;}
  final String requestId=call.getString("requestId","");final long configuration;
  try{synchronized(lifecycleLock){if(disposed)throw new IllegalStateException("Local agent bridge closed");configuration=providerConfigurations.begin(requestId);}}catch(Exception unavailable){call.reject("Provider request was cancelled or is unavailable.");return;}
  PluginWorkers.submit(workers,()->{try{
   AlphaCredentialStore store=new AlphaCredentialStore(getContext(),()->{requireProviderOwner(false);if(surface!=providerSurfaceGeneration)throw new SecurityException("Settings closed");providerConfigurations.require(requestId,configuration);});
   store.assertCurrent();
   String failure=NativeProviderSlot.saveVerifiedProvider(providerSlot(store),key,model,cartesia,NativeProviderSlot::checkCerebrasKey,PRODUCT_NAME);
   if(failure!=null){call.reject(failure);return;}
   store.assertCurrent();call.resolve(providerManagementStatus(store));
  }catch(Exception error){call.reject("Provider could not be saved securely.");}finally{providerConfigurations.finish(requestId,configuration);}},()->{providerConfigurations.finish(requestId,configuration);call.reject("Local agent bridge is closed.");});
 }
 /** Reserve a native-issued lease before receiving any provider keys or removal request. */
 @PluginMethod public void prepareProviderConfiguration(PluginCall call){
  try{synchronized(lifecycleLock){requireProviderOwner(true);call.resolve(new JSObject().put("requestId",providerConfigurations.reserve()));}}
  catch(Exception unavailable){call.reject("Provider setup is busy. Try again shortly.");}
 }
 /** Cancels only this request's still-current credential intent; no store write or runtime stop. */
 @PluginMethod public void cancelProviderConfiguration(PluginCall call){
  try{String requestId=call.getString("requestId","");synchronized(lifecycleLock){if(disposed)throw new IllegalStateException("Local agent bridge closed");providerConfigurations.cancel(requestId);if(requestId.equals(providerRevealRequestId))closeProviderReveal();}call.resolve();}
  catch(Exception invalid){call.reject("Invalid provider cancellation request.");}
 }
 /** Retires routing and reads it back; saved Own keys remain in encrypted custody. */
 @PluginMethod public void clearProvider(PluginCall call) {
  final boolean onlyIfPresent=Boolean.TRUE.equals(call.getBoolean("onlyIfPresent"));
  final String requestId=call.getString("requestId",null);final long configuration;
  try{synchronized(lifecycleLock){if(disposed)throw new IllegalStateException("Local agent bridge closed");configuration=requestId==null?reserveCredentialIntent():providerConfigurations.begin(requestId);}}catch(Exception cancelled){call.reject("Provider change was cancelled or is unavailable.");return;}
  PluginWorkers.submit(workers,()->{try{
   call.resolve(clearProviderSlot(new AlphaCredentialStore(getContext(),()->{if(disposed)throw new IllegalStateException("Local agent bridge closed");if(requestId==null)requireCredentialIntent(configuration);else providerConfigurations.require(requestId,configuration);}),onlyIfPresent));
  }catch(Exception error){call.reject("The provider binding could not be cleared.");}finally{if(requestId!=null)providerConfigurations.finish(requestId,configuration);}},()->{if(requestId!=null)providerConfigurations.finish(requestId,configuration);call.reject("Local agent bridge is closed.");});
 }
 static final String CLOUD_PROVIDER_MODEL=LocalAgentProviderAdmission.CLOUD_PROVIDER_MODEL;
 /** Binds an existing account credential; no bearer value crosses this method's renderer API. */
 @PluginMethod public void configureCloudProvider(PluginCall call) {
  if(!runtimePackaged()){call.reject("On-device agent is unavailable in this version.");return;}
  String credentialId=call.getString("credentialId",""),model=call.getString("model","");
  if(!CLOUD_PROVIDER_MODEL.equals(model)){call.reject("Choose a supported Cloud model.");return;}
  final long configuration;
  synchronized(lifecycleLock){if(disposed){call.reject("Local agent bridge is closed.");return;}configuration=reserveCredentialIntent();}
  PluginWorkers.submit(workers,()->{try{
   AlphaCredentialStore store=new AlphaCredentialStore(getContext(),()->{if(disposed)throw new IllegalStateException("Local agent bridge closed");requireCredentialIntent(configuration);});
   String applied=bindCloudProvider(store,credentialId,model);store.assertCurrent();
   call.resolve(new JSObject().put("configured",true).put("bindingGuard",store.providerBindingGuard(applied)));
  }catch(Exception unavailable){
   String code="NATIVE_CLOUD_ADMISSION_UNAVAILABLE";JSObject data=null;
   if(unavailable instanceof LocalAgentProviderAdmission.CloudBindingFailure){LocalAgentProviderAdmission.CloudBindingFailure failure=(LocalAgentProviderAdmission.CloudBindingFailure)unavailable;code="NATIVE_CLOUD_ADMISSION_"+failure.stage.toUpperCase(java.util.Locale.ROOT).replace('-','_');android.util.Log.w("AlphaCloudAdmission",failure.diagnostic.toString());
    // The renderer tells a transient identity read (0 = transport, 408, 429, 5xx) from a refused key.
    if("identity-read".equals(failure.stage))data=new JSObject().put("stage","identity-read").put("httpStatus",failure.diagnostic.optInt("httpStatus",0));}
   if(data!=null)call.reject("Cloud account changed or is unavailable. Sign in again before starting the local agent.",code,data);
   else call.reject("Cloud account changed or is unavailable. Sign in again before starting the local agent.",code);
  }},()->{call.reject("Local agent bridge is closed.");});
 }
 /** Preserve the previous selection when admission loses its account, without replacing a newer selection. */
 static String bindCloudProvider(AlphaCredentialStore store,String credentialId,String model) throws Exception {
  return bindCloudProvider(store,credentialId,model,false,null);
 }
 static String bindCloudProvider(AlphaCredentialStore store,String credentialId,String model,boolean selectCloud,String expectedPrevious) throws Exception {
  return LocalAgentProviderAdmission.bindCloudProvider(new LocalAgentProviderAdmission.CloudBindingStore(){
   public String readProvider()throws Exception{return store.readCredentialSlot("local-agent-provider:v1");}
   public String readCloud()throws Exception{return store.readCredentialSlot("cloud:production");}
   public void assertCurrent()throws Exception{store.assertCurrent();}
   public JSONObject identity(String token)throws Exception{return AlphaConnectionPlugin.readCloudIdentity(token);}
   public String admit(String previous,String selection,String cloud,JSONObject identity)throws Exception{
    if(selectCloud&&!java.util.Objects.equals(expectedPrevious,previous))throw new SecurityException("Provider changed");
    if(!selectCloud&&previous!=null&&"cerebras".equals(new JSONObject(previous).optString("provider"))){
     String services=LocalAgentProviderAdmission.admit(null,selection,cloud,identity);
     selection=new JSONObject(LocalAgentProviderAdmission.withoutAdmission(previous)).put("cloudServices",NativeProviderSlot.cloudServices(new JSONObject(services))).toString();
    }
    if(new JSONObject(selection).optBoolean("unbound")){
     if(!store.compareExchangeCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT,previous,selection))return null;
     return store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);
    }
    return store.compareExchangeProviderAdmission(previous,selection,"cloud:production",cloud,identity);
   }
   public void rollback(String binding,String previous)throws Exception{store.rollbackProviderAdmission(binding,previous);}
  },credentialId,model,System::currentTimeMillis);
 }
 // The provider rules live in LocalAgentProviderAdmission (host-JVM tested); these names stay for callers.
 static boolean validProviderToken(String token,int maximumLength){return LocalAgentProviderAdmission.validProviderToken(token,maximumLength);}
 static void applyProviderEnvironment(JSONObject provider,String cloudSaved,java.util.Map<String,String> env,long now) throws Exception {LocalAgentProviderAdmission.applyProviderEnvironment(provider,cloudSaved,env,now);}
 static JSObject providerIdentity(String saved) {
  try{return new JSObject(LocalAgentProviderAdmission.providerIdentity(saved).toString());}
  catch(org.json.JSONException impossible){throw new IllegalStateException(impossible);}
 }
 private static JSObject providerManagementStatus(AlphaCredentialStore store)throws Exception{
  return withCredentialRead(()->new JSObject(NativeProviderSlot.managementStatus(
   store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT),store.readCredentialSlot("cloud:production"),
   System.currentTimeMillis(),credentialAuthorityEpoch()).toString()));
 }
 @PluginMethod public void providerStatus(PluginCall call) {
  PluginWorkers.submit(workers,()->{
   try{if(disposed)throw new IllegalStateException();call.resolve(providerManagementStatus(new AlphaCredentialStore(getContext())));}
   catch(Exception unavailable){call.reject("Provider status unavailable.");}
  },()->call.reject("Local agent bridge is closed."));
 }
 /** Only the resumed owner app can manage secrets; the lock-screen assistant is not this surface. */
 private void requireProviderOwner(boolean requireFocus){
  android.app.Activity activity=getActivity();
  android.app.KeyguardManager keyguard=getContext().getSystemService(android.app.KeyguardManager.class);
  android.os.UserManager user=getContext().getSystemService(android.os.UserManager.class);
  if(disposed||!(activity instanceof MainActivity)||((MainActivity)activity).isAssistantSurface()||activity.isFinishing()||activity.isDestroyed()
    ||!getActivity().getLifecycle().getCurrentState().isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)
    ||requireFocus&&!activity.hasWindowFocus()||keyguard==null||keyguard.isKeyguardLocked()||keyguard.isDeviceLocked()
    ||user==null||!user.isUserUnlocked())throw new SecurityException("Open unlocked Settings to manage provider keys");
 }
 private void closeProviderReveal(){
  AutoCloseable held=providerReveal;providerReveal=null;providerRevealRequestId=null;
  if(held!=null)try{held.close();}catch(Exception ignored){/* Native surface handle only. */}
 }
 private interface ProviderChange {void apply(AlphaCredentialStore store)throws Exception;}
 private void changeProvider(PluginCall call,ProviderChange change){
  final String requestId=call.getString("requestId","");final long intent,surface=providerSurfaceGeneration;
  try{requireProviderOwner(true);intent=providerConfigurations.begin(requestId);}
  catch(Exception refused){call.reject("Provider request expired. Reopen Settings and try again.");return;}
  PluginWorkers.submit(workers,()->{try{
   AlphaCredentialStore store=new AlphaCredentialStore(getContext(),()->{
    requireProviderOwner(false);if(surface!=providerSurfaceGeneration)throw new SecurityException("Settings closed");
    providerConfigurations.require(requestId,intent);
   });
   store.assertCurrent();change.apply(store);store.assertCurrent();call.resolve(providerManagementStatus(store));
  }catch(Exception unavailable){call.reject("Provider change could not be confirmed. Reload Settings.");}
  finally{providerConfigurations.finish(requestId,intent);}},()->{providerConfigurations.finish(requestId,intent);call.reject("Local agent bridge is closed.");});
 }
 @PluginMethod public void selectProvider(PluginCall call){
  String mode=call.getString("mode","");
  if(!"cloud".equals(mode)&&!"own".equals(mode)){call.reject("Choose Cloud or Own keys.");return;}
  if(!runtimePackaged()){call.reject("On-device agent is unavailable in this version.");return;}
  changeProvider(call,store->{
   String previous=NativeProviderSlot.requireManagementRevision(providerSlot(store),call.getString("expectedRevision"));
   if("own".equals(mode))NativeProviderSlot.selectOwn(providerSlot(store),call.getString("expectedRevision"));
   else{
    String cloud=store.readCredentialSlot("cloud:production");
    String credentialId=new JSONObject(cloud).getString("credentialId");
    bindCloudProvider(store,credentialId,CLOUD_PROVIDER_MODEL,true,previous);
   }
  });
 }
 @PluginMethod public void removeProviderKey(PluginCall call){
  changeProvider(call,store->NativeProviderSlot.removeKey(providerSlot(store),call.getString("expectedRevision"),call.getString("key")));
 }
 /** Reveal stays in the canonical FLAG_SECURE native surface, never in bridge/model output. */
 @PluginMethod public void revealProviderKey(PluginCall call){
  final String requestId=call.getString("requestId",""),expected=call.getString("expectedRevision"),key=call.getString("key");
  final long intent,surface=providerSurfaceGeneration;
  try{requireProviderOwner(true);intent=providerConfigurations.begin(requestId);}
  catch(Exception refused){call.reject("Provider reveal expired. Reopen Settings and try again.");return;}
  PluginWorkers.submit(workers,()->{try{
   AlphaCredentialStore store=new AlphaCredentialStore(getContext(),()->{
    requireProviderOwner(false);if(surface!=providerSurfaceGeneration)throw new SecurityException("Settings closed");providerConfigurations.require(requestId,intent);
   });
   String value=withCredentialRead(()->NativeProviderSlot.revealKey(providerSlot(store),expected,key));
   getActivity().runOnUiThread(()->{try{
    requireProviderOwner(true);store.assertCurrent();
    withCredentialRead(()->{NativeProviderSlot.requireManagementRevision(providerSlot(store),expected);return null;});
    closeProviderReveal();
    final long revealAuthority=credentialAuthorityEpoch();
    providerRevealRequestId=requestId;
    providerReveal=SecretSurfaces.revealOwned(getActivity(),"text".equals(key)?"Text key":"Voice key",value,()->{
     try{requireProviderOwner(false);requireCredentialIntent(intent);return surface==providerSurfaceGeneration&&revealAuthority==credentialAuthorityEpoch();}
     catch(Exception retired){return false;}
    });
    call.resolve(new JSObject().put("key",key).put("shown",true).put("hidesAfterMs",30000).put("revision",expected));
   }catch(Exception retired){call.reject("Provider reveal is unavailable. Reopen Settings.");}
   finally{providerConfigurations.finish(requestId,intent);}});
  }catch(Exception unavailable){providerConfigurations.finish(requestId,intent);call.reject("Provider reveal is unavailable. Reopen Settings.");}
  },()->{providerConfigurations.finish(requestId,intent);call.reject("Local agent bridge is closed.");});
 }
 @Override protected void handleOnPause(){providerSurfaceGeneration++;closeProviderReveal();super.handleOnPause();}
 static void configureNativeViews(java.io.InputStream policy,java.util.Map<String,String> env) throws java.io.IOException {
  try(policy){
   java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream();
   byte[] buffer=new byte[4096];int count;
   while((count=policy.read(buffer))!=-1){
    if(output.size()+count>16384)throw new java.io.IOException("Native view launch policy is too large");
    output.write(buffer,0,count);
   }
   env.put("ELIZA_NATIVE_VIEW_DECLARATIONS",output.toString(java.nio.charset.StandardCharsets.UTF_8.name()));
   // The agent's own BROWSER tool is offered only what Alpha's mounted Browser runs for it: back,
   // forward and reload. The reviewed way to do the same from chat is the browser_history device
   // action (browser.history.v1). The list cannot be emptied yet: the pinned plugin registers
   // the tool even with no commands.
   env.put("ELIZA_NATIVE_BROWSER_COMMANDS","back,forward,reload");
  }
 }
 /** The upstream agent service's launch hook (ElizaAgentService.configureLaunch): the variables Alpha adds to each launch. */
 static void configureLaunch(Context context,java.util.Map<String,String> env) throws java.io.IOException {
  env.put("ELIZA_RUNTIME_PROFILE",BuildConfig.ELIZA_RUNTIME_PROFILE);
  if(AlphaImageCapability.verified(context))env.put("ELIZA_MOBILE_SMS_REPLY_DRAFT","1");
  else env.remove("ELIZA_MOBILE_SMS_REPLY_DRAFT");
  final long epoch;
  synchronized(lifecycleLock){launchedGeneration=null;if(!accepting||stopping||credentialMutationEpoch>=0)throw new java.io.IOException("Local provider is retiring");epoch=lifecycleEpoch;}
  // Phone, Messages and Contacts are destinations only where Alpha draws them: its verified image.
  configureNativeViews(context.getAssets().open(AlphaImageCapability.verified(context)?"agent/image-native-view-declarations.json":"agent/native-view-declarations.json"),env);
  for(String key:new String[]{"ELIZA_NATIVE_GOOGLE_HOST_MODULE","ELIZA_NATIVE_GOOGLE_BINDING_JSON","ELIZA_NATIVE_GOOGLE_API_KEY","ELIZA_MANAGED_GMAIL_READ_BROKER","ELIZA_MANAGED_GMAIL_SEND_BROKER","ELIZA_MANAGED_GMAIL_OPERATION_BROKER","ELIZA_MANAGED_CALENDAR_READ_BROKER","ELIZA_MANAGED_CALENDAR_DELETE_ENABLED","ELIZA_NATIVE_GOOGLE_GMAIL_SEND_ENABLED","ELIZA_MANAGED_GMAIL_MAILBOX_CHANGES_ENABLED"})env.remove(key);
  env.remove("ELIZA_MOBILE_WORKFLOWS");
  AlphaInferenceHost.configure(context,env);
  WorkflowBridgeHost.configure(context,env);
  java.io.File nativeHostResources=null;
  java.io.InputStream workerIndex=null;
  try {workerIndex=context.getAssets().open("agent/workflow-worker/files.sha256");}
  catch(java.io.FileNotFoundException absent) { /* Older payloads do not contain a workflow worker. */ }
  if(workerIndex!=null){
   String root=env.get("AGENT_ROOT");if(root==null){workerIndex.close();throw new java.io.IOException("Agent resource directory unavailable");}
   String packageStamp;
   try{packageStamp=BuildConfig.VERSION_CODE+"/"+context.getPackageManager().getPackageInfo(context.getPackageName(),0).lastUpdateTime;}
   catch(android.content.pm.PackageManager.NameNotFoundException unknown){packageStamp=null;}
   java.io.File worker=WorkflowWorkerAssets.install(new java.io.File(root),workerIndex,path->context.getAssets().open("agent/workflow-worker/"+path),packageStamp);
   WorkflowWorkerAssets.configureEnvironment(worker,env);
   nativeHostResources=worker;
  }
  // The packaged product declaration is credential-independent. Its parent was
  // authenticated by WorkflowWorkerAssets.install, including every indexed hash.
  java.io.File google=nativeHostResources==null?null:new java.io.File(nativeHostResources,"google-host.mjs");
  if(google!=null&&google.isFile())env.put("ELIZA_NATIVE_GOOGLE_HOST_MODULE",google.getCanonicalPath());
  // The owner's Gmail changes / Calendar edits switches (setGoogleAgentAccess), read before every agent write.
  env.put("ALPHA_GOOGLE_AGENT_ACCESS_FILE",GoogleAgentAccessFile.in(context.getFilesDir()).getAbsolutePath());
  try {
  // Decision P-43: the resident always runs. With no provider slot it launches with no hosted
  // provider environment; upstream then reports no_provider for each turn.
  // An unreadable or malformed provider slot (or Cloud credential) never blocks the resident: it
  // launches unbound, exactly as for a provider that cannot be applied below.
  String saved=null,cloudSaved=null;JSONObject provider=null;
  try{
   saved=new AlphaCredentialStore(context).readCredentialSlot("local-agent-provider:v1");
   provider=saved==null?null:new JSONObject(saved);
   cloudSaved=provider!=null&&("elizacloud".equals(provider.optString("provider"))||provider.has("cloudServices"))?new AlphaCredentialStore(context).readCredentialSlot("cloud:production"):null;
  }catch(Exception unreadable){saved=null;provider=null;cloudSaved=null;}
  // The Cloud Google binding is decided before the shared launch: a stripped, legacy or changed
  // admission is not a lifecycle race, so the resident launches unbound instead (P-43).
  java.util.Map<String,String> googleBinding=null;
  if(provider!=null&&("elizacloud".equals(provider.optString("provider"))||provider.has("cloudServices"))){
   if(google==null||!google.isFile())throw new java.io.IOException("Native Cloud routing module unavailable");
   try{
    googleBinding=new java.util.HashMap<>();
    JSONObject binding=LocalAgentProviderAdmission.applyManagedGoogleEnvironment(saved,cloudSaved,googleBinding,System.currentTimeMillis());
    if(binding!=null){
    JSONObject current=new AlphaCredentialStore(context).providerAdmissionSnapshot();
    if(!binding.getString("accountRef").equals(current.getString("accountRef"))||!binding.getString("sessionGeneration").equals(current.getString("sessionGeneration"))||!LocalAgentProviderAdmission.sameCloudCredential(cloudSaved,new AlphaCredentialStore(context).readCredentialSlot("cloud:production")))throw new SecurityException("Native Google provider changed");
    googleBinding.put("ELIZA_NATIVE_GOOGLE_BINDING_JSON",binding.toString());
    }
   }catch(Exception unbindable){
    android.util.Log.w("AlphaLocalAgent","provider-unbound "+unbindable.getClass().getSimpleName());
    googleBinding=null;provider=null;saved=null;cloudSaved=null;
   }
  }
  // Shared provider admission and native embedding order. Keep the verified
  // product module independently of credential availability for Alpha identity.
  if(!NativeProviderSlot.applyLaunchEnvironment(BuildConfig.ELIZA_RUNTIME_PROFILE,provider,cloudSaved,new File(context.getApplicationInfo().nativeLibraryDir),context.getFilesDir(),env,System.currentTimeMillis())){provider=null;saved=null;cloudSaved=null;googleBinding=null;}
  // The text model and its credential come from android/agent/host.json and the launch frame
  // (upstream spec/os/agentService/config.md), never from these variables: the agent reads none of
  // them, and the service writes the launch document, environment included, to a file (A2-005, E2-004).
  for(String retired:LAUNCH_MODEL_ENVIRONMENT)env.remove(retired);
  if(google!=null&&google.isFile())env.put("ELIZA_NATIVE_GOOGLE_HOST_MODULE",google.getCanonicalPath());
  if(googleBinding!=null)env.putAll(googleBinding);
  // The agent process has no /etc/localtime on Android and would run in UTC; calendar dates and
  // "tomorrow at 3pm" resolve in the process zone when no owner resolver is registered.
  env.put("TZ",java.util.TimeZone.getDefault().getID());
  env.put("ELIZA_DISTRIBUTION_PROFILE","store");
  // A packaged app has no repository character file to discover above its workspace.
  env.put("ELIZA_DISABLE_LOCAL_CHARACTER","1");
  // Pseudonymize secrets and PII using the pinned upstream runtime.
  env.put("ELIZA_SECRET_SWAP_ENABLED","true");
  env.put("ELIZA_PII_SWAP_ENABLED","true");
  // The pinned runtime keeps a contact's or credential's reference stable within a conversation,
  // sends no output cap on any call, and on an own Cerebras key holds a refused model for at most
  // 4 s, before its 5 s re-send. None of these needs a launch setting.
  java.util.function.Function<JSONObject,java.util.Map<String,String>> fixture=instrumentationLaunchEnvironment;
  if(fixture!=null){
   if(!BuildConfig.DEBUG||android.os.Process.myUid()/100000<=0)throw new java.io.IOException("Invalid instrumentation launch environment");
   java.util.Map<String,String> changes=fixture.apply(provider);
   for(java.util.Map.Entry<String,String> change:changes.entrySet()){
    String key=change.getKey(),value=change.getValue();
    if(!INSTRUMENTATION_LAUNCH_KEYS.contains(key)||value==null||key.endsWith("_BASE_URL")&&!value.matches("http://127\\.0\\.0\\.1:[1-9][0-9]{0,4}/v1"))
     throw new java.io.IOException("Invalid instrumentation launch environment");
   }
   env.putAll(changes);
  }
  // Later surfaces attach only while the stored admission is the one this process launched with.
  synchronized(lifecycleLock){if(epoch!=lifecycleEpoch||!accepting||stopping||credentialMutationEpoch>=0)throw new java.io.IOException("Local provider changed");launchedGeneration=LocalAgentProviderAdmission.launchGeneration(saved,cloudSaved);}
  } catch(Exception error) {throw new java.io.IOException("Local model provider unavailable");}
 }
 /** Explicit Retry reissues strict teardown; an old failed acknowledgment never grants start. */
 private boolean retryCredentialShutdown(PluginCall call,String requestId) {
  final long retryEpoch,retryIntent;
  synchronized(lifecycleLock){
   if(credentialShutdownRetryEpoch>=0){call.reject("Provider shutdown is already being checked; wait before retrying.");return true;}
   if(!shutdownRetryRequired())return false;
   if(disposed||getActivity()==null||!getActivity().hasWindowFocus()){call.reject("Return to the app before retrying provider shutdown.");return true;}
   if(credentialMutationEpoch>=0){call.reject("Provider shutdown is already being checked; wait before retrying.");return true;}
   if(requestId!=null&&cancelledStarts.remove(requestId)){call.reject("Local startup cancelled");return true;}
   retryIntent=credentialIntents.current();invalidateCalls();retryEpoch=++lifecycleEpoch;credentialShutdownRetryEpoch=retryEpoch;
   accepting=false;stopping=true;clearEnrollment();pending.add(call);
   startRequestId=requestId;startRequestEpoch=retryEpoch;startOwnsLaunch=false;
  }
  PluginWorkers.submit(workers,()->{
   try{
    final long stopRequest;
    synchronized(lifecycleLock){
     requireShutdownRetry(call,retryEpoch,retryIntent);
     stopRequest=reissueCredentialShutdownLocked();
    }
    ResidentCredentialShutdownRetry.await(
     ()->{synchronized(lifecycleLock){requireShutdownRetry(call,retryEpoch,retryIntent);}},
     ()->ElizaAgentService.isCredentialShutdownConfirmed(stopRequest),
     ()->shutdownConfirmed(ElizaAgentService.getLocalAgentBootState(getContext())),
     android.os.SystemClock::elapsedRealtime,Thread::sleep,15000);
    synchronized(lifecycleLock){
     requireShutdownRetry(call,retryEpoch,retryIntent);
     if(credentialShutdownRequest!=stopRequest||!ElizaAgentService.isCredentialShutdownConfirmed(stopRequest))throw new Superseded();
     // The new confirmed stop superseded an uncertain commit's request in the lease.
     credentialShutdownRequest=-1;uncertainCommitRequest=-1;credentialShutdownRetryEpoch=-1;stopping=false;accepting=true;pending.remove(call);
    }
    // Exact continuation epoch rejects cancellation/account changes between acknowledgment and start.
    startAfterShutdown(call,retryEpoch,retryIntent);
   }catch(Exception unconfirmed){
    if(unconfirmed instanceof InterruptedException)Thread.currentThread().interrupt();
    synchronized(lifecycleLock){
     if(credentialShutdownRetryEpoch==retryEpoch)credentialShutdownRetryEpoch=-1;
     if(pending.remove(call))call.reject("Provider shutdown is unconfirmed; check the local agent before starting.");
    }
   }
  },()->{synchronized(lifecycleLock){if(credentialShutdownRetryEpoch==retryEpoch)credentialShutdownRetryEpoch=-1;if(pending.remove(call))call.reject("Local agent bridge is closed.");}});
  return true;
 }
 /** Caller holds lifecycleLock. An ordinary refused stop also latches stopping, without a credential
  * request; an uncertain commit leaves its stop fenced. Only a new Start/Retry request enters the
  * strict owner/absence recheck. */
 static boolean shutdownRetryRequired(){
  if(uncertainCommitRequest>=0)return true;
  return !((credentialShutdownRequest==-1&&!stopping)||(credentialShutdownRequest>=0&&ElizaAgentService.isCredentialShutdownConfirmed(credentialShutdownRequest)));
 }
 /** Caller holds lifecycleLock. Sends a fresh strict stop for a retained credential shutdown.
  * Retain the exact request even if Android dispatch throws. It commits nothing; abandonment
  * keeps starts fenced until this request's actual stop ACK. */
 private long reissueCredentialShutdownLocked() {
  credentialShutdownRequest=-2;
  final long stopRequest=ElizaAgentService.reserveCredentialShutdown();
  credentialShutdownRequest=stopRequest;
  try{ElizaAgentService.retryCredentialShutdown(getContext(),stopRequest);}
  finally{ElizaAgentService.abandonCredentialShutdown(stopRequest);}
  return stopRequest;
 }
 /** Caller holds lifecycleLock. Never lets focus loss or another intent authorize this retry. */
 private void requireShutdownRetry(PluginCall call,long epoch,long intent)throws Superseded {
  if(disposed||!credentialIntents.isCurrent(intent)||epoch!=lifecycleEpoch||credentialShutdownRetryEpoch!=epoch||credentialMutationEpoch>=0||!pending.contains(call)
    ||getActivity()==null||!getActivity().hasWindowFocus())throw new Superseded();
 }
 private void startAfterShutdown(PluginCall call,long continuationEpoch,long continuationIntent) {
  String requestId=call.getString("requestId");
  if(requestId!=null&&!requestId.matches("[a-f0-9-]{36}")){call.reject("Invalid startup request");return;}
  try {
   ai.alphacompute.alphaphone.runtime.RuntimeUpdatePause.beforeStart();
   if(!runtimePackaged()){call.reject("On-device agent is unavailable in this version.");return;}
   // No provider is required: without an admitted Eliza Cloud plan the agent runs unbound.
   final AlphaCredentialStore providerStore=new AlphaCredentialStore(getContext());
   // Hosted inference is distinct from an on-device language-model payload.
   getContext().getSharedPreferences("CapacitorStorage",Context.MODE_PRIVATE).edit().putString("eliza:mobile-runtime-mode","cloud-hybrid").apply();
   final long epoch;
   long admitted=-1;
   boolean attached=false;
   for(int attempt=0;attempt<3;attempt++){
    final long observedEpoch;
    synchronized(lifecycleLock){
     if(continuationEpoch>=0&&(continuationEpoch!=lifecycleEpoch||!credentialIntents.isCurrent(continuationIntent))){call.reject("Local agent connection changed; retry from the app.");return;}
     if(continuationEpoch>=0&&(disposed||getActivity()==null||!getActivity().hasWindowFocus())){call.reject("Return to the app before starting.");return;}
     if(requestId!=null&&cancelledStarts.remove(requestId)){call.reject("Local startup cancelled");return;}
     if(cancelledStarts.size()>=128){call.reject("Startup cancellation capacity reached; reopen the app.");return;}
     observedEpoch=lifecycleEpoch;
    }
    JSONObject nativeState=ElizaAgentService.getLocalAgentBootState(getContext());
    // Read-only observations for attach admission; a concurrent lifecycle change retries the loop.
    String currentGeneration=storedProviderGeneration(providerStore),currentRoot=ElizaAgentService.localAgentToken();
    synchronized(lifecycleLock){
     if(requestId!=null&&cancelledStarts.remove(requestId)){call.reject("Local startup cancelled");return;}
     if(observedEpoch!=lifecycleEpoch||continuationEpoch>=0&&!credentialIntents.isCurrent(continuationIntent)){if(continuationEpoch>=0){call.reject("Local agent connection changed; retry from the app.");return;}continue;}
     if(continuationEpoch>=0&&(getActivity()==null||!getActivity().hasWindowFocus())){call.reject("Return to the app before starting.");return;}
     ai.alphacompute.alphaphone.runtime.RuntimeUpdatePause.beforeStart();
     if(disposed){call.reject("Local agent bridge is closed.");return;}
     if(credentialMutationEpoch>=0){call.reject("Local provider is changing; wait before starting.");return;}
     if(credentialShutdownRequest!=-1&&(credentialShutdownRequest<0||!ElizaAgentService.isCredentialShutdownConfirmed(credentialShutdownRequest))){call.reject("Provider shutdown is unconfirmed; check the local agent before starting.");return;}
     if(stopping&&shutdownConfirmed(nativeState))stopping=false;
     if(stopping){call.reject("Local agent is stopping; wait for stopped status before starting.");return;}
     // An admitted running resident is attached to, never restarted: another surface's work,
     // the runtime epoch, the owner enrollment and the launch owner all stay as they are.
     if(attachLocked(nativeState,currentRoot,currentGeneration)==null){admitted=lifecycleEpoch;attached=true;attachedStarts.add(requestId);pending.add(call);break;}
     // An admitted supervisor already owns this launch. A new renderer epoch here would
     // also invalidate the provider environment that the service is preparing.
     if(accepting&&credentialShutdownRequest==-1&&supervisedStartupPending(nativeState)){
      call.reject("Alpha is getting ready.","start-failed");return;
     }
     attachUnverified=false;
     invalidateCalls();admitted=++lifecycleEpoch;credentialShutdownRequest=-1;accepting=true;clearEnrollment();pending.add(call);
     startRequestId=requestId;startRequestEpoch=admitted;startOwnsLaunch=shutdownConfirmed(nativeState);
     ElizaAgentService.start(getContext());break;
    }
   }
   if(admitted<0){call.reject("Local agent connection changed; check status before starting again.");return;}
   epoch=admitted;
   if(attached){
    PluginWorkers.submit(workers,()->{
     ResidentAttachDiagnostic diagnostic=new ResidentAttachDiagnostic();
     try{
      String root=ElizaAgentService.localAgentToken();if(root==null||root.isEmpty())throw new RuntimeRootChanged();
      diagnostic.stage=ResidentAttachDiagnostic.Stage.STATUS;
      authenticatedStatus(epoch,root,diagnostic::response);
      diagnostic.stage=ResidentAttachDiagnostic.Stage.ENROLLMENT;
      // Attach never pairs: the enrollment it was admitted against must still be the current one.
      synchronized(lifecycleLock){requireEnrollmentRoot(epoch,root);if(!root.equals(rootToken)||ownerToken==null)throw new RuntimeRootChanged();}
      resolveCurrent(call,epoch,new JSObject().put("state","ready").put("attached",true));
     }
     catch(Superseded stale){rejectSuperseded(call);}
     catch(Exception unverified){
      android.util.Log.w("AlphaAgentRequest",diagnostic.failure(unverified));
      synchronized(lifecycleLock){
       try{requireOwned(call,epoch);}catch(Superseded stale){rejectSuperseded(call);return;}
       pending.remove(call);
       if(diagnostic.retryable(unverified))call.reject("Alpha is getting ready.","LOCAL_AGENT_ATTACH_PENDING");
       else{
        attachUnverified=true;
        call.reject("Alpha couldn’t verify the local agent.","runtime-identity-unavailable");
       }
      }
     }
    },()->rejectPending(call,"Local agent bridge is closed."));
    return;
   }
   PluginWorkers.submit(workers,()->{
    long launched=android.os.SystemClock.elapsedRealtime(),deadline=launched+START_DEADLINE_MS;
    String readyRoot=null;
    while(android.os.SystemClock.elapsedRealtime()<deadline){
     long pause=1000;
     try{
      JSONObject boot=ElizaAgentService.getLocalAgentBootState(getContext());
      if(rejectStartupRefusal(call,epoch,boot))return;
      // A launch the service already reports as ended fails now, not at the deadline. The first
      // seconds may still show the previous process's state.
      if(android.os.SystemClock.elapsedRealtime()-launched>=3000&&startFailed(boot)){android.util.Log.w("AlphaLocalAgent","start-failed "+boot.optString("reason"));rejectStartFailed(call,epoch);return;}
      requireCurrent(epoch);
      // A socket can still accept during the watchdog's replacement backoff.
      if(!"restarting".equals(boot.optString("state"))){
       if(boot.optBoolean("socketListening"))pause=200;
       String root=ElizaAgentService.localAgentToken();if(root==null||root.isEmpty())throw new IllegalStateException();authenticatedStatus(epoch,root);readyRoot=root;break;
      }
     }
     catch(Superseded stale){rejectSuperseded(call);return;}
     catch(Exception unavailable){ /* Wait for the resident to accept requests. */ }
     try{Thread.sleep(pause);}catch(InterruptedException interrupted){Thread.currentThread().interrupt();break;}
    }
    if(readyRoot!=null){
     // Never repeat uncertain enrollment on this boot. A new boot has its own root.
     try{enroll(epoch,readyRoot);resolveCurrent(call,epoch,new JSObject().put("state","ready"));return;}
     catch(Superseded stale){rejectSuperseded(call);return;}
     catch(RuntimeRootChanged|EnrollmentReadUnavailable retry){rejectStartFailed(call,epoch);return;}
     catch(Exception uncertain){rejectStartup(call,epoch,"Alpha couldn’t confirm local enrollment.","runtime-identity-unavailable");return;}
    }
    rejectStartFailed(call,epoch);
   },()->rejectPending(call,"Local agent bridge is closed."));
  }catch(Exception error){synchronized(lifecycleLock){pending.remove(call);}call.reject(START_FAILED,"start-failed");}
 }
 /** The service keeps a launch alive for its boot grace (ElizaAgentService.AGENT_BOOT_GRACE_MS,
  * 120 s); the start call waits as long before it reports failure. */
 private static final long START_DEADLINE_MS=120000;
 static final String START_FAILED="Your agent couldn't start. Try again.";
 static boolean supervisedStartupPending(JSONObject boot){
  String state=boot.optString("state");
  return boot.optBoolean("serviceActive")&&("booting".equals(state)||"restarting".equals(state));
 }
 /** A terminal boot state no retry within this launch can change; watchdog restarts are "restarting". */
 static boolean startFailed(JSONObject boot){
  if(!"dead".equals(boot.optString("state")))return false;
  String reason=boot.optString("reason");
  return reason.endsWith("-failed")||"fatal".equals(reason)||reason.startsWith("agent exited:")||reason.startsWith("missing-");
 }
 /** This launch ended or timed out: cancelStart no longer owns it. */
 private void rejectStartFailed(PluginCall call,long epoch){
  rejectStartup(call,epoch,START_FAILED,"start-failed");
 }
 private void rejectStartup(PluginCall call,long epoch,String message,String code){
  synchronized(lifecycleLock){
   if(startRequestEpoch==epoch){startRequestId=null;startOwnsLaunch=false;}
   if(pending.remove(call))call.reject(message,code);
  }
 }
 static String startupRefusalMessage(String reason){return ResidentAttachment.startupRefusalMessage(reason);}
 private boolean rejectStartupRefusal(PluginCall call,long epoch,JSONObject status) throws Superseded {
  String reason=status.optString("reason");
  String message=startupRefusalMessage(reason);
  if(message==null)return false;
  synchronized(lifecycleLock){requireCurrent(epoch);if(pending.remove(call))call.reject(message,reason);return true;}
 }
 private static boolean shutdownConfirmed(JSONObject status){return ResidentAttachment.shutdownConfirmed(status);}
 private void ipcRecovery(PluginCall call,boolean archive){
  final String token=archive?call.getString("reviewToken",""):null;
  if(archive&&(token==null||!token.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))){call.reject("Review recovery again before continuing.");return;}
  final long epoch,intent;
  synchronized(lifecycleLock){
   if(!archive)recoveryReview.clear();
   if(disposed||getActivity()==null||!getActivity().hasWindowFocus()||stopping||credentialMutationEpoch>=0||credentialShutdownRequest!=-1){recoveryReview.clear();call.reject("Recovery is unavailable right now. Your records were kept.");return;}
   epoch=lifecycleEpoch;intent=credentialIntents.current();pending.add(call);
  }
  PluginWorkers.submit(workers,()->{
   try{
    // SDK processLock is acquired before this authority takes lifecycleLock, matching startup.
    ElizaAgentService.RecoveryAuthority authority=operation->{synchronized(lifecycleLock){
     if(disposed||epoch!=lifecycleEpoch||!credentialIntents.isCurrent(intent)||!pending.contains(call)||getActivity()==null||!getActivity().hasWindowFocus()||stopping||credentialMutationEpoch>=0||credentialShutdownRequest!=-1){
      recoveryReview.clear();return new JSONObject().put("status","unavailable").put("reason","active-owner").put("retainedCount",0).put("archivedCount",0);
     }
     if(archive&&!recoveryReview.consume(token,lifecycleEpoch,credentialIntents.current()))return new JSONObject().put("status","unavailable").put("reason","records-changed").put("retainedCount",0).put("archivedCount",0);
     JSONObject result=operation.run();
     if(!archive&&"reviewable".equals(result.optString("status")))recoveryReview.bind(result.getString("reviewToken"),lifecycleEpoch,credentialIntents.current());
     return result;
    }};
    JSONObject result=archive?ElizaAgentService.archiveIpcRecovery(token,authority):ElizaAgentService.reviewIpcRecovery(authority);
    synchronized(lifecycleLock){if(archive)recoveryReview.clear();if(pending.remove(call))call.resolve(new JSObject(result.toString()));}
   }catch(Exception error){synchronized(lifecycleLock){recoveryReview.clear();}rejectPending(call,"Recovery could not be confirmed. Your records were kept. Review again before restarting.");}
  },()->rejectPending(call,"Recovery is unavailable right now. Your records were kept."));
 }
 /** Updater owns a service shutdown lease; no vault/lifecycle monitor is held during the wait. */
 static long pauseForUpdate(Context context){
  final long request;
  synchronized(lifecycleLock){
   if(credentialMutationEpoch>=0)throw new IllegalStateException("Provider mutation pending");
   startRequestId=null;startOwnsLaunch=false;
   AlphaCanonicalNotifications.forget(context);invalidateCalls();++lifecycleEpoch;accepting=false;stopping=true;clearEnrollment();
   request=ElizaAgentService.reserveCredentialShutdown();
  }
  return request;
 }
 static boolean updateShutdownConfirmed(Context context,long request)throws Exception{return ElizaAgentService.isCredentialShutdownConfirmed(request)&&shutdownConfirmed(ElizaAgentService.getLocalAgentBootState(context));}
 static void releaseUpdateShutdown(long request){ElizaAgentService.releaseCredentialShutdown(request);}
 /** Native speech uses only the existing enrollment, bound to its exact token and runtime epoch. */
 static ai.eliza.voice.LiveSegmentPipe.Transport openNativeVoiceTransport(String expectedOwner)throws Exception{
  final String root,token,owner;final long epoch;
  synchronized(lifecycleLock){
   captureResultSession(expectedOwner);root=rootToken;token=ownerToken;owner=ownerIdentity;epoch=lifecycleEpoch;
  }
  final NativeVoiceBinding binding=new NativeVoiceBinding(epoch,root,token,owner);
  final java.util.concurrent.atomic.AtomicBoolean cancelled=new java.util.concurrent.atomic.AtomicBoolean();
  final java.util.concurrent.atomic.AtomicReference<ai.eliza.voice.BufferedStreamExchange.Handle> active=new java.util.concurrent.atomic.AtomicReference<>();
  class VoiceHandle implements ai.eliza.voice.BufferedStreamExchange.Handle {final ElizaAgentService.LocalStreamHandle handle=new ElizaAgentService.LocalStreamHandle();public void cancel(){handle.cancel();}}
  final ai.eliza.voice.BufferedStreamExchange.Port port=new ai.eliza.voice.BufferedStreamExchange.Port(){
   public ai.eliza.voice.BufferedStreamExchange.Handle open(){return new VoiceHandle();}
   public void request(JSONObject input,java.util.function.Consumer<String> events,ai.eliza.voice.BufferedStreamExchange.Handle handle){ElizaAgentService.requestLocalAgentStream(input.toString(),events,((VoiceHandle)handle).handle);}
  };
  return new ai.eliza.voice.LiveSegmentPipe.Transport(){
   public void check()throws Exception{synchronized(lifecycleLock){
    if(!binding.current(lifecycleEpoch,rootToken,ownerToken,ownerIdentity,ElizaAgentService.localAgentToken(),expiresAt,System.currentTimeMillis(),accepting&&!stopping))throw new SecurityException("Voice enrollment changed");
   }}
   public void cancelInFlight(){cancelled.set(true);ai.eliza.voice.BufferedStreamExchange.Handle handle=active.get();if(handle!=null)handle.cancel();}
   public JSONObject post(JSONObject body)throws Exception{
    JSONObject headers=new JSONObject().put("Authorization","Bearer "+routeToken("/api/asr/local-inference/live",token)).put("Content-Type","application/json").put("Accept","application/json");
    JSONObject input=new JSONObject().put("path","/api/asr/local-inference/live").put("method","POST").put("body",body.toString()).put("headers",headers).put("timeoutMs",8000);
    return ai.eliza.voice.BufferedStreamExchange.exchange(port,input,active,()->{check();if(cancelled.get()&&!body.optBoolean("close"))throw new IllegalStateException("Voice capture cancelled");},8000);
   }
  };
 }
 // Native callers may bind background result reads to an existing enrollment.
 // This is deliberately not a Capacitor method and never enrolls.
 static JSONObject captureResultSession(String expectedOwner) throws Exception {
  synchronized(lifecycleLock){
   String currentRoot=ElizaAgentService.localAgentToken();
   if(!accepting||stopping||rootToken==null||!rootToken.equals(currentRoot)||
      ownerIdentity==null||!ownerIdentity.equals(expectedOwner)||ownerToken==null||
      expiresAt<=System.currentTimeMillis()+30000)throw new SecurityException("Reconnect the local agent before binding results");
   return ResidentResultSession.snapshot(ownerIdentity,ownerToken,expiresAt,currentRoot);
  }
 }
 /** Native-only read of the already enrolled machine session. Never calls enroll or setup. */
 static JSONObject captureReminderOwnerSession()throws Exception{
  synchronized(lifecycleLock){return captureResultSession(ownerIdentity);}
 }
 static JSONObject readReminderOwnerRoute(JSONObject expected,String path,JSONObject deviceHeaders)throws Exception{
  if(!java.util.Arrays.asList("/api/auth/me","/api/agents","/api/client-devices/context").contains(path))throw new SecurityException("Native owner route unavailable");
  JSONObject before=captureReminderOwnerSession();
  if(!before.toString().equals(expected.toString()))throw new SecurityException("Native owner session changed");
  JSONObject result=raw(path,"GET",null,expected.getString("token"),deviceHeaders,3000);
  if(!captureReminderOwnerSession().toString().equals(expected.toString()))throw new SecurityException("Native owner session changed");
  return result;
 }
 /** Canonical service publication and old observer suspension share the same authority lock. */
 static void publishNotificationRoot(Runnable publish){
  synchronized(lifecycleLock){
   AlphaCanonicalNotifications.suspendForRestart();
   if(rootToken!=null){invalidateCalls();++lifecycleEpoch;rootToken=null;ownerToken=null;ownerIdentity=null;notificationAgent=null;expiresAt=0;}
   publish.run();
  }
 }
 static String notificationInstallation(Context context)throws Exception{
  // Context supplies the app-owned root; Android may expose it through a lexical alias.
  java.nio.file.Path root=context.getFilesDir().toPath().toRealPath();
  java.nio.file.Path directory=root.resolve(".eliza");
  java.nio.file.Path file=directory.resolve("runtime-installation-id");
  if(java.nio.file.Files.isSymbolicLink(directory)||!java.nio.file.Files.isDirectory(directory,java.nio.file.LinkOption.NOFOLLOW_LINKS)||!directory.toRealPath().equals(directory)||java.nio.file.Files.isSymbolicLink(file)||!java.nio.file.Files.isRegularFile(file,java.nio.file.LinkOption.NOFOLLOW_LINKS))throw new SecurityException("Notification installation unavailable");
  String id=new String(java.nio.file.Files.readAllBytes(file),java.nio.charset.StandardCharsets.UTF_8).trim();HostedInbox.id(id);return id;
 }
 static void rememberNotificationOwner(Context context,JSONObject expected,JSONObject identity)throws Exception{
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   NativeNotificationDiagnostics.Persist stage=NativeNotificationDiagnostics.Persist.SESSION;
   try{
    checkNotificationSession(expected);AlphaCredentialStore store=new AlphaCredentialStore(context);
    stage=NativeNotificationDiagnostics.Persist.AGENT;
    if(notificationAgent!=null&&!notificationAgent.equals(identity.getString("agentId")))throw new SecurityException("Notification agent changed after validation");
    stage=NativeNotificationDiagnostics.Persist.INSTALLATION;
    String installation=notificationInstallation(context);
    stage=NativeNotificationDiagnostics.Persist.PROVIDER;
    String provider=store.providerAdmissionSnapshot().toString();
    stage=NativeNotificationDiagnostics.Persist.RECORD;
    JSONObject record=NativeNotificationSession.record(expected,identity,installation,provider);
    stage=NativeNotificationDiagnostics.Persist.PREVIOUS;
    String previous=store.readCredentialSlot(NativeNotificationSession.SLOT);
    if(previous!=null){String old=new JSONObject(previous).optString("projectionOwner","");if(old.matches("[a-f0-9]{64}")&&!old.equals(record.getString("projectionOwner")))NativeNotificationProjector.retireOwner(context,old);}
    stage=NativeNotificationDiagnostics.Persist.STORE;
    notificationAgent=identity.getString("agentId");
    store.writeCredentialSlot(NativeNotificationSession.SLOT,record.toString());
    stage=NativeNotificationDiagnostics.Persist.FINAL;
    checkNotificationSession(expected);
   }catch(Exception failure){NativeNotificationDiagnostics.persistFailure(stage,failure);throw failure;}
  }}
 }
 static void retireRejectedNotificationSession(Context context,String expected)throws Exception{
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   if(enrollmentPresent())return;
   if(expected!=null&&new AlphaCredentialStore(context).compareExchangeCredentialSlot(NativeNotificationSession.SLOT,expected,null)){
    String prior=new JSONObject(expected).optString("projectionOwner","");
    if(prior.matches("[a-f0-9]{64}"))NativeNotificationProjector.retireOwner(context,prior);
   }
  }}
 }
 /** Returns only after private IPC has revalidated the saved machine owner. */
 static boolean restoreNotificationOwner(Context context)throws Exception{
  final long epoch; synchronized(lifecycleLock){
   if(!accepting||stopping||credentialMutationEpoch>=0)return false;
   if(enrollmentPresent()){
    try{captureReminderOwnerSession();return true;}
    catch(SecurityException changed){
     // A new process bearer retires old calls, not the existing owner's NMS receipts.
     invalidateCalls();++lifecycleEpoch;clearEnrollment();
    }
   }
   epoch=lifecycleEpoch;
  }
  AlphaCredentialStore store=new AlphaCredentialStore(context);
  NativeNotificationSession.Ports ports=new NativeNotificationSession.Ports(){
   public String saved()throws Exception{return store.readCredentialSlot(NativeNotificationSession.SLOT);}
   public String provider()throws Exception{return store.providerAdmissionSnapshot().toString();}
   public String installation()throws Exception{return notificationInstallation(context);}
   public String root()throws Exception{return ElizaAgentService.localAgentToken(context);}
   public void current()throws Exception{synchronized(lifecycleLock){if(epoch!=lifecycleEpoch||!accepting||stopping||credentialMutationEpoch>=0||enrollmentPresent())throw new NativeNotificationSession.Superseded();}}
   public JSONObject get(String path,String bearer)throws Exception{
    if(!java.util.Arrays.asList("/api/auth/me","/api/agents").contains(path))throw new SecurityException("Notification restore route refused");
    current();JSONObject response=raw(path,"GET",null,bearer,null,3000);current();int status=response.getInt("status");
    if(status==401||status==403)throw new SecurityException("Notification session revoked");
    if(status!=200)throw new java.io.IOException("Notification runtime unavailable");
    String body=response.getString("body");if(body.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>65536)throw new SecurityException("Notification identity response invalid");return new JSONObject(body);
   }
  };
  JSONObject restored=NativeNotificationSession.restore(ports,System.currentTimeMillis());if(restored==null)return false;
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){
   ports.current();if(!restored.getString("saved").equals(ports.saved())||!restored.getString("provider").equals(ports.provider())||!restored.getString("installationId").equals(ports.installation())||!restored.getString("rootDigest").equals(HostedResultNotices.hash(ports.root())))throw new SecurityException("Notification restoration changed");
   JSONObject session=restored.getJSONObject("session");rootToken=ports.root();ownerToken=session.getString("token");ownerIdentity=session.getString("ownerId");notificationAgent=restored.getString("agentId");expiresAt=session.getLong("expiresAt");return true;
  }}
 }
 /** Native-only canonical inbox transport, bound to an existing machine session. */
 static void checkNotificationSession(JSONObject expected)throws Exception{
  synchronized(lifecycleLock){if(!captureReminderOwnerSession().toString().equals(expected.toString()))throw new SecurityException("Notification session changed");}
 }
 static <T>T withNotificationSession(JSONObject expected,java.util.concurrent.Callable<T> work)throws Exception{
  synchronized(lifecycleLock){synchronized(ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK){checkNotificationSession(expected);T result=work.call();checkNotificationSession(expected);return result;}}
 }
 static JSONObject readNotificationPage(JSONObject expected,JSONObject cursor)throws Exception{
  String path=NativeNotificationSession.pagePath(cursor);checkNotificationSession(expected);
  JSONObject result=raw(path,"GET",null,expected.getString("token"),null,10000);checkNotificationSession(expected);return result;
 }
 static JSONObject markNotificationRead(JSONObject expected,String id)throws Exception{
  if(id==null||!id.matches("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))throw new SecurityException("Invalid notification identity");
  checkNotificationSession(expected);JSONObject result=raw("/api/notifications/"+id+"/read","POST","{}",expected.getString("token"),null,10000);checkNotificationSession(expected);return result;
 }
 static void subscribeNotificationEvents(JSONObject expected,java.util.function.Consumer<String> events,ElizaAgentService.LocalStreamHandle handle)throws Exception{
  checkNotificationSession(expected);
  JSONObject input=new JSONObject().put("streams",new org.json.JSONArray().put("notification"));
  ElizaAgentService.subscribeLocalAgentEvents(input.toString(),event->{try{checkNotificationSession(expected);events.accept(event);}catch(Exception changed){handle.cancel();}},handle);
 }
 /**
  * The resident's local speech routes (/api/asr/local-inference/*) accept only its per-boot token,
  * not the owner session: the owner token gets 401, and a 401 clears the enrollment. Callers have
  * already admitted the owner; the per-boot token never leaves native code.
  */
 static String routeToken(String path,String session){return path.startsWith("/api/asr/local-inference/")?ElizaAgentService.localAgentToken():session;}
 private static JSONObject raw(String path,String method,String body,String token,JSONObject supplied,int timeoutMs) throws Exception {
  JSONObject headers=new JSONObject();headers.put("Accept","application/json");headers.put("Content-Type","application/json");
  if(token!=null)headers.put("Authorization","Bearer "+routeToken(path,token));
  if(supplied!=null)for(String key:new String[]{"X-Eliza-Device-Id","X-Eliza-Device-Key","X-Eliza-Device-Capabilities","X-ElizaOS-Client-Id"}){
   if(supplied.has(key)){String value=supplied.getString(key);if(value.length()>2048||value.contains("\r")||value.contains("\n")||("X-ElizaOS-Client-Id".equals(key)&&!value.matches("[A-Za-z0-9._-]{1,128}")))throw new IllegalArgumentException();headers.put(key,value);}
  }
  JSONObject input=new JSONObject().put("path",path).put("method",method).put("headers",headers).put("timeoutMs",timeoutMs);
  if(body!=null)input.put("body",body);
  return new JSONObject(ElizaAgentService.requestLocalAgent(input.toString()));
 }
 private static JSONObject json(String path,String method,JSONObject body,String token) throws Exception {return json(path,method,body,token,status->{});}
 private static JSONObject json(String path,String method,JSONObject body,String token,java.util.function.IntConsumer observedStatus) throws Exception {
  JSONObject response=raw(path,method,body==null?null:body.toString(),token,null,120000);
  int status=response.getInt("status");
  observedStatus.accept(status);
  if(status>=500&&status<=599)throw new java.io.IOException("Local enrollment service unavailable");
  if(status!=200)throw new IllegalStateException("Local enrollment unavailable");
  return new JSONObject(response.getString("body"));
 }
 private void requireEnrollmentRoot(long epoch,String root) throws Exception {
  requireCurrent(epoch);
  if(root==null||root.isEmpty()||!root.equals(ElizaAgentService.localAgentToken()))throw new RuntimeRootChanged();
 }
 private JSONObject enrollmentJson(long epoch,String path,String method,JSONObject body,String token,String root) throws Exception {return enrollmentJson(epoch,path,method,body,token,root,status->{});}
 private JSONObject enrollmentJson(long epoch,String path,String method,JSONObject body,String token,String root,java.util.function.IntConsumer observedStatus) throws Exception {
  requireEnrollmentRoot(epoch,root);
  // Admission precedes dispatch. In-flight native requests are not claimed cancelled.
  final JSONObject result;
  try{result=json(path,method,body,token,observedStatus);}
  catch(Exception failed){requireEnrollmentRoot(epoch,root);throw failed;}
  requireEnrollmentRoot(epoch,root);
  return result;
 }
 private JSONObject authenticatedStatus(long epoch,String root) throws Exception {return authenticatedStatus(epoch,root,status->{});}
 private JSONObject authenticatedStatus(long epoch,String root,java.util.function.IntConsumer observedStatus) throws Exception {
  JSONObject status=enrollmentJson(epoch,"/api/auth/status","GET",null,root,root,observedStatus);
  if(!Boolean.TRUE.equals(status.opt("authenticated")))throw new IllegalStateException("Local runtime token not authenticated");
  if(status.getString("instanceId").isEmpty())throw new IllegalStateException("Local runtime instance unavailable");
  return status;
 }
 private String enroll(long epoch) throws Exception {
  return enroll(epoch,null);
 }
 private String enroll(long epoch,String expectedRoot) throws Exception {
  synchronized(enrollmentLock){
  requireCurrent(epoch);
  String root=expectedRoot==null?ElizaAgentService.localAgentToken():expectedRoot;
  synchronized(lifecycleLock){requireEnrollmentRoot(epoch,root);if(root.equals(rootToken)&&ownerToken!=null&&expiresAt>System.currentTimeMillis()+30000){AlphaCanonicalNotifications.ensure(getContext());return ownerToken;}}
  // The native channel authenticates the owner; its session is the runtime root under the native prefix.
  final String token="native:"+root;final JSONObject who;
  try{
   authenticatedStatus(epoch,root);
   who=enrollmentJson(epoch,"/api/auth/me","GET",null,token,root);
  }catch(java.io.IOException unavailable){
   // Only reads were dispatched. The same boot can be checked again.
   throw new EnrollmentReadUnavailable(unavailable);
  }
  if(!"OWNER".equals(who.getJSONObject("access").getString("role"))||!token.equals(who.getJSONObject("session").getString("id")))throw new IllegalStateException();
  String identity=who.getJSONObject("identity").getString("id");if(identity.isEmpty())throw new IllegalStateException();
  long expiry=who.getJSONObject("session").getLong("expiresAt");if(expiry<=System.currentTimeMillis())throw new IllegalStateException();
  synchronized(lifecycleLock){requireEnrollmentRoot(epoch,root);AlphaCanonicalNotifications.suspendForRestart();rootToken=root;ownerToken=token;ownerIdentity=identity;notificationAgent=null;expiresAt=expiry;AlphaCanonicalNotifications.ensure(getContext());return token;}
  }
 }
 private static void logRequestFailure(String category,String method,int status,String reason) {
  String safeMethod=java.util.Arrays.asList("GET","POST","PATCH","DELETE").contains(method)?method:"OTHER";
  android.util.Log.w("AlphaAgentRequest","category="+category+" method="+safeMethod+" status="+status+" reason="+reason);
 }
 private static final int LOCAL_REQUEST_TIMEOUT_LIMIT_MS=120_000;
 private static final int RESIDENT_MINIMUM_TIMEOUT_MS=1_000;
 private static final String REQUEST_DEADLINE_MESSAGE="Local agent request timed out before dispatch.";
 private static final class RequestDeadlineExpired extends Exception {}

 /** Null without timeoutMs (the per-dispatch timeout applies). Explicit budgets include time on the worker queue. */
 private static Long localRequestDeadline(JSONObject input,long entered) {
  if(!input.has("timeoutMs"))return null;
  Object value=input.opt("timeoutMs");
  if(!(value instanceof Number))throw new IllegalArgumentException();
  double timeout=((Number)value).doubleValue();
  if(!Double.isFinite(timeout)||timeout!=Math.floor(timeout))throw new IllegalArgumentException();
  return entered+(long)Math.max(0,Math.min(LOCAL_REQUEST_TIMEOUT_LIMIT_MS,timeout));
 }
 private static int remainingLocalRequestTimeout(Long deadline) throws RequestDeadlineExpired {
  if(deadline==null)return LOCAL_REQUEST_TIMEOUT_LIMIT_MS;
  long remaining=deadline-android.os.SystemClock.elapsedRealtime();
  // The shared buffered transport raises ordinary requests to at least one second.
  // Refuse a smaller remainder before admission. Its separate inference floor still applies.
  if(remaining<RESIDENT_MINIMUM_TIMEOUT_MS)throw new RequestDeadlineExpired();
  return (int)remaining;
 }
 /** The first renderer reads verify the owner enrolled by start. They never attempt to enroll. */
 private String startupReadToken(long epoch,String root) throws Exception {
  requireEnrollmentRoot(epoch,root);
  if(!root.equals(rootToken)||ownerToken==null||expiresAt<=System.currentTimeMillis()+30000)throw new RuntimeRootChanged();
  return ownerToken;
 }
 private void rejectStartupReadPending(PluginCall call){
  synchronized(lifecycleLock){if(pending.remove(call))call.reject("Alpha is getting ready.","LOCAL_AGENT_ATTACH_PENDING");}
 }
 private void forgetWithdrawable(String cancelId,PluginCall call){if(cancelId!=null)synchronized(lifecycleLock){withdrawable.remove(cancelId,call);}}
 /** Destroying one surface (for example closing the assistant) cancels only this instance's
  * calls and streams. The shared runtime, its epoch and the owner enrollment stay valid for
  * other surfaces. When the last surface goes away (the app is closed or recreated) the epoch
  * advances and the enrollment is cleared, as before; the next surface enrolls again. */
 @Override protected void handleOnDestroy(){unwatchKeyguard();providerSurfaceGeneration++;closeProviderReveal();synchronized(lifecycleLock){disposed=true;invalidateOwnCalls();instances.remove(this);if(instances.isEmpty()&&!AlphaCanonicalNotifications.ownsSession()){++lifecycleEpoch;clearEnrollment();}}workers.shutdownNow();voiceWorkers.shutdownNow();rendererWorkers.shutdownNow();super.handleOnDestroy();}
}
