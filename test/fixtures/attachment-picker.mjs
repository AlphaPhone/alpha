import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from '../support/strip-types.mjs';

const path=new URL('../../apps/app/src/prototype/attachment-picker.ts',import.meta.url);
export const attachmentPickerSources=[path.pathname,new URL(import.meta.url).pathname,new URL('../support/strip-types.mjs',import.meta.url).pathname];
export function attachmentPickerFixture({holdRead=false,holdSelect=false}={}) {
  let owner=0,conversation=0,sequence=0,readCalls=0,selectCalls=0;
  let picker,lastCompleted=0;
  const leases=new Set(),reads=[],selections=[],results=[],selecting=new Set(),reading=new Set(),admitted=new Set(),ticketEpochs=new Map(),ticketScopes=new Map();
  const doc=Object.assign(new EventTarget(),{hidden:false,activeElement:null,querySelector:()=>null});
  const entries=[0,1].map(n=>({path:'pick-'+n+'.txt',name:'pick-'+n+'.txt',directory:false,mimeType:'text/plain',size:4,modified:n+1}));
  const storage={
    async storageState(){return {status:'ready',access:'granted',volumes:[]};},
    async storageList(){return {status:'ready',entries};},
    async storageQuery(){return {status:'ready',entries};},
    async storageRequestAccess(){return {status:'ready'};},
    async storageSelect(input){
      assert.ok(entries.some(row=>row.path===input.path));selectCalls++;
      const ticket=++sequence,selectionId='selection-'+ticket;leases.add(selectionId);selecting.add(ticket);ticketEpochs.set(ticket,picker.epoch);ticketScopes.set(ticket,owner^conversation);
      if(holdSelect)await new Promise(resolve=>selections.push(resolve));
      selecting.delete(ticket);
      return {status:'selected',selectionId};
    },
    async attachment(input){
      assert.equal(input.purpose,'chat');assert.ok(leases.has(input.selectionId));readCalls++;
      const ticket=Number(input.selectionId.slice('selection-'.length));reading.add(ticket);admitted.add(ticket);
      try{if(holdRead)await new Promise((resolve,reject)=>reads.push({resolve,reject}));return {name:'pick.txt',mimeType:'text/plain',dataBase64:'dGVzdA=='};}
      finally{reading.delete(ticket);lastCompleted=ticket;}
    },
  };
  const source=readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replace('export class ChatAttachmentPicker','class ChatAttachmentPicker')+'\nglobalThis.Picker=ChatAttachmentPicker;';
  const context=vm.createContext({
    registerPlugin:()=>storage,Capacitor:{isNativePlatform:()=>false},
    createInlineModal:()=>({ref(){}}),inputFiles:()=>assert.fail('No system chooser in this trace'),
    DailyApps:{async forgetSelected({selectionId}){assert.ok(leases.delete(selectionId));}},
    libraryAvailable:()=>true,library:{async list(){return {items:[],next:''};}},
    compareFilesEntries:()=>()=>0,parentOf:path=>path.split('/').slice(0,-1).join('/'),
    formatSize:size=>String(size),isSupportedChatUpload:file=>file.type==='text/plain',
    CHAT_UPLOAD_ACCEPT:'text/plain',MAX_ATTACHMENTS_TOTAL_BYTES:60*1024*1024,
    document:doc,File,Error,DOMException,atob,setTimeout,clearTimeout,crypto,
  });
  vm.runInContext(stripTypeScriptTypes(source),context,{filename:path.pathname});
  picker=new context.Picker(()=>{},storage);
  const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
  const scope=()=>JSON.stringify([owner,conversation]);
  return {
    picker,leases,results,
    createPicker(changed){picker=new context.Picker(changed,storage);return picker;},
    async open(maximum=2){const captured=scope(),result={files:undefined,scope:captured};results.push(result);void picker.choose(new AbortController().signal,maximum,()=>scope()===captured).then(files=>{result.files=files;if(files.length){result.ticket=lastCompleted;result.epoch=ticketEpochs.get(lastCompleted);}});await flush();},
    async files(){picker.view().filesTab();await flush();},
    select(index=0){picker.view().rows[index].choose();},
    async attach(){picker.view().attach();await flush();},
    async cancel(){picker.view().close();await flush();},
    async switchOwner(){owner=1-owner;picker.view();await flush();},
    async switchConversation(){conversation=1-conversation;picker.view();await flush();},
    async hide(){doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));await flush();},
    async releaseSelect(){assert.ok(selections.length);selections.shift()();await flush();},
    async releaseRead(success=true,index=0){assert.ok(reads.length>index);const [read]=reads.splice(index,1);success?read.resolve():read.reject(Error('This file could not be read. Select it again.'));await flush();},
    modelState(){const result=results.at(-1),captured=result?JSON.parse(result.scope):[-1,0],queued=result?.files?.length||0;return {
      phase:picker.opened?(picker.reading?'reading':'browsing'):'closed',scope:owner^conversation,heldScope:captured[0]^captured[1],epoch:picker.epoch,
      selected:[...picker.selected.values()].map(row=>Number(row.entry.path.match(/pick-([01])/)[1])),
      ticketCount:selectCalls,selecting,reading,ticketEpochs:Array.from({length:4},(_,n)=>[n,ticketEpochs.get(n)??-1]),ticketScopes:Array.from({length:4},(_,n)=>[n,ticketScopes.get(n)??-1]),admitted,
      queuedCount:queued,queuedTicket:queued?result.ticket:0,queuedEpoch:queued?result.epoch:-1,queuedScope:queued?(captured[0]^captured[1]):-1,
    };},
    inspect(){return {open:picker.view().open,reading:picker.view().reading,error:picker.view().error,selected:picker.selected.size,
      leaseCount:leases.size,readCalls,selectCalls,queued:results.at(-1)?.files?.length??0,
      settled:results.at(-1)?.files!==undefined,epoch:picker.epoch};},
  };
}
