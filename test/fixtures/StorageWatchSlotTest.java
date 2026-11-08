package ai.eliza.plugins.filesystem.browser;

import java.util.concurrent.atomic.AtomicInteger;

/** Host-JVM check of the storage watch slot. Not Android or Capacitor evidence. */
public final class StorageWatchSlotTest {
 private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  StorageBrowser.WatchSlot slot=new StorageBrowser.WatchSlot();AtomicInteger registered=new AtomicInteger(),stopped=new AtomicInteger();
  StorageBrowser.WatchSlot.Watch watch=stopped::incrementAndGet;
  // storageWatch is requested; storageUnwatch lands before the worker registers.
  long late=slot.request();slot.clear();
  check(!slot.install(late,()->{registered.incrementAndGet();return watch;}),"an unwatched request registers nothing");
  check(registered.get()==0&&!slot.active(),"no observer is left registered");
  // A newer watch supersedes an older one still queued.
  long older=slot.request(),newer=slot.request();
  check(slot.install(newer,()->{registered.incrementAndGet();return watch;}),"the latest request registers");
  check(!slot.install(older,()->{registered.incrementAndGet();return watch;}),"a superseded request registers nothing");
  check(registered.get()==1&&slot.active(),"one watch");
  check(!slot.isCurrent(older)&&slot.isCurrent(newer),"only the installed current owner may publish");
  // The next watch stops the current one first; unwatch stops it.
  check(slot.install(slot.request(),()->{registered.incrementAndGet();return watch;})&&stopped.get()==1,"a new watch stops the previous one");
  slot.clear();check(stopped.get()==2&&!slot.active(),"unwatch stops the current watch");
  check(!slot.isCurrent(newer),"late callbacks cannot publish after unwatch");
  long failed=slot.request();
  try{slot.install(failed,()->{throw new IllegalStateException("registration failed");});throw new AssertionError("registration succeeded");}catch(IllegalStateException expected){}
  check(!slot.active()&&!slot.isCurrent(failed),"a failed registration has no publication authority");
  // A watch refused before it installs (invalid path, access denied) stops the previous folder's watch.
  check(slot.install(slot.request(),()->{registered.incrementAndGet();return watch;})&&slot.active(),"a folder is watched");
  long refused=slot.request();slot.fail(refused);
  check(stopped.get()==3&&!slot.active(),"a refused watch leaves no observer of the previous folder");
  // A refusal superseded by a newer request does not stop the newer watch.
  long stale=slot.request(),fresh=slot.request();
  check(slot.install(fresh,()->{registered.incrementAndGet();return watch;}),"the newer watch registers");
  slot.fail(stale);check(stopped.get()==3&&slot.active(),"a stale refusal leaves the newer watch");
  System.out.println("PASS storage watch slot");
 }
}
