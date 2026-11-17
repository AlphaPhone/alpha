/** Product-owned renderer routes. The resident validates this host-supplied policy. */
type NativeView = [id: string, label: string, aliases?: string[]];
// Aliases are the other names an owner says for a destination ("open my email"); the
// resident accepts at most four per view and refuses one that names another destination.
const declarations = (views: NativeView[], plugin: (id: string) => string) =>
  views.map(([id, label, aliases]) => ({
    id,
    label,
    path: `/${id}`,
    fallbackFor: plugin(id),
    ...(aliases ? { aliases } : {}),
  }));
const nativeViews = declarations([
  ['photos', 'Photos', ['gallery', 'pictures', 'photo library']],
  ['maps', 'Maps', ['map']],
  ['camera', 'Camera'],
  ['notes', 'Notes', ['notepad']],
  ['calendar', 'Calendar'],
  ['inbox', 'Inbox', ['email', 'mail', 'emails']],
], id => `@elizaos/plugin-${id}`);
// Alpha draws Phone, Messages and Contacts only on its verified AOSP image.
const imageViews = declarations([
  ['phone', 'Phone', ['dialer']],
  ['messages', 'Messages', ['sms', 'texts', 'text messages']],
  ['contacts', 'Contacts', ['address book']],
], id => `@elizaos/plugin-native-${id}`);

// The resident environment and APK asset use the same byte-exact representation.
export const nativeViewDeclarationsJson = JSON.stringify(nativeViews, null, 2) + '\n';
/** The policy for the verified Alpha image: every destination above plus the image's own. */
export const imageNativeViewDeclarationsJson = JSON.stringify([...nativeViews, ...imageViews], null, 2) + '\n';

if (import.meta.main) process.stdout.write(nativeViewDeclarationsJson);
