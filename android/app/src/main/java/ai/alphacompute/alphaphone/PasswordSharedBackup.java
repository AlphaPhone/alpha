// spec/os/android/passwords/vault.md, "Shared backup is offered only when its exact native app is ready"; spec/os/android/passwords/vault.md, "Shared approval requires the registered cloud and the current owner"; spec/os/android/passwords/vault.md, "One native proof authorizes one backup action"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordVaultAccess;
import ai.eliza.plugins.securestore.nativeonly.PasswordBackupApproval;
import ai.eliza.plugins.securestore.nativeonly.PasswordVaultStore;
import ai.eliza.plugins.signin.SharedPasswordBackup;
import ai.eliza.plugins.signin.SignInRegistration;
import android.content.Context;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.json.JSONObject;

/**
 * Alpha's shared password backup over the upstream os sign-in {@link SharedPasswordBackup} and the
 * secure-store {@link PasswordBackupApproval}: readiness at the Cloud this phone signed in to, and
 * one natively approved save of the vault for the signed-in account. The vault is sealed on the
 * phone with a recovery key that stays in a native-only slot; Cloud stores only the encrypted bytes
 * and their revision.
 */
final class PasswordSharedBackup {
 /** Native-only namespace (RendererCredentialSlots) of each account scope's recovery key. */
 static final String RECOVERY_NAMESPACE = "password-backup-recovery";
 private static final String CLOUD_SLOT = "cloud:production";

 /** The signed-in Cloud account a backup is for: its device key's local id and Cloud's account and organization. */
 static final class Account {
  final String credentialId;
  final PasswordBackupApproval.Owner owner;
  Account(String credentialId, PasswordBackupApproval.Owner owner) { this.credentialId = credentialId; this.owner = owner; }
 }

 /** The backup was refused with a fixed renderer code; the message never echoes provider text. */
 static final class Refused extends Exception {
  final String code;
  Refused(String message, String code) { super(message, null, false, false); this.code = code; }
 }

 private final Context context;
 PasswordSharedBackup(Context context) { this.context = context.getApplicationContext(); }

 /** The production Cloud as the os sign-in module names it: Alpha's App Auth client, API origin and callback on the web host. */
 static SignInRegistration registration() {
  Map<String, Object> environment = Map.of("name", SignInRegistration.PRODUCTION, "apiOrigin", CloudDeployment.PRODUCTION_API,
   "appLinkHost", CloudDeployment.PRODUCTION_WEB_HOST, "redirectPath", AlphaCloudSignInPlugin.CALLBACK_PATH);
  return SignInRegistration.parse(Map.of("clientId", AlphaCloudSignInPlugin.REGISTRATION.clientId, "googleMode", "picker",
   "environments", List.of(environment)));
 }

 static SharedPasswordBackup service() {
  SignInRegistration registration = registration();
  return new SharedPasswordBackup(registration, registration.production(), CloudDeployment.PRODUCTION_TENANT,
   AlphaCloudSignInPlugin.REGISTRATION.googleClientId);
 }

 /** The account the stored, unexpired device key belongs to, as Cloud names it for that key; null when signed out. */
 Account account() throws Exception {
  String saved = new AlphaCredentialStore(context).readCredentialSlot(CLOUD_SLOT);
  if (saved == null) return null;
  JSONObject credential = new JSONObject(saved);
  String credentialId = credential.optString("credentialId", ""), token = credential.optString("token", "");
  if (credentialId.isEmpty() || token.isEmpty() || credential.optLong("expiresAt", Long.MAX_VALUE) <= System.currentTimeMillis()) return null;
  JSONObject identity = AlphaConnectionPlugin.readCloudIdentity(token);
  String user = identity.optString("userId", ""), organization = identity.optString("organizationId", "");
  if (!uuid(user) || !uuid(organization)) return null;
  return new Account(credentialId, new PasswordBackupApproval.Owner(user, organization));
 }

 /** Whether the device key that named {@code account} is still the stored one. */
 boolean current(Account account) {
  try {
   String saved = new AlphaCredentialStore(context).readCredentialSlot(CLOUD_SLOT);
   return saved != null && account.credentialId.equals(new JSONObject(saved).optString("credentialId", ""));
  } catch (Exception unreadable) {
   return false;
  }
 }

 /** Whether a backup can be offered now: a signed-in account and the Cloud's version 2 backup for this exact native app. Opens no challenge. */
 boolean ready() {
  try {
   return account() != null && service().available();
  } catch (Exception unavailable) {
   return false;
  }
 }

 /**
  * Saves the vault under one approval: sealed with this account scope's recovery key (created once,
  * native-only, before anything is sent), at the revision the approval read, only while
  * {@code active} still holds.
  */
 PasswordBackupApproval.Response save(PasswordBackupApproval approval, PasswordVaultAccess vault, BooleanSupplier active) throws Exception {
  if (!active.getAsBoolean()) throw new Refused("Password backup account changed", "account-changed");
  byte[] key = recoveryKey(approval.scope());
  byte[] envelope = null;
  try {
   envelope = vault.use(store -> store.encryptBackup(approval.scope(), key));
   if (!active.getAsBoolean()) throw new Refused("Password backup account changed", "account-changed");
   return approval.run(approval.revision(), envelope);
  } finally {
   Arrays.fill(key, (byte) 0);
   if (envelope != null) Arrays.fill(envelope, (byte) 0);
  }
 }

 private byte[] recoveryKey(String scope) throws Exception {
  if (scope == null || !scope.matches("[a-f0-9]{64}")) throw new Refused("Password backup approval was refused", "refused");
  AlphaCredentialStore store = new AlphaCredentialStore(context);
  String slot = RECOVERY_NAMESPACE + ":v1:" + scope;
  String saved = store.readCredentialSlot(slot);
  if (saved != null) return Base64.getDecoder().decode(saved);
  byte[] created = PasswordVaultStore.newBackupRecoveryKey();
  store.writeCredentialSlot(slot, Base64.getEncoder().encodeToString(created));
  String kept = store.readCredentialSlot(slot);
  if (kept == null || !Arrays.equals(Base64.getDecoder().decode(kept), created)) {
   Arrays.fill(created, (byte) 0);
   throw new Refused("The backup key could not be kept on this phone", "unavailable");
  }
  return created;
 }

 private static boolean uuid(String value) {
  try {
   return value != null && UUID.fromString(value).toString().equalsIgnoreCase(value);
  } catch (IllegalArgumentException invalid) {
   return false;
  }
 }
}
