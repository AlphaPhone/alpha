package ai.alphacompute.alphaphone.browser;

import ai.eliza.plugins.browsersurface.BrowserAutofillExtras;
import ai.eliza.plugins.browsersurface.BrowserHttpAuthOrigin;
import android.content.Context;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.ViewStructure;
import android.view.autofill.AutofillValue;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import androidx.appcompat.widget.AppCompatEditText;
import java.util.function.BooleanSupplier;

/**
 * The username and password fields of Alpha's website sign-in prompt, with origin-bound
 * password-manager fill. The prompt is Alpha's own native window, so without an origin a provider
 * would see only Alpha's package and could save or fill a site password against the app.
 *
 * <p>Fields are offered to Android Autofill only while {@code bound} holds: the prompt has a {@link
 * BrowserHttpAuthOrigin.Binding} from an engine-authenticated challenge and that binding still
 * admits the tab. Each bound field reports the exact HTTPS origin of the challenge (web domain and
 * scheme, the top-level origin extra and the per-field origin extra the provider requires).
 * Otherwise the fields are excluded from Autofill, report no hints or origin even to a manual
 * request, and drop late fill values.
 *
 * <p>Values are never read back here: the provider receives them through Android's framework, and
 * only after the user picks a credential in the provider's own window.
 */
public final class AlphaSignInFields {
  private AlphaSignInFields() {}

  /** A username or password field of the prompt. {@code origin} is null when unbound. */
  public static EditText field(Context context, String origin, BooleanSupplier bound, boolean password,
      BrowserAutofillExtras extras) {
    EditText field = new OriginField(context, extras == null ? null : origin, bound, extras);
    field.setSingleLine(true);
    field.setHint(password ? AlphaBrowserCopy.PASSWORD : AlphaBrowserCopy.USERNAME);
    field.setInputType(InputType.TYPE_CLASS_TEXT
        | (password ? InputType.TYPE_TEXT_VARIATION_PASSWORD : InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS));
    field.setImeOptions(EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING);
    if (origin == null || extras == null) {
      field.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
      return field;
    }
    field.setAutofillHints(password ? View.AUTOFILL_HINT_PASSWORD : View.AUTOFILL_HINT_USERNAME);
    field.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
    return field;
  }

  /** Exclude the prompt's fields from Autofill once their binding is revoked. */
  public static void exclude(View... fields) {
    for (View field : fields)
      if (field != null) field.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
  }

  private static final class OriginField extends AppCompatEditText {
    private final String origin;
    private final BooleanSupplier bound;
    private final BrowserAutofillExtras extras;

    OriginField(Context context, String origin, BooleanSupplier bound, BrowserAutofillExtras extras) {
      super(context);
      this.origin = origin;
      this.bound = bound;
      this.extras = extras;
    }

    private boolean admitted() {
      return origin != null && bound != null && bound.getAsBoolean();
    }

    @Override
    public int getImportantForAutofill() {
      return admitted() ? super.getImportantForAutofill() : View.IMPORTANT_FOR_AUTOFILL_NO;
    }

    @Override
    public int getAutofillType() {
      return admitted() ? super.getAutofillType() : View.AUTOFILL_TYPE_NONE;
    }

    @Override
    public AutofillValue getAutofillValue() {
      return admitted() ? super.getAutofillValue() : null;
    }

    @Override
    public void onProvideAutofillStructure(ViewStructure structure, int flags) {
      super.onProvideAutofillStructure(structure, flags);
      if (!admitted()) {
        structure.setAutofillHints(null);
        structure.setAutofillType(View.AUTOFILL_TYPE_NONE);
        structure.setAutofillValue(null);
        structure.setText("");
        structure.setDataIsSensitive(true);
        return;
      }
      structure.setWebDomain(origin);
      Bundle bundle = structure.getExtras();
      if (bundle == null) return;
      bundle.putString(extras.topOrigin, origin);
      bundle.putString(extras.fieldOrigin, origin);
    }

    @Override
    public void autofill(AutofillValue value) {
      if (admitted()) super.autofill(value);
    }
  }
}
