// spec/app/voice/route.md, "Story: Choose where speech is processed"; spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.signin.CredentialPolicy.Notice;
import ai.eliza.plugins.signin.CredentialReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BooleanSupplier;
import java.util.function.Function;

/**
 * The signed-in Cloud key a speech session runs under. Each registered cloud's key is read from the
 * phone's own sign-in custody; the epoch moves whenever any of them is replaced, signed out or
 * expires, so a session admitted under one key ends when it changes. Nothing here reaches the page.
 */
final class AlphaCloudSpeechAuthority {
 private final Map<String, String> origins;
 private final Function<String, CredentialReader> custody;
 private final BooleanSupplier secretSurface;
 private final Map<String, CredentialReader> readers = new HashMap<>();
 private final List<CredentialReader.Subscription> subscriptions = new ArrayList<>();
 private long epoch;
 private boolean watching, closed;

 /** {@code origins} names each registered cloud's API origin; {@code custody} gives the sign-in reader of an origin. */
 AlphaCloudSpeechAuthority(Map<String, String> origins, Function<String, CredentialReader> custody, BooleanSupplier secretSurface) {
  this.origins = Map.copyOf(origins);
  this.custody = custody;
  this.secretSurface = secretSurface;
 }

 /** The reviewed origin of a registered cloud; an unregistered name is refused. */
 String origin(String environment) {
  String origin = environment == null ? null : origins.get(environment);
  if (origin == null) throw new SecurityException("Unknown Cloud environment");
  return origin;
 }

 /** The current authority epoch, watching every registered cloud's key from the first call on. */
 synchronized long epoch() {
  if (closed) throw new IllegalStateException("Cloud speech authority closed");
  if (!watching) {
   watching = true;
   for (String environment : origins.keySet()) subscriptions.add(reader(environment).listen(this::noticed));
  }
  return epoch;
 }

 /**
  * The key of {@code environment} for a session admitted at {@code admitted}: refused while a secret surface is
  * shown, when no complete account holds a key, when the key is not {@code expectedId}, or when the epoch moved.
  */
 CredentialReader.Credential read(String environment, String expectedId, long admitted) {
  if (secretSurface.getAsBoolean()) throw new SecurityException("Protected credential surface is open");
  origin(environment);
  CredentialReader.Credential current = reader(environment).current();
  if (epoch() != admitted) throw new SecurityException("Cloud account changed");
  if (current == null || current.account() == null || !current.account().complete()) throw new SecurityException("Cloud account unavailable");
  if (!current.credentialId().equals(expectedId)) throw new SecurityException("Cloud account changed");
  return current;
 }

 /** Cloud refused the session's key itself: the custody hears it as it hears any other request's 401, for that key only. */
 void refused(String environment, String credentialId, String reason) {
  if (environment == null || !origins.containsKey(environment)) return;
  CredentialReader reader = reader(environment);
  CredentialReader.Credential current = reader.current();
  if (current != null && current.credentialId().equals(credentialId)) reader.report401(current.version(), reason);
 }

 synchronized void close() {
  closed = true;
  for (CredentialReader.Subscription subscription : subscriptions) subscription.close();
  subscriptions.clear();
 }

 private synchronized CredentialReader reader(String environment) {
  return readers.computeIfAbsent(environment, name -> custody.apply(origins.get(name)));
 }

 private synchronized void noticed(Notice notice) {
  if (notice instanceof Notice.Announce || notice instanceof Notice.SignedOutNotice || notice instanceof Notice.ExpiredNotice) epoch++;
 }
}
