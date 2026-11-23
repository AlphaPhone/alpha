import {Capacitor} from '@capacitor/core';
import type {BrowserJsonDomainDocument} from '../browser/json-domain-document';
import {isRecord} from '../lib/parse.ts';

const conversationSelectionKey='alpha.connection.conversations.v1';
export type ConversationChoice={id:string;revision?:string};
type Choices=Record<string,string|ConversationChoice>;
const isChoice=(item:unknown):item is ConversationChoice=>isRecord(item)&&typeof item.id==='string'&&!!item.id&&Object.keys(item).every(k=>k==='id'||k==='revision')&&(item.revision===undefined||typeof item.revision==='string'&&!!item.revision);
function validate(value:unknown):Choices{
 if(value===null)return {};
 if(!isRecord(value))throw Error('Conversation selections need recovery.');
 for(const [key,item] of Object.entries(value)){
  if(!key)throw Error('Conversation selection owner is invalid.');
  if(!isChoice(typeof item==='string'?{id:item}:item))throw Error('Conversation selections need recovery.');
 }
 return value as Choices;
}
const choice=(values:Choices,key:string):ConversationChoice|null=>{const item=Object.hasOwn(values,key)?values[key]:undefined;return item===undefined?null:typeof item==='string'?{id:item}:{...item};};
let document:Promise<BrowserJsonDomainDocument>|undefined;
export async function conversationSelectionDocument(){
 if(Capacitor.getPlatform()==='android')throw Error('Browser conversation recovery is unavailable on this device.');
 return document??=import('../browser/json-domain-document').then(({BrowserJsonDomainDocument})=>new BrowserJsonDomainDocument(conversationSelectionKey));
}
/** Android's selection read stays synchronous so its publication fence has no await gap. */
export function captureConversationChoice(key:string,signal?:AbortSignal){
 signal?.throwIfAborted();
 if(Capacitor.getPlatform()==='android')return choice(validate(JSON.parse(localStorage.getItem(conversationSelectionKey)||'null')),key);
 return conversationSelectionDocument().then(document=>document.readJson(signal)).then(values=>{signal?.throwIfAborted();return choice(validate(values),key);});
}
/** Update one captured owner's restart choice. Visible chats remain tab-local. */
export async function selectConversation(key:string,expected:ConversationChoice|null,id:string,signal:AbortSignal,assertCurrent:()=>void){
 const native=Capacitor.getPlatform()==='android';
 const update=(raw:unknown)=>{
  signal.throwIfAborted();assertCurrent();const values=validate(raw);
  if(JSON.stringify(choice(values,key))!==JSON.stringify(expected))throw Error('Another view changed this conversation selection.');
  return {...values,[key]:native?id:{id,revision:crypto.randomUUID()}};
 };
 signal.throwIfAborted();
 if(native)localStorage.setItem(conversationSelectionKey,JSON.stringify(update(JSON.parse(localStorage.getItem(conversationSelectionKey)||'null'))));
 else await(await conversationSelectionDocument()).editJson(update,signal);
}
