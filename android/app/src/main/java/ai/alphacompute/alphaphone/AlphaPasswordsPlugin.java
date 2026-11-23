package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordEditorPolicy;
import ai.eliza.plugins.passwords.PasswordGenerator;
import ai.eliza.plugins.passwords.PasswordVaultAccess;
import ai.eliza.plugins.securestore.nativeonly.PasswordBackupApproval;
import ai.eliza.plugins.securestore.nativeonly.PasswordFacets;
import ai.eliza.plugins.securestore.nativeonly.PasswordVaultStore;
import ai.eliza.plugins.signin.GoogleSignIn;
import ai.eliza.plugins.signin.SharedPasswordBackup;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.view.autofill.AutofillManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Alpha's vault management bridge for its Passwords settings (the renderer binds it as
 * {@code ElizaPasswords}; the vault custody is the shared {@link PasswordVaultAccess}). Responses
 * carry metadata only (ids, labels, usernames, bindings, timestamps and status); no method
 * resolves with a password. Passwords may be supplied by the user's own typing (write-only) or
 * generated natively. Reveal and copy act natively and resolve with an acknowledgement. Rejections
 * use fixed messages and codes and never echo inputs; the renderer
 * (apps/app/src/ui/passwords/passwords-presentation.ts) words them by code and by these exact
 * sentences, so they do not change here. A shared backup ({@link PasswordSharedBackup}) is approved
 * only in this app's own native flow: the Google account picker for a fresh Cloud proof and a native
 * confirmation; its proof, key and sealed bytes never reach the renderer.
 */
@CapacitorPlugin(name = "ElizaPasswords")
public class AlphaPasswordsPlugin extends Plugin {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final long BACKUP_CONFIRM_MILLIS = 120_000;
  private long unlockTicket;
  private final ExecutorService backupWorker = Executors.newSingleThreadExecutor();
  private final AtomicBoolean backupBusy = new AtomicBoolean();
  private volatile boolean backupPicker, destroyed;
  private volatile android.os.CancellationSignal backupCancellation;

  private PasswordVaultAccess access(PluginCall call) {
    try { return PasswordVaultAccess.get(getContext()); }
    catch (Exception unavailable) { call.reject("Saved passwords are unavailable", "unavailable"); return null; }
  }

  /** {@link #access} for a method that reaches the vault: the host's admission rule decides first. */
  private PasswordVaultAccess vault(PluginCall call) {
    if (!PasswordVaultGate.admitted(getContext())) { call.reject("Saved passwords are not available here", "not-admitted"); return null; }
    return access(call);
  }

  private void fail(PluginCall call, Exception failure) {
    if (failure instanceof PasswordVaultStore.RevisionConflict) call.reject("This password changed. Reload it first", "conflict");
    else if (failure instanceof PasswordVaultGate.NotAdmitted) call.reject("Saved passwords are not available here", "not-admitted");
    else if (failure instanceof PasswordVaultAccess.Locked || failure instanceof PasswordVaultGate.Locked) call.reject("Unlock saved passwords first", "locked");
    else if (failure instanceof PasswordVaultAccess.KeyInvalidated) call.reject("Saved passwords can no longer be decrypted on this device", "key-invalidated");
    else if (failure instanceof java.io.IOException && failure.getMessage() != null && SAFE_MESSAGES.contains(failure.getMessage())) call.reject(failure.getMessage(), "invalid");
    else call.reject("Saved passwords are unavailable", "unavailable");
  }

  /** Store validation messages are fixed strings; anything else is reported generically. */
  private static final List<String> SAFE_MESSAGES = java.util.Arrays.asList("Enter a name", "Enter a shorter username", "Enter a password",
    "Add at least one website or app", "Password no longer exists", "Password vault is full", "Use an HTTPS website address without a path", "Invalid binding",
    "Invalid app package", "Invalid app signing certificate", "Saved passwords are not damaged");

