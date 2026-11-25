// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"; spec/app/contacts/index.md, "Confirming deletes the contact that was shown"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.contacts.AddressBookPlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "ElizaContacts", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS })
})
public final class AlphaContactsPlugin extends AddressBookPlugin {
 @Override protected boolean admitted() { return AlphaImageCapability.verified(getContext()); }

 @Override protected DeletionWindow deletionWindow() {
  return (kind, target) -> AlphaTelephonyDeletions.stage(getContext(), kind, target);
 }
}
