import {registerPlugin} from '../platform-plugins';
import {isAndroid} from '../native';
import {createMailBackground,type MailBackgroundNative,type MailBackgroundSelection} from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/background-notices.ts';
import {mailBackgroundMessage} from '../ui/mailbox/background-notices';
export type {MailBackgroundStatus as GmailBackgroundStatus,MailNoticeTap as GmailNoticeTap} from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/background-notices.ts';
/** Installed bridge name and change event; behaviour is @elizaos/plugin-inbox/mailbox (native: plugin-native-notifications), status text is ../ui/mailbox/background-notices. */
export const GMAIL_BACKGROUND_CHANGED='alpha:gmail-background-changed';
let native:MailBackgroundNative|undefined;
const background=createMailBackground({available:isAndroid,native:()=>native??=registerPlugin<MailBackgroundNative>('AlphaGmail'),changed:()=>window.dispatchEvent(new Event(GMAIL_BACKGROUND_CHANGED))});
export const configureGmailBackground=(selection:MailBackgroundSelection|null)=>background.configure(selection);
export const withdrawGmailBackground=(grantId?:string)=>background.withdraw(grantId);
export const retireGmailBackground=(grantId:string)=>background.retire(grantId);
export const gmailBackgroundStatus=()=>background.status();
export const gmailBackgroundMessage=mailBackgroundMessage;
/** Native validates the persisted owner/grant again before returning a tap; renderer validates current UI ownership too. */
export const pendingGmailNotice=()=>background.pending();
export const consumeGmailNotice=(token:string)=>background.consume(token);
export const releaseGmailQuestion=(token:string)=>background.releaseQuestion(token);
export const onGmailNotice=(handler:()=>void)=>background.onNotice(handler);