  @PluginMethod public void status(PluginCall call) {
    PasswordVaultAccess access = access(call); if (access == null) return;
    JSObject result = new JSObject();
    android.app.KeyguardManager keyguard = getContext().getSystemService(android.app.KeyguardManager.class);
    boolean secure = keyguard != null && keyguard.isDeviceSecure();
    result.put("available", secure);
    if (!secure) result.put("reason", "no-screen-lock");
    long remaining = access.remainingMillis();
    result.put("locked", remaining <= 0);
    result.put("unlockRemainingMs", remaining);
    result.put("unlockSeconds", access.config.unlockSeconds);
    result.put("biometric", access.config.biometric);
    JSObject autofill = new JSObject();
    autofill.put("supported", JSObject.NULL);
    autofill.put("selected", "unknown");
    try {
      AutofillManager manager = getContext().getSystemService(AutofillManager.class);
      if (manager != null) {
        autofill.put("supported", manager.isAutofillSupported());
        ComponentName service = manager.getAutofillServiceComponentName();
        autofill.put("selected", service == null ? "none" : getContext().getPackageName().equals(service.getPackageName()) ? "this-app" : "other");
      }
    } catch (RuntimeException unavailable) { /* Remains unknown; never inferred. */ }
    result.put("autofill", autofill);
    call.resolve(result);
  }

  @PluginMethod public void unlock(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    Activity activity = getActivity();
    if (activity == null) { call.reject("Saved passwords are unavailable", "unavailable"); return; }
    activity.runOnUiThread(() -> PasswordUnlock.prompt(activity, new PasswordUnlock.Result() {
      @Override public void unlocked(long ticket) { unlockTicket = ticket; JSObject result = new JSObject(); result.put("unlocked", true); result.put("unlockRemainingMs", access.remainingMillis()); call.resolve(result); }
      @Override public void failed(String code) { call.reject("cancelled".equals(code) ? "Unlock was cancelled" : "no-screen-lock".equals(code) ? "Set a screen lock to use saved passwords" : "Unlock is unavailable", code); }
    }));
  }

  @PluginMethod public void lock(PluginCall call) {
    PasswordVaultAccess access = access(call); if (access == null) return;
    access.lock();
    PasswordVaultGate.closeSurfaces();
    JSObject result = new JSObject(); result.put("locked", true); call.resolve(result);
  }

  @PluginMethod public void list(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    try {
      JSONArray entries = access.use(PasswordVaultStore::entries);
      JSArray out = new JSArray();
      for (int i = 0; i < entries.length(); i++) out.put(summary(entries.getJSONObject(i)));
      JSObject result = new JSObject(); result.put("entries", out); call.resolve(result);
    } catch (Exception failure) { fail(call, failure); }
  }

  /** Allowlisted metadata only; built field by field so a stored secret can never be copied out. */
  private JSObject summary(JSONObject entry) throws Exception {
    JSObject item = new JSObject();
    item.put("id", entry.getString("id"));
    item.put("label", entry.getString("label"));
    item.put("username", entry.getString("username"));
    item.put("updatedAt", entry.optLong("updatedAt", 0));
    item.put("revision", entry.optLong("revision", 0));
    JSArray bindings = new JSArray();
    for (String facet : PasswordVaultStore.bindings(entry)) {
      JSObject binding = new JSObject();
      binding.put("kind", PasswordFacets.isAndroid(facet) ? "android" : "web");
      binding.put("facet", facet);
      binding.put("display", PasswordSheet.bindingLabel(getContext(), facet));
      bindings.put(binding);
    }
    item.put("bindings", bindings);
    return item;
  }

  @PluginMethod public void save(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    if (!access.config.bridgeAcceptsSecrets && !PasswordEditorPolicy.metadataOnly(call.getData().keys(), call.getData().opt("id"))) {
      call.reject("Passwords are entered only in the protected form", "invalid"); return;
    }
    try {
      String id = call.getString("id"), label = call.getString("label", ""), username = call.getString("username", "");
      String password = call.getString("password");
      JSObject generate = call.getObject("generate");
      if (password != null && generate != null) { call.reject("Choose a typed or generated password", "invalid"); return; }
      List<String> requested = new ArrayList<>();
      JSArray websites = call.getArray("websites", new JSArray());
      for (int i = 0; i < websites.length(); i++) requested.add(PasswordFacets.web(websites.getString(i)));
      JSArray keep = call.getArray("keepBindings", new JSArray());
      String generated = generate == null ? null : PasswordGenerator.generate(new PasswordGenerator.Options(
        generate.getInteger("length", PasswordGenerator.DEFAULT_LENGTH), generate.getBoolean("lowercase", true), generate.getBoolean("uppercase", true),
        generate.getBoolean("digits", true), generate.getBoolean("symbols", true)), RANDOM);
      String saved = access.use(store -> {
        LinkedHashSet<String> bindings = new LinkedHashSet<>();
        List<String> existing = new ArrayList<>();
        if (id != null) existing = PasswordVaultStore.bindings(store.get(id));
        for (int i = 0; i < keep.length(); i++) {
          String facet = PasswordFacets.normalize(keep.getString(i));
          // App bindings are created only by a verified save capture; the UI can keep or drop
          // them but never mint one for an arbitrary package.
          if (PasswordFacets.isAndroid(facet) && !existing.contains(facet)) throw new java.io.IOException("Invalid binding");
          bindings.add(facet);
        }
        bindings.addAll(requested);
        return store.saveEntry(id, label, username, new ArrayList<>(bindings), generated != null ? generated : password);
      });
      JSObject result = new JSObject(); result.put("id", saved);
      if (generated != null) { result.put("generated", true); result.put("length", generated.length()); }
      call.resolve(result);
    } catch (IllegalArgumentException invalid) {
      call.reject("Choose a length from 8 to 128 with at least one character type", "invalid");
    } catch (Exception failure) { fail(call, failure); }
  }

