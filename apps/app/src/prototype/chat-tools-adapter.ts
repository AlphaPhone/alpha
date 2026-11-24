import {connectionController} from '../runtime/connection-ui';
import {createInlineModal} from '../runtime/inline-modal';
import {Capacitor} from '@capacitor/core';
import {testMocksEnabled} from '../build-flags';

type Shell = Record<string, any>;
/** This app's own replies and review cards that end by sending the owner to history ("… Check
 * history before sending again."). Agent prose that merely mentions history is left alone. */
const HISTORY_HINT = /(?:^|\s)(?:[Cc]heck|Use)(?: phone| connection and| conversation and)? (?:action )?history(?: before (?:trying again|sending again|speaking again|retrying|starting again|requesting it again|sending another request))?\.$/;

/** The composer uses the same file intake and message search as the main Eliza UI. */
export function installChatTools(Component: {prototype: Shell}) {
  const prototype = Component.prototype;
  const render = prototype.renderVals;
  const unmount = prototype.componentWillUnmount;
  const ownerBinding = () => JSON.stringify([
    connectionController.getSnapshot().session,
    connectionController.getCloudEnvironment?.(),
    connectionController.getCloudClient()?.sessionId,
    connectionController.getCloudClient()?.credentialId,
  ]);
  const binding = () => JSON.stringify([
    ownerBinding(),
    connectionController.getSelectedConversationId(),
  ]);

  prototype.renderVals = function() {
    const output = render.call(this);
    const shell = this;
    const owner = ownerBinding();
    if (this.chatToolsOwner !== owner) {
      this.chatSearchAbort?.abort();
      clearTimeout(this.chatSearchTimer);
      this.chatSearchOpen = false;
      this.chatSearchBusy = false;
      this.chatSearchResults = [];
      this.chatSearchError = '';
      this.chatFileTicket = undefined;
      this.chatFileBusy = false;
      this.chatToolsOpen = false;
      this.chatToolsOwner = owner;
    }
    this.fileAttachments ??= [];
    if (output.isOn===false || this.S().secure || document.hidden) {
      this.chatToolsOpen=false;
      this.chatSearchOpen=false;
      this.chatSearchAbort?.abort();
      clearTimeout(this.chatSearchTimer);
      this.chatSearchBusy=false;
      this.chatFileTicket=undefined;
      this.chatFileBusy=false;
    }
    const closeMenu = () => {shell.chatToolsOpen = false;shell.setState({});};
    const closeSearch = () => {
      shell.chatSearchAbort?.abort();
      clearTimeout(shell.chatSearchTimer);
      shell.chatSearchOpen = false;
      shell.chatSearchBusy = false;
      shell.setState({});
    };
    this.chatToolsModal ??= createInlineModal(closeMenu);
    this.chatSearchModal ??= createInlineModal(closeSearch);
    const search = (append = false) => {
      shell.chatSearchAbort?.abort();
      const query = String(shell.chatSearchQuery || '').trim();
      if (query.length < 2) {shell.chatSearchResults = [];shell.chatSearchMore=false;shell.chatSearchError='';shell.chatSearchBusy = false;shell.setState({});return;}
      const abort = shell.chatSearchAbort = new AbortController();
      const owner = binding();
      const current = () => !abort.signal.aborted && shell.live && shell.chatSearchOpen
        && !shell.S().secure && !document.hidden && binding() === owner;
      shell.chatSearchBusy = true;
      shell.chatSearchError = '';
      shell.setState({});
      void connectionController.searchMessages(query, abort.signal, append ? (shell.chatSearchResults?.length || 0) : 0).then(results => {
        if (!current() || shell.chatSearchQuery.trim() !== query) return;
        shell.chatSearchResults = append ? [...shell.chatSearchResults, ...results] : results;
        shell.chatSearchMore = results.length === 50;
      }).catch(error => {
        if (current()) shell.chatSearchError = error instanceof Error ? error.message : 'Search could not finish.';
      }).finally(() => {
        if (shell.chatSearchAbort === abort) {shell.chatSearchBusy = false;shell.setState({});}
      });
    };
    const openResult = async (result: Shell) => {
      const existing = document.querySelector<HTMLElement>(`[data-alpha-message-id="${CSS.escape(result.messageId)}"]`);
      if (!existing && (shell.fileAttachments.length || shell.cameraAttachment || shell.transcriptAttachment || shell.mailAttachment)) {
        shell.chatSearchError = 'Send or remove the attachment before changing chats.';
        shell.setState({});
        return;
      }
      const ownerSession = ownerBinding();
      try {
        if (!existing) {
          await connectionController.restoreHistory(result.conversationId,
            () => shell.live && shell.chatSearchOpen && ownerBinding() === ownerSession,
            result.messageId);
        }
        if (!shell.live || !shell.chatSearchOpen || ownerBinding() !== ownerSession) return;
        if (connectionController.getSelectedConversationId() !== result.conversationId
          || !document.querySelector(`[data-alpha-message-id="${CSS.escape(result.messageId)}"]`)) {
          throw Error('This message could not be opened. Try the search again.');
        }
      } catch (error) {
        if (shell.live && shell.chatSearchOpen && ownerBinding() === ownerSession) {
          shell.chatSearchError = error instanceof Error ? error.message : 'This message could not be opened.';
          shell.setState({});
        }
        return;
      }
      closeSearch();
      shell.setState({chat:'full'}, () => requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-alpha-message-id="${CSS.escape(result.messageId)}"]`);
        target?.scrollIntoView({block:'center',behavior:'smooth'});
        if (target) {target.classList.add('alpha-search-hit');setTimeout(() => target.classList.remove('alpha-search-hit'), 1800);}
      }));
    };
    // New chat and History are reachable from the chat itself, not only from Settings. History opens
    // where conversations live on this build: Settings › About › Agent activity on the phone, the
    // agent connection panel in test builds; no other build has a history surface.
    const connection = connectionController.getSnapshot();
    const historyPage = Capacitor.isNativePlatform() && !testMocksEnabled;
    const attached = () => !!(shell.fileAttachments?.length || shell.cameraAttachment || shell.transcriptAttachment || shell.mailAttachment);
    const newChat = () => {
      closeMenu();
      if (attached()) {shell.toast('Send or remove the attachment before starting a new chat.');return;}
      void connectionController.newConversation();
    };
    const history = () => {
      closeMenu();
      if (historyPage) shell.openView('settings', {page:'agent-activity'});
      else connectionController.open();
    };
    // A reply or review card that tells the owner to check history carries the way there.
    const hasHistory = !!connection.session && (historyPage || testMocksEnabled);
    if (hasHistory && Array.isArray(output.msgs)) output.msgs = output.msgs.map((message: Shell) =>
      message.isAgent && (HISTORY_HINT.test(String(message.displayText || '')) || HISTORY_HINT.test(String(message.c?.sub || '')))
        ? {...message, historyLink: history} : message);
    const turning=!!this.S().typing||!!this.draftSendPending||!!this.composerDraft?.holding;
    const messages=output.messages;
    const attachments=output.showComposer&&output.barTarget==='person'&&(!messages?.nativeManaged||messages.showComposer)?messages?.attachmentMenu:null;
    if((turning&&this.chatToolsOpen==='chat')||(!attachments&&this.chatToolsOpen==='messages'))this.chatToolsOpen=false;
    const inMessages=this.chatToolsOpen==='messages';
    const toggle=(menu:'chat'|'messages')=>{shell.chatToolsOpen=shell.chatToolsOpen===menu?false:menu;shell.setState({});};
    output.chatTools = {
      ...output.chatTools,
      label:inMessages?'Message attachments':'Chat actions',searchable:!inMessages,
      visible:!turning,
      open: !!this.chatToolsOpen,
      disabled:typeof output.attachFiles!=='function'||!!output.attachFilesDisabled||!!this.chatAttachmentAbort,
      fileBusy:!!this.chatAttachmentAbort,
      messageAttachments:!!attachments,
      messageOpen:inMessages,
      messageBusy:!!attachments?.busy,
      toggle:()=>toggle('chat'),
      toggleMessages:()=>toggle('messages'),
      close: closeMenu,
      pointer:(event:Event)=>event.stopPropagation(),
      inside:(event:Event)=>event.stopPropagation(),
      ref: this.chatToolsModal.ref,
      camera:()=>{closeMenu();void attachments?.camera();},
      upload:()=>{closeMenu();if(inMessages){void attachments?.media();}else{output.attachFiles?.();}},
      canNewChat: !!connection.session && !connection.busy,
      newChat,
      hasHistory,
      history,
      search: () => {closeMenu();shell.chatSearchOpen = true;shell.chatSearchQuery = '';shell.chatSearchResults = [];shell.chatSearchMore = false;shell.chatSearchBusy = false;shell.chatSearchError = '';shell.setState({chat:'full'});},
    };
    output.chatSearch = {
      open: !!this.chatSearchOpen,
      query: this.chatSearchQuery || '',
      busy: !!this.chatSearchBusy,
      error: this.chatSearchError || '',
      ref: this.chatSearchModal.ref,
      close: closeSearch,
      inside:(event:Event)=>event.stopPropagation(),
      change: (event: Event) => {
        shell.chatSearchQuery = (event.target as HTMLInputElement).value;
        clearTimeout(shell.chatSearchTimer);
        shell.chatSearchAbort?.abort();
        shell.chatSearchBusy=shell.chatSearchQuery.trim().length>=2;
        shell.chatSearchTimer = setTimeout(() => search(), 250);
        shell.setState({});
      },
      rows: (this.chatSearchResults || []).map((result: Shell) => ({
        id:result.messageId, text:result.snippet || result.text,
        date:new Date(result.createdAt).toLocaleDateString(),
        go:() => {if(!shell.chatSearchBusy)void openResult(result);},
      })),
      more: !!this.chatSearchMore,
      loadMore: () => search(true),
    };
    return output;
  };
  prototype.componentWillUnmount = function(...args: unknown[]) {
    this.chatSearchAbort?.abort();clearTimeout(this.chatSearchTimer);
    this.chatToolsModal?.ref(null);this.chatSearchModal?.ref(null);
    return unmount?.apply(this,args);
  };
}
