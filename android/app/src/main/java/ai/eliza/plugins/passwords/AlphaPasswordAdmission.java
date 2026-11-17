package ai.eliza.plugins.passwords;

import android.content.Context;

/**
 * Alpha's read of the shared vault custody's admission rule ({@link PasswordVaultAccess#admitted},
 * package-private in plugin-native-passwords). Alpha's password screens and bridge
 * ({@code ai.alphacompute.alphaphone.PasswordVaultGate}) ask the same rule the Autofill service asks,
 * so there is one rule and one writer. Nothing here has UI or changes the shared behaviour.
 */
public final class AlphaPasswordAdmission {
  private AlphaPasswordAdmission() {}

  /** Whether the vault may be reached now, under the rule {@link PasswordVaultAccess#setAdmission} registered. */
  public static boolean admitted(Context context) { return PasswordVaultAccess.admitted(context); }
}