  /**
   * Native-only create or edit: neither draft fields nor generated values cross the bridge. An
   * edit names one entry at one revision and resolves with only the id and new revision.
   */
  @PluginMethod public void openEditor(PluginCall call) {
    PasswordEditorPolicy.Request request;
    try { request = PasswordEditorPolicy.admit(call.getData().keys(), call.getData().opt("entryId"), call.getData().opt("expectedRevision")); }
    catch (IllegalArgumentException invalid) { call.reject("Editor does not accept draft fields", "invalid"); return; }
    PasswordVaultAccess access = vault(call); if (access == null) return;
    Activity activity = getActivity();
    if (activity == null) { call.reject("Saved passwords are unavailable", "unavailable"); return; }
    long ticket = access.ticket();
    activity.runOnUiThread(() -> {
      try {
        PasswordEditor.open(activity, access, ticket, request, new PasswordEditor.Result() {
          public void saved(String id, long revision) { JSObject result = new JSObject(); result.put("status", "saved"); result.put("id", id); result.put("revision", revision); call.resolve(result); }
          public void cancelled() { JSObject result = new JSObject(); result.put("status", "cancelled"); call.resolve(result); }
        });
      } catch (PasswordEditor.Busy busy) { call.reject("Finish the current editor first", "busy"); }
      catch (Exception failure) { fail(call, failure); }
    });
  }

  private static Long expectedRevision(PluginCall call) {
    if (!call.getData().has("expectedRevision")) return null;
    Object value = call.getData().opt("expectedRevision");
    if (value instanceof Integer || value instanceof Long) {
      long revision = ((Number) value).longValue();
      if (revision >= 0 && revision <= 9_007_199_254_740_991L) return revision;
    }
    throw new IllegalArgumentException("Invalid revision");
  }

  @PluginMethod public void remove(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    String id = call.getString("id");
    if (id == null) { call.reject("Choose a saved password", "invalid"); return; }
    try {
      Long revision = expectedRevision(call);
      PasswordVaultGate.useForOwner(getContext(), access, access.ticket(), store -> {
        store.removeExisting(id, revision);
        return null;
      });
      JSObject result = new JSObject(); result.put("removed", true); call.resolve(result);
    } catch (IllegalArgumentException invalid) { call.reject("Invalid revision", "invalid"); }
    catch (Exception failure) { fail(call, failure); }
  }

  /** Deletes the vault only when its key is lost or invalidated (see PasswordVaultStore). */
  @PluginMethod public void reset(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    try {
      access.resetUnrecoverable();
      JSObject result = new JSObject(); result.put("reset", true); call.resolve(result);
    } catch (Exception failure) { fail(call, failure); }
  }

  @PluginMethod public void reveal(PluginCall call) { secret(call, true); }
  @PluginMethod public void copy(PluginCall call) { secret(call, false); }

