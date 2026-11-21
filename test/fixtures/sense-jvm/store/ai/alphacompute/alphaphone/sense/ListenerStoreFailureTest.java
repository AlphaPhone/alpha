package ai.alphacompute.alphaphone.sense;
import ai.eliza.sense.BuildConfig;
import android.content.*; import java.util.*;
public class ListenerStoreFailureTest {
 static class Prefs implements SharedPreferences {
  Map<String,Object> disk=new HashMap<>(),memory=new HashMap<>(); boolean fail;
  public int getInt(String k,int d){return (Integer)memory.getOrDefault(k,d);} public long getLong(String k,long d){return (Long)memory.getOrDefault(k,d);}
  public boolean getBoolean(String k,boolean d){return (Boolean)memory.getOrDefault(k,d);} public String getString(String k,String d){return (String)memory.getOrDefault(k,d);}
  public Editor edit(){ return new Editor(){
   Map<String,Object> next=new HashMap<>(memory);
   public Editor putInt(String k,int v){next.put(k,v);return this;} public Editor putLong(String k,long v){next.put(k,v);return this;}
   public Editor putBoolean(String k,boolean v){next.put(k,v);return this;} public Editor putString(String k,String v){next.put(k,v);return this;}
   public Editor remove(String k){next.remove(k);return this;}
   public Editor clear(){next.clear();return this;}
   public boolean commit(){memory=next;if(fail)return false;disk=new HashMap<>(next);return true;}
  };}
 }
 static class Host extends Context { Prefs prefs=new Prefs(); int stops; public SharedPreferences getSharedPreferences(String f,int m){return prefs;} public boolean stopService(Intent i){yes(i.getComponent().getClassName().equals(BuildConfig.SENSE_COMPONENT_PACKAGE+".ListeningService"));stops++;return true;} }
 static void yes(boolean v){if(!v)throw new AssertionError();}
 static void freshProcess()throws Exception {for(String key:new String[]{"processConsent","storageFailed"}){var f=ListenerStore.class.getDeclaredField(key);f.setAccessible(true);f.setBoolean(null,false);}}
 public static void main(String[] args)throws Exception {
  for(String operation:new String[]{"grant","pause","revoke","enable","resume","session","start","reset"}) {
   freshProcess(); Host h=new Host(); ListenerStore s=new ListenerStore(h);s.grantConsent(1,ListenerStore.consentGeneration());yes(s.enabled());yes(s.setSessionOpen(true));
   h.prefs.fail=true;
   switch(operation){case "grant":s.grantConsent(2,ListenerStore.consentGeneration());break;case "pause":s.pause(Long.MAX_VALUE);break;case "revoke":s.revokeConsent();break;case "enable":s.setEnabled(false);break;case "resume":s.resume();break;case "session":yes(!s.setSessionOpen(true));break;case "start":s.recordProcessStart(2,true);break;case "reset":yes(!s.reset());}
   yes(ListenerStore.storageFailed());yes(!s.enabled());yes(s.consentVersion()==0);yes(h.stops>0);
   h.prefs.fail=false;s.grantConsent(3,ListenerStore.consentGeneration());yes(!s.enabled()); // failure latch survives another control
   h.prefs.memory=new HashMap<>(h.prefs.disk);freshProcess();s=new ListenerStore(h);yes(!s.enabled()); // stale disk consent never restarts recording
   s.grantConsent(4,ListenerStore.consentGeneration());yes(s.enabled());
  }
  freshProcess();Host clean=new Host();ListenerStore store=new ListenerStore(clean);store.grantConsent(5,ListenerStore.consentGeneration());Listener.epoch.renew(true);long ticket=Listener.epoch.ticket();
  long oldConsent=ListenerStore.consentGeneration();
  yes(store.reset());yes(!store.grantConsent(7,oldConsent));yes(clean.prefs.disk.isEmpty());yes(!store.enabled());yes(!Listener.epoch.current(ticket));yes(clean.stops>0);
  freshProcess();yes(!new ListenerStore(clean).enabled());
  store.grantConsent(6,ListenerStore.consentGeneration());clean.prefs.fail=true;yes(!store.reset());yes(!store.enabled());
  clean.prefs.fail=false;yes(store.reset());yes(clean.prefs.disk.isEmpty());yes(!store.enabled());yes(!ListenerStore.storageFailed());
  // Simulate an in-flight service policy application through the production serialization API.
  store.grantConsent(8,ListenerStore.consentGeneration());
  var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
  var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
  try{
   var apply=pool.submit(()->ListenerStore.serializeConsent(()->{entered.countDown();try{release.await();}catch(InterruptedException e){throw new AssertionError(e);}Listener.epoch.renew(true);}));
   yes(entered.await(5,java.util.concurrent.TimeUnit.SECONDS));
   var reset=pool.submit(()->store.reset());
   try{reset.get(100,java.util.concurrent.TimeUnit.MILLISECONDS);throw new AssertionError("Reset interleaved policy apply");}catch(java.util.concurrent.TimeoutException expected){}
   release.countDown();apply.get(5,java.util.concurrent.TimeUnit.SECONDS);yes(reset.get(5,java.util.concurrent.TimeUnit.SECONDS));
   yes(!store.enabled());yes(Listener.epoch.ticket()==-1);
  }finally{release.countDown();pool.shutdownNow();}
  // A lost SystemUI indicator lease is cleared only by an explicit resume, turn-on or new consent, never by a pause.
  freshProcess();Host latch=new Host();ListenerStore held=new ListenerStore(latch);held.grantConsent(9,ListenerStore.consentGeneration());
  Listener.indicatorLost=true;held.pause(Long.MAX_VALUE);yes(Listener.indicatorLost);held.setEnabled(false);yes(Listener.indicatorLost);
  held.resume();yes(!Listener.indicatorLost);
  Listener.indicatorLost=true;held.setEnabled(true);yes(!Listener.indicatorLost);
  Listener.indicatorLost=true;held.grantConsent(10,ListenerStore.consentGeneration());yes(!Listener.indicatorLost);
  // A restart drops the opt-in; listening that was on is reported as lapsed until it is turned on, off or withdrawn.
  freshProcess();Host restart=new Host();ListenerStore before=new ListenerStore(restart);yes(!before.lapsedAfterRestart());
  before.grantConsent(11,ListenerStore.consentGeneration());yes(!before.lapsedAfterRestart());
  freshProcess();ListenerStore after=new ListenerStore(restart);yes(after.lapsedAfterRestart());yes(!after.enabled());
  after.revokeConsent();yes(!after.lapsedAfterRestart());freshProcess();yes(!new ListenerStore(restart).lapsedAfterRestart());
  before.grantConsent(12,ListenerStore.consentGeneration());freshProcess();after=new ListenerStore(restart);yes(after.lapsedAfterRestart());
  after.setEnabled(false);yes(!after.lapsedAfterRestart());
  before.grantConsent(13,ListenerStore.consentGeneration());yes(!after.lapsedAfterRestart()); // turned on again in this process
  before.setEnabled(false);freshProcess();yes(!new ListenerStore(restart).lapsedAfterRestart()); // listening was off when the process ended
  before.grantConsent(14,ListenerStore.consentGeneration());freshProcess();restart.prefs.fail=true;after=new ListenerStore(restart);after.pause(1);yes(!after.lapsedAfterRestart()); // a failed write is reported as a storage failure instead
  System.out.println("PASS listener persistence failures and restart consent");
 }
}
