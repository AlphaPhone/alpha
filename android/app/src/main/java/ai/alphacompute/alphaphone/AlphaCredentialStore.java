package ai.alphacompute.alphaphone;

import android.content.Context;
import android.util.AtomicFile;
import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import java.io.File;
import java.nio.charset.StandardCharsets;

/** Product identity and limits for the installed shared JSON-slot format. */
final class AlphaCredentialStore {
 /** Definite refusal before any byte is written: the value exceeds its slot's cap. */
 static final class StorageFullException extends Exception {
  StorageFullException(){super("Secure storage slot is full");}
 }
 static final String NOTES_RECORDS=Slots.NOTES_RECORDS;
 static final String NOTES_TRASH=Slots.NOTES_TRASH;
 /** Encrypted copy of Notes edits whose collection commit failed or is uncertain. */
 static final String NOTES_DRAFT=Slots.NOTES_DRAFT;
 /** Reminder-to-note back-references: identity only, at most 200 links (runtime/note-origin.ts). */
 static final String NOTE_ORIGINS=Slots.NOTE_ORIGINS;
 /** Notes folder list: at most 100 names of 40 characters (runtime/notes-folders.ts). */
 static final String NOTES_FOLDERS=Slots.NOTES_FOLDERS;
 interface CloudChangeObserver {void changed()throws Exception;}
 private static CloudChangeObserver cloudChange=()->{};
 static void observeCloudChanges(CloudChangeObserver observer){synchronized(JsonCredentialSlots.LOCK){cloudChange=observer;}}
 private final JsonCredentialSlots slots;
 private final Context context;
 private final Runnable assertOwner;
 AlphaCredentialStore(Context context){this(context,()->{});}
 AlphaCredentialStore(Context context,Runnable assertOwner){
  this.context=context.getApplicationContext();this.assertOwner=assertOwner;
  slots=open(this.context);
 }
 private static JsonCredentialSlots open(Context context){
  return new JsonCredentialSlots(new File(context.getNoBackupFilesDir(),"connection-credentials"),"alpha.connection.aes.v1",AlphaCredentialStore::slotLimit,AlphaCredentialStore::retainedLimit);
 }
 static int slotLimit(String name){
  if(Slots.SMS_SEND_LEDGER.equals(name))return 1024*1024;
  // Up to five individually valid pictures with base64 overhead before the owner's MMS review.
  if(name!=null&&name.matches("sms-draft:v1:(new|thread:[1-9][0-9]{0,18})"))return 8*1024*1024;
  if(Slots.GMAIL_BACKGROUND.equals(name))return 2*1024*1024;
  if(Slots.NATIVE_DELETE_JOURNAL.equals(name)||Slots.NATIVE_CALENDAR_SYNC.equals(name))return 4*1024*1024;
  if(Slots.NOTES_AUDIO_DELETIONS.equals(name))return 1024*1024;
  if(name!=null&&name.matches(Slots.NOTE_AUDIO_METADATA_PREFIX+"[A-Za-z0-9_-]{1,100}"))return 512*1024;
  if(NOTES_RECORDS.equals(name))return 32*1024*1024;
  // Restorable copies of deleted notes, purged thirty days after deletion. The cap is the Trash
  // policy's byte limit (runtime/notes-trash-policy.ts NOTES_TRASH_MAX_BYTES).
  if(NOTES_TRASH.equals(name))return NOTES_TRASH_BYTES;
  if(NOTES_DRAFT.equals(name))return 32*1024*1024;
  // 200 links of bounded ids and a hash stay well under this; a larger value is not a valid index.
  if(NOTE_ORIGINS.equals(name))return 512*1024;
  if(NOTES_FOLDERS.equals(name))return 64*1024;
  if(name!=null&&(name.startsWith(Slots.INBOX_DRAFTS_PREFIX)||name.matches(Slots.INBOX_OPERATION_PATTERN)))return 8*1024*1024;
  if(name!=null&&name.matches(Slots.CALENDAR_LINKED_SYNC_PATTERN))return 4*1024*1024;
  if(name!=null&&name.matches(Slots.CONNECTED_READ_CACHE_PATTERN))return 4*1024*1024;
  return 256*1024;
 }
 static int retainedLimit(String name){
  if(NOTES_TRASH.equals(name))return 32*1024*1024;
  return slotLimit(name);
 }
 /** Notes Trash policy limit (30 MiB), also its slot cap. */
 static final int NOTES_TRASH_BYTES=30*1024*1024;
 /** Refuses a value no stored data may reach (its retained cap) before any shutdown or write. */
 private static void requireCapacity(String name,String value)throws StorageFullException{
  if(value==null)return;
  // UTF-8 encodes a char in at most 3 bytes, so a short string cannot exceed the cap.
  if(value.length()<=retainedLimit(name)/3)return;
  if(value.getBytes(StandardCharsets.UTF_8).length>retainedLimit(name))throw new StorageFullException();
 }
 String slotHash(String name)throws Exception{return slots.slotHash(CloudDeployment.storageSlot(name));}
 AtomicFile slotFile(String hash)throws Exception{return slots.slotFile(hash);}
 String readCredentialSlot(String name)throws Exception{return slots.read(CloudDeployment.storageSlot(name));}
 /** Reads a saved slot before Application startup during pending reset recovery. */
 static String readSlotBeforeAttach(Context base,String name)throws Exception{
  return open(base).read(CloudDeployment.storageSlot(name));
 }
 /** Critical credential changes cannot leave a child process using the old environment. */
 void writeCredentialSlot(String name,String value)throws Exception{if(value==null)throw new IllegalArgumentException("Credential value required");requireCapacity(name,value);mutateSlot(name,null,value,false);}
 void removeCredentialSlot(String name)throws Exception{mutateSlot(name,null,null,false);}
 boolean compareExchangeCredentialSlot(String name,String expected,String value)throws Exception{requireCapacity(name,value);return mutateSlot(name,expected,value,true);}
 private boolean mutateSlot(String name,String expected,String value,boolean compare)throws Exception{
  // The shared slot refuses an oversized value before writing any byte; that is a full slot.
  try{return mutateSlotOnce(name,expected,value,compare);}
  catch(JsonCredentialSlots.CapacityException full){throw new StorageFullException();}
 }
 private boolean mutateSlotOnce(String name,String expected,String value,boolean compare)throws Exception{
  if(!Slots.CLOUD_PRODUCTION.equals(name)&&!Slots.CLOUD_STAGING.equals(name)&&!LocalAgentProviderAdmission.PROVIDER_SLOT.equals(name)){
   return AlphaLocalAgentPlugin.withCredentialSlotMutation(assertOwner,()->{
    if(compare&&!java.util.Objects.equals(slots.read(CloudDeployment.storageSlot(name)),expected))return false;
    if(value==null)slots.remove(CloudDeployment.storageSlot(name));else slots.write(CloudDeployment.storageSlot(name),value);return true;
   });
  }
  return AlphaLocalAgentPlugin.mutateCredentials(context,assertOwner,new AlphaLocalAgentPlugin.CredentialMutation<Boolean>(){
   String before,provider;boolean conflict;
   public boolean requiresShutdown()throws Exception{
    before=slots.read(CloudDeployment.storageSlot(name));provider=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
    conflict=compare&&!java.util.Objects.equals(before,expected);
    if(conflict)return false;
    if(LocalAgentProviderAdmission.PROVIDER_SLOT.equals(name))return before!=null||value!=null;
    if(java.util.Objects.equals(before,value))return false;
    // No stored provider: the running agent was launched unbound (removing a provider stops it),
    // so no process holds a Cloud key and a sign-in change never needs to stop the agent.
    if(provider==null)return false;
    String environment=new org.json.JSONObject(provider).optString("environment","production");
    return name.equals(Slots.CLOUD_PREFIX+environment)&&!LocalAgentProviderAdmission.sameCloudCredential(before,value);
   }
   public Boolean commit()throws Exception{
    if(conflict)return false;
    if(!LocalAgentProviderAdmission.PROVIDER_SLOT.equals(name)&&java.util.Objects.equals(before,value))return true;
    if(!java.util.Objects.equals(before,slots.read(CloudDeployment.storageSlot(name)))||!java.util.Objects.equals(provider,slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT))))throw new IllegalStateException("Credential changed");
    // Only a replaced or removed Cloud key retires Cloud-bound background state; changing the agent's
    // inference provider does not (background Gmail binds the Cloud credential, not the provider).
    if(Slots.CLOUD_PRODUCTION.equals(name)&&!LocalAgentProviderAdmission.sameCloudCredential(before,value))cloudChange.changed();
    String committed=LocalAgentProviderAdmission.PROVIDER_SLOT.equals(name)?value==null?LocalAgentProviderAdmission.unbindProvider(before):LocalAgentProviderAdmission.withoutAdmission(value):value;
    // Metadata/valid expiry refresh is not replacement; use the same canonical credential
    // comparison that retains provider admission. Provider writes still strip admission.
    boolean authorityChanged=LocalAgentProviderAdmission.PROVIDER_SLOT.equals(name)
      ?!java.util.Objects.equals(before,committed):!LocalAgentProviderAdmission.sameCloudCredential(before,committed);
    if(authorityChanged)AlphaLocalAgentPlugin.powerAuthorizationChanged();
    invalidateProviderAdmission(name,value);
    if(Slots.CLOUD_PRODUCTION.equals(name)&&authorityChanged)slots.remove(CloudDeployment.storageSlot(GoogleWorkspaceReturn.SLOT));
    if(committed==null)slots.remove(CloudDeployment.storageSlot(name));
    else slots.write(CloudDeployment.storageSlot(name),committed);
    return true;
   }
  });
 }
 /** Reads and commits use the SAME lifecycle→vault order as all credential mutations. */
 private <T>T lockedStep(java.util.concurrent.Callable<T> step)throws Exception{
  return AlphaLocalAgentPlugin.mutateCredentials(context,assertOwner,new AlphaLocalAgentPlugin.CredentialMutation<T>(){
   public boolean requiresShutdown(){return false;}
   public T commit()throws Exception{return step.call();}
  });
 }
 /** Automatic startup unbind is a no-op when native confirms there is no provider.
  * Explicit clear still uses removeCredentialSlot. */
 void removeProviderIfPresent()throws Exception{
  String before=lockedStep(()->slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT)));
  if(before==null||new org.json.JSONObject(before).optBoolean("unbound"))return;
  if(!compareExchangeCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT,before,null))throw new IllegalStateException("Provider changed");
 }
 /** Opaque cleanup authority for the exact binding and existing intent, never a credential. */
 String providerBindingGuard(String expected)throws Exception{
  long authority=AlphaLocalAgentPlugin.credentialAuthorityEpoch();
  return AlphaLocalAgentPlugin.withCredentialAuthority(authority,()->{
   assertOwner.run();
   String provider=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
   if(provider==null||expected!=null&&!expected.equals(provider))throw new SecurityException("Provider changed");
   String cloud=slots.read(CloudDeployment.storageSlot(Slots.CLOUD_PRODUCTION));
   String value=new org.json.JSONArray().put(provider).put(cloud).put(authority).put(AlphaLocalAgentPlugin.currentCredentialIntent()).toString();
   return AlphaUtil.sha256Hex(value);
  });
 }
 static final class ProviderChanged extends Exception {}
 /** Automatic cleanup never reserves an intent or alters a different binding. */
 boolean removeProviderIfCurrent(String guard)throws Exception{
  if(!AlphaUtil.isSha256Hex(guard))throw new IllegalArgumentException("Invalid binding guard");
  final long[] intent={-1};
  try{
   return AlphaLocalAgentPlugin.mutateCredentials(context,()->{
    assertOwner.run();if(intent[0]>=0)AlphaLocalAgentPlugin.requireCredentialIntent(intent[0]);
   },new AlphaLocalAgentPlugin.CredentialMutation<Boolean>(){
    String provider,cloud;long authority;
    public boolean requiresShutdown()throws Exception{
     try{if(!guard.equals(providerBindingGuard(null)))throw new ProviderChanged();}
     catch(SecurityException changed){throw new ProviderChanged();}
     provider=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
     cloud=slots.read(CloudDeployment.storageSlot(Slots.CLOUD_PRODUCTION));
     authority=AlphaLocalAgentPlugin.credentialAuthorityEpoch();
     intent[0]=AlphaLocalAgentPlugin.reserveCredentialIntent();
     return true;
    }
    public Boolean commit()throws Exception{
     if(authority!=AlphaLocalAgentPlugin.credentialAuthorityEpoch()
       ||!java.util.Objects.equals(provider,slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT)))
       ||!java.util.Objects.equals(cloud,slots.read(CloudDeployment.storageSlot(Slots.CLOUD_PRODUCTION))))throw new ProviderChanged();
     AlphaLocalAgentPlugin.powerAuthorizationChanged();
     String retained=LocalAgentProviderAdmission.unbindProvider(provider);
     if(retained==null)slots.remove(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));else slots.write(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT),retained);
     if(!java.util.Objects.equals(retained,slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT))))throw new IllegalStateException("Provider removal unconfirmed");
     return true;
    }
   });
  }catch(ProviderChanged changed){return false;}
  catch(Exception failure){if(intent[0]>=0&&AlphaLocalAgentPlugin.currentCredentialIntent()!=intent[0])return false;throw failure;}
 }
 void assertCurrent(){assertOwner.run();}
 private void invalidateProviderAdmission(String changedSlot,String replacement)throws Exception{
  if(!Slots.CLOUD_PRODUCTION.equals(changedSlot)&&!Slots.CLOUD_STAGING.equals(changedSlot))return;
  String saved=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
  if(saved==null)return;
  org.json.JSONObject provider=new org.json.JSONObject(saved);
  if(!"elizacloud".equals(provider.optString("provider")))return;
  if(!changedSlot.equals(Slots.CLOUD_PREFIX+provider.optString("environment","production")))return;
  String previous=slots.read(CloudDeployment.storageSlot(changedSlot));
  if(replacement!=null&&LocalAgentProviderAdmission.currentGeneration(saved,previous)!=null
     &&LocalAgentProviderAdmission.sameCloudCredential(previous,replacement))return;
  slots.write(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT),LocalAgentProviderAdmission.withoutAdmission(saved));
 }
 /** Only explicit, validated native provider configuration may establish admission identity. */
 String compareExchangeProviderAdmission(String expected,String selection,String credentialSlot,String expectedCredential,org.json.JSONObject verifiedIdentity)throws Exception{
  return AlphaLocalAgentPlugin.mutateCredentials(context,assertOwner,new AlphaLocalAgentPlugin.CredentialMutation<String>(){
   String admitted;boolean conflict,servicesChanged;
   public boolean requiresShutdown()throws Exception{
    conflict=credentialSlot!=null&&!java.util.Objects.equals(slots.read(CloudDeployment.storageSlot(credentialSlot)),expectedCredential)
      ||!java.util.Objects.equals(slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT)),expected);
    if(conflict)return false;
    org.json.JSONObject requested=new org.json.JSONObject(selection);
    boolean cloud="elizacloud".equals(requested.optString("provider"));
    boolean refreshServices=!cloud&&credentialSlot!=null;
    if(cloud&&!Slots.CLOUD_PRODUCTION.equals(credentialSlot))throw new IllegalArgumentException();
    if(refreshServices){
     if(!Slots.CLOUD_PRODUCTION.equals(credentialSlot)||expected==null||verifiedIdentity==null)throw new IllegalArgumentException();
     org.json.JSONObject old=new org.json.JSONObject(expected),services=requested.getJSONObject("cloudServices");
     if(!"cerebras".equals(old.optString("provider")))throw new IllegalArgumentException();
     for(String field:new String[]{"provider","key","cartesiaKey","model","revision"})if(!java.util.Objects.equals(old.opt(field),requested.opt(field)))throw new IllegalArgumentException();
     if(LocalAgentProviderAdmission.currentGeneration(services.toString(),expectedCredential)==null||!services.getJSONObject("verifiedCloudIdentity").toString().equals(verifiedIdentity.toString()))throw new SecurityException("Cloud services admission changed");
    }else if(!cloud&&(expectedCredential!=null||verifiedIdentity!=null))throw new IllegalArgumentException();
    servicesChanged=expected!=null&&!java.util.Objects.equals(new org.json.JSONObject(expected).opt("cloudServices"),requested.opt("cloudServices"));
    admitted=LocalAgentProviderAdmission.admit(expected,selection,expectedCredential,cloud?verifiedIdentity:null);
    String oldGeneration=expected==null?null:LocalAgentProviderAdmission.currentGeneration(expected,expectedCredential);
    return servicesChanged||oldGeneration==null||!oldGeneration.equals(LocalAgentProviderAdmission.currentGeneration(admitted,expectedCredential));
   }
   public String commit()throws Exception{
    if(conflict)return null;
    if(credentialSlot!=null&&!java.util.Objects.equals(slots.read(CloudDeployment.storageSlot(credentialSlot)),expectedCredential)
      ||!java.util.Objects.equals(slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT)),expected))throw new IllegalStateException("Provider changed");
    if(LocalAgentProviderAdmission.currentGeneration(admitted,expectedCredential)==null)throw new IllegalStateException("Provider credential expired");
    // admit() retains generation only when the native canonical fingerprint is unchanged.
    // A fresh random request revision alone must not revoke a protected cold-start grant.
    String previousGeneration=expected==null?null:LocalAgentProviderAdmission.currentGeneration(expected,expectedCredential);
    String admittedGeneration=LocalAgentProviderAdmission.currentGeneration(admitted,expectedCredential);
    if(servicesChanged||previousGeneration==null||!previousGeneration.equals(admittedGeneration))AlphaLocalAgentPlugin.powerAuthorizationChanged();
    slots.write(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT),admitted);return admitted;
   }
  });
 }
 /** Account invalidation may strip this admission, but never overwrite a newer CAS revision. */
 void rollbackProviderAdmission(String admitted,String previous)throws Exception{
  AlphaLocalAgentPlugin.mutateCredentials(context,assertOwner,new AlphaLocalAgentPlugin.CredentialMutation<Void>(){
   String current;boolean owned;
   public boolean requiresShutdown()throws Exception{
    current=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
    if(current==null)return false;
    org.json.JSONObject held=new org.json.JSONObject(current);
    owned=java.util.Objects.equals(current,admitted)
      ||!held.has("admissionGeneration")&&!held.has("admissionFingerprint")
       &&LocalAgentProviderAdmission.withoutAdmission(admitted).equals(held.toString());
    return owned;
   }
   public Void commit()throws Exception{
    if(!owned)return null;
    if(!java.util.Objects.equals(current,slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT))))throw new IllegalStateException("Provider changed");
    AlphaLocalAgentPlugin.powerAuthorizationChanged();
    if(previous==null)slots.remove(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
    else slots.write(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT),LocalAgentProviderAdmission.withoutAdmission(previous));
    return null;
   }
  });
 }
 /** Private whitelist only; neither the logical fingerprint nor billing credentials leave the store. */
 org.json.JSONObject providerAdmissionSnapshot()throws Exception{
  synchronized(JsonCredentialSlots.LOCK){
   String saved=slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT));
   if(saved==null||!AlphaLocalAgentPlugin.providerAdmissionReadable())throw new SecurityException("Native provider binding unavailable");
   org.json.JSONObject selected=new org.json.JSONObject(saved);
   String kind=selected.optString("provider","cerebras");
   String cloud="elizacloud".equals(kind)?slots.read(CloudDeployment.storageSlot(Slots.CLOUD_PRODUCTION)):null;
   String generation=LocalAgentProviderAdmission.currentGeneration(saved,cloud);
   if(generation==null)throw new SecurityException("Native provider binding unavailable");
   String accountRef="elizacloud".equals(kind)?LocalAgentProviderAdmission.cloudAccountRef(selected):"native-local";
   // Keep the trusted local account identity across inference changes. This is not Cloud
   // service authorization: managedGoogleBinding separately revalidates the live credential.
   if("cerebras".equals(kind)&&selected.has("cloudServices"))accountRef=LocalAgentProviderAdmission.cloudAccountRef(selected.getJSONObject("cloudServices"));
   return new org.json.JSONObject().put("provider",kind).put("environment","production").put("accountRef",accountRef).put("sessionGeneration",generation);
  }
 }

}