  private void secret(PluginCall call, boolean reveal) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    String id = call.getString("id");
    Activity activity = getActivity();
    if (id == null || activity == null) { call.reject("Choose a saved password", "invalid"); return; }
    try {
      long ticket = access.ticket();
      Long revision = expectedRevision(call);
      activity.runOnUiThread(() -> {
        try {
          if (activity.isFinishing() || activity.isDestroyed() || !activity.hasWindowFocus()) throw new PasswordVaultGate.Locked();
          JSObject result = new JSObject();
          PasswordVaultGate.useForOwner(activity, access, ticket, store -> store.useRecord(id, revision, record -> {
            String value = record.getString("password");
            if (reveal) {
              String label = record.optString("label", record.optString("origin", ""));
              SecretSurfaces.revealOwned(activity, label, value,
                () -> access.unlocked(ticket) && PasswordVaultGate.admitted(activity));
              result.put("shown", true);
              result.put("hidesAfterMs", SecretSurfaces.REVEAL_MILLIS);
            } else {
              SecretSurfaces.copy(activity, value);
              result.put("copied", true);
              result.put("clearsAfterMs", SecretSurfaces.CLIPBOARD_MILLIS);
            }
            return null;
          }));
          call.resolve(result);
        } catch (Exception failure) { fail(call, failure); }
      });
    } catch (IllegalArgumentException invalid) { call.reject("Invalid revision", "invalid"); }
    catch (Exception failure) { fail(call, failure); }
  }

  /** Whether a shared backup can be offered now (`{ready}`): an admitted vault, a signed-in account and the Cloud's backup for this exact native app. Opens no challenge. */
  @PluginMethod public void sharedBackupReadiness(PluginCall call) {
    if (!PasswordVaultGate.admitted(getContext())) { JSObject result = new JSObject(); result.put("ready", false); call.resolve(result); return; }
    try {
      backupWorker.execute(() -> {
        JSObject result = new JSObject();
        result.put("ready", !destroyed && new PasswordSharedBackup(getContext()).ready());
        call.resolve(result);
      });
    } catch (RejectedExecutionException stopped) { call.reject("Saved passwords are unavailable", "unavailable"); }
  }

  /**
   * Backs the unlocked vault up to the signed-in account's shared Cloud backup (`{saved, revision?}`):
   * one fresh Google proof from the system account picker, the owner's native confirmation, then one
   * save sealed on this phone. A changed account, a locked vault or a closed screen ends it.
   */
  @PluginMethod public void approveSharedBackup(PluginCall call) {
    PasswordVaultAccess access = vault(call); if (access == null) return;
    if (!access.unlocked()) { call.reject("Unlock saved passwords first", "locked"); return; }
    if (!backupBusy.compareAndSet(false, true)) { call.reject("A backup is already in progress", "busy"); return; }
    AtomicBoolean declined = new AtomicBoolean();
    backupStep(call, declined, () -> {
      PasswordSharedBackup backup = new PasswordSharedBackup(getContext());
      PasswordSharedBackup.Account account = backup.account();
      if (account == null) throw new PasswordSharedBackup.Refused("Sign in to back up saved passwords", "signed-out");
      BooleanSupplier active = () -> !destroyed && access.unlocked() && backup.current(account);
      SharedPasswordBackup.Attempt attempt = PasswordSharedBackup.service().begin(PasswordBackupApproval.Purpose.SAVE, account.owner, active);
      Activity activity = getActivity();
      if (activity == null || destroyed) throw new PasswordSharedBackup.Refused("Saved passwords are unavailable", "unavailable");
      android.os.CancellationSignal cancellation = new android.os.CancellationSignal();
      backupCancellation = cancellation;
      backupPicker = true;
      activity.runOnUiThread(() -> GoogleSignIn.pick(activity, attempt.challenge(), cancellation, picked -> {
        backupPicker = false;
        backupStep(call, declined, () -> {
          if (!(picked instanceof GoogleSignIn.Picked.Token token)) throw new PasswordSharedBackup.Refused("Backup was cancelled", "cancelled");
          PasswordBackupApproval approval = attempt.approve(token, () -> confirmBackup(activity, active, declined));
          PasswordBackupApproval.Response response = backup.save(approval, access, active);
          if (response.status() == 409 || response.status() == 412) throw new PasswordSharedBackup.Refused("The backup changed. Try again", "conflict");
          if (response.status() < 200 || response.status() >= 300) throw new PasswordSharedBackup.Refused("The backup wasn’t saved", "unavailable");
          backupBusy.set(false);
          JSObject result = new JSObject();
          result.put("saved", true);
          if (response.revision() != null) result.put("revision", response.revision());
          call.resolve(result);
        });
      }));
    });
  }

  private interface BackupStep { void run() throws Exception; }

  private void backupStep(PluginCall call, AtomicBoolean declined, BackupStep step) {
    try { backupWorker.execute(() -> { try { step.run(); } catch (Exception failure) { backupFailed(call, declined, failure); } }); }
    catch (RejectedExecutionException stopped) { backupFailed(call, declined, stopped); }
  }

  private void backupFailed(PluginCall call, AtomicBoolean declined, Exception failure) {
    backupPicker = false;
    backupBusy.set(false);
    if (declined.get()) call.reject("Backup was cancelled", "cancelled");
    else if (failure instanceof PasswordSharedBackup.Refused refused) call.reject(refused.getMessage(), refused.code);
    else if (failure instanceof PasswordVaultAccess.Locked || failure instanceof PasswordVaultGate.Locked) call.reject("Unlock saved passwords first", "locked");
    else call.reject("The backup wasn’t saved", "unavailable");
  }

  /** The owner's native confirmation of this one backup, shown on the unlocked phone; false when declined, dismissed, timed out or no longer current. */
  private boolean confirmBackup(Activity activity, BooleanSupplier active, AtomicBoolean declined) {
    if (!active.getAsBoolean() || activity.isFinishing() || activity.isDestroyed()) return false;
    CountDownLatch answered = new CountDownLatch(1);
    AtomicBoolean confirmed = new AtomicBoolean();
    android.app.AlertDialog[] shown = {null};
    activity.runOnUiThread(() -> {
      if (destroyed || activity.isFinishing() || activity.isDestroyed()) { answered.countDown(); return; }
      shown[0] = new android.app.AlertDialog.Builder(activity)
        .setTitle(R.string.alpha_passwords_backup_title)
        .setMessage(activity.getString(R.string.alpha_passwords_backup_message, CloudDeployment.PRODUCTION_NAME))
        .setNegativeButton(R.string.alpha_passwords_cancel, (dialog, which) -> declined.set(true))
        .setPositiveButton(R.string.alpha_passwords_backup_confirm, (dialog, which) -> confirmed.set(
          !((android.app.KeyguardManager) activity.getSystemService(android.content.Context.KEYGUARD_SERVICE)).isDeviceLocked()))
        .setOnDismissListener(dialog -> answered.countDown())
        .create();
      shown[0].show();
    });
    boolean settled;
    try { settled = answered.await(BACKUP_CONFIRM_MILLIS, TimeUnit.MILLISECONDS); }
    catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); settled = false; }
    if (!settled) activity.runOnUiThread(() -> { if (shown[0] != null) shown[0].dismiss(); });
    if (!confirmed.get() && settled) declined.set(true);
    return settled && confirmed.get() && active.getAsBoolean();
  }

  /** Android's own confirmation selects the provider; nothing is set or inferred here. */
  @PluginMethod public void openAutofillSettings(PluginCall call) {
    Activity activity = getActivity();
    JSObject result = new JSObject();
    try {
      activity.startActivity(new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE, Uri.parse("package:" + getContext().getPackageName())));
      result.put("status", "opened"); result.put("destination", "autofill-picker");
    } catch (ActivityNotFoundException | SecurityException missing) {
      try { activity.startActivity(new Intent(Settings.ACTION_SETTINGS)); result.put("status", "opened"); result.put("destination", "system-settings"); }
      catch (RuntimeException unavailable) { call.reject("Android settings are unavailable", "unavailable"); return; }
    }
    call.resolve(result);
  }

  @Override protected void handleOnStop() {
    super.handleOnStop();
    try {
      PasswordVaultAccess access = PasswordVaultAccess.get(getContext());
      // The device-credential screen stops the host while an unlock is pending; keep that one.
      if (!access.pending() && !backupPicker) access.lock(unlockTicket);
    } catch (Exception ignored) { /* Nothing to lock. */ }
    PasswordEditor.dismiss(getActivity());
    SecretSurfaces.dismiss();
  }

  @Override protected void handleOnResume() {
    super.handleOnResume();
    if (getActivity() != null) SecretSurfaces.resume(getActivity());
  }

  @Override protected void handleOnDestroy() {
    destroyed = true;
    android.os.CancellationSignal cancellation = backupCancellation;
    if (cancellation != null) cancellation.cancel();
    backupWorker.shutdownNow();
    try { PasswordVaultAccess.get(getContext()).lock(unlockTicket); }
    catch (Exception ignored) { /* Nothing to lock. */ }
    PasswordEditor.dismiss(getActivity());
    SecretSurfaces.dismiss();
    super.handleOnDestroy();
  }
}
