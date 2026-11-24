// spec/app/telephony/messages.md; spec/app/telephony/phone.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.TelephonyPlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "ElizaTelephony", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
 @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
 @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
 @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
 @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public final class AlphaTelephonyPlugin extends TelephonyPlugin {
 @Override protected SmsTelephonyConfiguration configuration() { return AlphaTelephony.CONFIGURATION; }
}
