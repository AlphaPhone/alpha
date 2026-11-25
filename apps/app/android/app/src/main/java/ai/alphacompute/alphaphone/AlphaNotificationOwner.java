// spec/app/notices/collection.md, "Changing owner forgets everything collected, the consent, which is the new owner's to give, and the own rows of the owner before"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.signin.CredentialPolicy.Notice;
import ai.eliza.plugins.signin.CredentialReader;
import android.content.Context;
import android.os.SystemClock;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;

final class AlphaNotificationOwner {
 private record Scope(String key, long expiresAt, long expiresElapsed) {
  boolean live() {
   return System.currentTimeMillis()<expiresAt && SystemClock.elapsedRealtime()<expiresElapsed;
  }
 }

 private record Observation(long serial, long retirement, Scope scope) {
  Observation saw(boolean signedOut) {
   long next=serial+1;
   return new Observation(next,signedOut?next:retirement,null);
  }

  Observation withScope(Scope next) {
   return new Observation(serial,retirement,next);
  }
 }

 private static final AtomicReference<Observation> current=new AtomicReference<>(new Observation(0,0,null));
 private static long retired;

 static String admitted(Context context) {
  Scope scope=current.get().scope();
  return scope!=null && scope.live()?scope.key():null;
 }

 static void observe(Context context, CredentialReader reader, Notice notice) {
  boolean signedOut=notice instanceof Notice.SignedOutNotice;
  if (notice!=null && !signedOut && !(notice instanceof Notice.Announce) && !(notice instanceof Notice.ExpiredNotice))
   return;
  Observation asked=current.updateAndGet(previous->previous.saw(signedOut));
  Scope offered=signedOut?null:readScope(reader);
  NotificationMirror mirror=AlphaNotificationsPlugin.MIRROR;
  synchronized(mirror.lock) {
   Observation awaiting=current.get();
   try {
    if (awaiting.retirement()>retired) {
     mirror.retireOwner(context);
     retired=awaiting.retirement();
    }
    if (awaiting.serial()!=asked.serial())
     return;
    Observation published=awaiting.withScope(offered);
    if (current.compareAndSet(awaiting,published) && !mirror.reconcileOwner(context))
     current.compareAndSet(published,published.withScope(null));
   } catch (Exception unavailable) {
    current.updateAndGet(observation->observation.serial()==asked.serial()?observation.withScope(null):observation);
   }
  }
 }

 private static Scope readScope(CredentialReader reader) {
  try {
   CredentialReader.Credential credential=reader.current();
   if (credential==null || credential.account()==null || !credential.account().complete())
    return null;
   long remaining=credential.keyExpiresAt()-System.currentTimeMillis();
   if (remaining<=0)
    return null;
   byte[] identity=new JSONArray().put("alpha-notification-collection:v1")
    .put(credential.account().organizationId()).put(credential.account().userId()).toString().getBytes(StandardCharsets.UTF_8);
   byte[] digest=MessageDigest.getInstance("SHA-256").digest(identity);
   String key=Base64.encodeToString(digest,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);
   return new Scope(key,credential.keyExpiresAt(),SystemClock.elapsedRealtime()+remaining);
  } catch (Exception unavailable) {
   return null;
  }
 }
}
