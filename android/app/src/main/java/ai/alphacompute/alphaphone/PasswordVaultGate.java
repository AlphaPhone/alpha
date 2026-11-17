package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordVaultAccess;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Handler;
import android.os.Looper;
import java.security.MessageDigest;

/**
 * Alpha's side of the shared vault custody ({@link PasswordVaultAccess} and its store stay in
 * plugin-native-passwords): the admission rule Alpha's password screens ask first, the signer
 * checks they bind app sign-ins with, and closing Alpha's own secret screens. Nothing here shows UI.
 */
final class PasswordVaultGate {
  private PasswordVaultGate() {}

  /** The vault is locked or the screen asking for it is gone. Reported to the renderer as {@code locked}. */
  static final class Locked extends Exception { Locked() { super("Saved passwords are locked", null, false, false); } }

  private static volatile PasswordVaultAccess.Admission admission = context -> true;
  /**
   * Registers Alpha's rule for whether the vault may be reached now, once, from
   * {@code Application#onCreate}. Every bridge, Autofill, fill and save entry asks it first and
   * refuses with {@code not-admitted}. It also becomes the shared custody's rule, so the two never
   * disagree. It must be fast, must not show UI and returns false when it cannot decide. The
   * default admits.
   */
  static void setAdmission(PasswordVaultAccess.Admission rule) { admission = rule; PasswordVaultAccess.setAdmission(rule); }
  static boolean admitted(Context context) { return admission.admit(context); }

  /** Closes the editor and a revealed secret, on the main thread. */
  static void closeSurfaces() {
    new Handler(Looper.getMainLooper()).post(() -> { PasswordEditor.dismiss(); SecretSurfaces.dismiss(); });
  }

  /** Rotation-aware: the package's signing history includes this SHA-256 certificate digest. */
  static boolean signedBy(Context context, String packageName, String certificateSha256) {
    try {
      byte[] digest = new byte[32];
      for (int i = 0; i < 32; i++) digest[i] = (byte) Integer.parseInt(certificateSha256.substring(i * 2, i * 2 + 2), 16);
      return context.getPackageManager().hasSigningCertificate(packageName, digest, PackageManager.CERT_INPUT_SHA256);
    } catch (RuntimeException unavailable) { return false; }
  }

  /** Current signer digest for a newly captured app binding; null when ambiguous or unavailable. */
  static String currentSigner(Context context, String packageName) {
    try {
      PackageInfo info = context.getPackageManager().getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
      if (info.signingInfo == null || info.signingInfo.hasMultipleSigners()) return null;
      Signature[] history = info.signingInfo.getSigningCertificateHistory();
      if (history == null || history.length == 0) return null;
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(history[history.length - 1].toByteArray());
      StringBuilder out = new StringBuilder(64);
      for (byte value : digest) out.append(Character.forDigit((value >> 4) & 15, 16)).append(Character.forDigit(value & 15, 16));
      return out.toString();
    } catch (Exception unavailable) { return null; }
  }
}
