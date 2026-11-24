// spec/app/voice/route.md, "Story: Choose where speech is processed"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import ai.eliza.plugins.signin.CredentialPolicy.Account;
import ai.eliza.plugins.signin.CredentialPolicy.Notice;
import ai.eliza.plugins.signin.CredentialReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;

public final class AlphaCloudSpeechAuthorityTest {
 private static final String ORIGIN = "https://api.eliza.app";
 private static final Account OWNER = new Account("user-1", "org-1");

 private static final class Custody implements CredentialReader {
  Credential current;
  final List<Listener> listeners = new ArrayList<>();
  final List<String> reports = new ArrayList<>();
  final List<String> origins = new ArrayList<>();

  @Override public Credential current() { return current; }
  @Override public Account account() { return current == null ? Account.NONE : current.account(); }
  @Override public Subscription listen(Listener listener) {
   listeners.add(listener);
   return () -> listeners.remove(listener);
  }
  @Override public void report401(int version, String reason) { reports.add(version + ":" + reason); }

  void signIn(int version, String id) {
   current = new Credential(version, id, "secret-" + version, OWNER, Long.MAX_VALUE);
   tell(new Notice.Announce(version, OWNER));
  }

  void tell(Notice notice) { for (Listener listener : List.copyOf(listeners)) listener.notice(notice); }
 }

 private final Custody custody = new Custody();
 private final AtomicBoolean secretSurface = new AtomicBoolean();
 private final AlphaCloudSpeechAuthority authority = new AlphaCloudSpeechAuthority(Map.of("production", ORIGIN), origin -> {
  custody.origins.add(origin);
  return custody;
 }, secretSurface::get);

 @Test public void aSessionRunsOnTheSignedInKeyItWasAdmittedUnder() {
  custody.signIn(1, "cred-1");
  long admitted = authority.epoch();
  CredentialReader.Credential key = authority.read("production", "cred-1", admitted);
  assertEquals("secret-1", key.value());
  assertEquals(ORIGIN, authority.origin("production"));
  assertEquals(List.of(ORIGIN), custody.origins);
 }

 @Test public void aNewKeySignOutOrExpiryMovesTheEpochAndRefusesTheOldSession() {
  custody.signIn(1, "cred-1");
  long admitted = authority.epoch();
  custody.signIn(2, "cred-2");
  assertNotEquals(admitted, authority.epoch());
  assertThrows(SecurityException.class, () -> authority.read("production", "cred-2", admitted));
  long renewed = authority.epoch();
  custody.tell(new Notice.SignedOutNotice());
  assertNotEquals(renewed, authority.epoch());
  long signedOut = authority.epoch();
  custody.tell(new Notice.ExpiredNotice());
  assertNotEquals(signedOut, authority.epoch());
 }

 @Test public void anAccountCheckLeavesTheEpochAlone() {
  custody.signIn(1, "cred-1");
  long admitted = authority.epoch();
  custody.tell(new Notice.VerifyAccount());
  assertEquals(admitted, authority.epoch());
  assertEquals("secret-1", authority.read("production", "cred-1", admitted).value());
 }

 @Test public void anotherAccountsKeyIsRefused() {
  custody.signIn(1, "cred-1");
  long admitted = authority.epoch();
  assertThrows(SecurityException.class, () -> authority.read("production", "device", admitted));
 }

 @Test public void noKeyOrAnIncompleteAccountIsRefused() {
  long admitted = authority.epoch();
  assertThrows(SecurityException.class, () -> authority.read("production", "cred-1", admitted));
  custody.current = new CredentialReader.Credential(1, "cred-1", "secret-1", Account.NONE, Long.MAX_VALUE);
  assertThrows(SecurityException.class, () -> authority.read("production", "cred-1", admitted));
 }

 @Test public void anOpenPasswordSurfaceRefusesTheKey() {
  custody.signIn(1, "cred-1");
  long admitted = authority.epoch();
  secretSurface.set(true);
  assertThrows(SecurityException.class, () -> authority.read("production", "cred-1", admitted));
 }

 @Test public void anUnregisteredCloudIsNeverReached() {
  assertThrows(SecurityException.class, () -> authority.origin("staging"));
  assertThrows(SecurityException.class, () -> authority.read("staging", "cred-1", authority.epoch()));
  assertEquals(List.of(ORIGIN), custody.origins);
 }

 @Test public void cloudRefusingTheKeyIsReportedForThatKeyOnly() {
  custody.signIn(3, "cred-3");
  authority.refused("production", "cred-old", "invalid-credential");
  authority.refused("staging", "cred-3", "invalid-credential");
  assertTrue(custody.reports.isEmpty());
  authority.refused("production", "cred-3", "invalid-credential");
  assertEquals(List.of("3:invalid-credential"), custody.reports);
 }

 @Test public void closingStopsWatchingTheKeys() {
  authority.epoch();
  assertEquals(1, custody.listeners.size());
  authority.close();
  assertTrue(custody.listeners.isEmpty());
  assertThrows(IllegalStateException.class, authority::epoch);
 }
}
