package ai.alphacompute.thinapp;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.TelephonyPlugin;
import android.Manifest;
import android.annotation.SuppressLint;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Thin standalone {@code ElizaTelephony} plugin exposing calls, SMS/MMS, and Alpha's dialer helpers. */
@CapacitorPlugin(name = "ElizaTelephony", permissions = {
    @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
    @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
    @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
    @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
    @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public final class ThinTelephonyPlugin extends TelephonyPlugin {
    @Override protected SmsTelephonyConfiguration configuration() {
        return ThinTelephonyConfig.CONFIGURATION;
    }

    @SuppressLint("MissingPermission")
    @PluginMethod public void classifyDialNumber(PluginCall call) {
        String number = call.getString("number", "");
        if (number == null || !NUMBER.matcher(number).matches()) {
            call.reject("Not a dialable phone number", "invalid");
            return;
        }
        String kind;
        try {
            TelephonyManager phone = getContext().getSystemService(TelephonyManager.class);
            kind = phone == null ? "unknown" : phone.isEmergencyNumber(number) ? "emergency" : "ordinary";
        } catch (RuntimeException unreadable) {
            kind = "unknown";
        }
        call.resolve(new JSObject().put("kind", kind));
    }

    @PluginMethod public void ownerDialScreen(PluginCall call) {
        super.dial(call);
    }

    @PluginMethod public void smsDraftPending(PluginCall call) {
        call.resolve(new JSObject());
    }

    @PluginMethod public void acknowledgeSmsDraft(PluginCall call) {
        call.resolve();
    }

    @PluginMethod public void smsNoticePending(PluginCall call) {
        call.resolve(new JSObject());
    }

    @PluginMethod public void acknowledgeSmsNotice(PluginCall call) {
        call.resolve();
    }
}
