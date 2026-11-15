import {browserDocuments} from '../browser/documents';
import {MMS_MAX_ATTACHMENTS,MMS_MAX_TOTAL_BYTES} from '../../../../.eliza/client-features/packages/contracts/src/mms-send.ts';

export type SmsDraftPicture={name:string;contentType:"image/jpeg"|"image/png"|"image/gif";dataBase64:string};
export type SmsDraftReference={id:string;recipients:string[];body:string;subscriptionId:number};
export type StoredSmsDraft={id:string;revision:string;thread:string|null;recipients:string;body:string;sim:string;updatedAt:number;pictures:SmsDraftPicture[];sms?:SmsDraftReference;mms?:SmsDraftReference};
export type SmsDraftShelf={load():Promise<StoredSmsDraft[]>;save(draft:StoredSmsDraft,expected:string|null):Promise<void>;remove(id:string,expected:string|null):Promise<void>};
type Documents=Pick<typeof browserDocuments,'read'|'edit'>;
const key='alpha.native.sms.drafts.v1';
const pictureTypes=new Set(['image/jpeg','image/png','image/gif']);
const invalid=()=>new Error('Saved message drafts need recovery. They have not been changed.');
function reference(value:unknown):boolean{
 if(!value||typeof value!=='object')return false;
 const row=value as SmsDraftReference;
 return typeof row.id==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(row.id)&&Array.isArray(row.recipients)&&row.recipients.length>0&&row.recipients.every(number=>typeof number==='string')&&typeof row.body==='string'&&Number.isSafeInteger(row.subscriptionId)&&row.subscriptionId>0;
}
function decode(raw:string|null|undefined):{version:1;items:StoredSmsDraft[]}{
 if(raw===null||raw===undefined)return {version:1,items:[]};
 let data;try{data=JSON.parse(raw);}catch{throw invalid();}
 if(!data||data.version!==1||!Array.isArray(data.items))throw invalid();
 const seen=new Set<string>();
 for(const row of data.items){
  if(!row||typeof row.id!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(row.id)||seen.has(row.id)||typeof row.revision!=='string'||row.thread!==null&&(typeof row.thread!=='string'||!/^thread:[0-9]+$/.test(row.thread))||typeof row.recipients!=='string'||typeof row.body!=='string'||typeof row.sim!=='string'||!Number.isFinite(row.updatedAt)||!Array.isArray(row.pictures)||row.pictures.length>MMS_MAX_ATTACHMENTS||row.sms!==undefined&&!reference(row.sms)||row.mms!==undefined&&!reference(row.mms))throw invalid();
  seen.add(row.id);let bytes=0;
  for(const picture of row.pictures){
   if(!picture||typeof picture.name!=='string'||!pictureTypes.has(picture.contentType)||typeof picture.dataBase64!=='string'||picture.dataBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(picture.dataBase64))throw invalid();
   bytes+=picture.dataBase64.length/4*3-(picture.dataBase64.endsWith('==')?2:picture.dataBase64.endsWith('=')?1:0);
  }
  if(bytes>MMS_MAX_TOTAL_BYTES)throw invalid();
 }
 return data;
}
/** Private Alpha-local UI drafts, not Telephony-provider rows or a send queue. Uses the existing document store. */
export function nativeSmsDraftShelf(documents:Documents=browserDocuments):SmsDraftShelf{
 return {
  async load(){return decode((await documents.read(key))?.raw).items;},
  async save(draft,expected){
   decode(JSON.stringify({version:1,items:[draft]}));
   await documents.edit(key,async before=>{
    const data=decode(before?.raw),prior=data.items.find(row=>row.id===draft.id);
    if((prior?.revision??null)!==expected)throw Error('This message draft changed elsewhere. Your edits are still here.');
    data.items=data.items.filter(row=>row.id!==draft.id);data.items.push(draft);
    return {raw:JSON.stringify(data),result:undefined};
   });
  },
  async remove(id,expected){
   await documents.edit(key,async before=>{
    const data=decode(before?.raw),prior=data.items.find(row=>row.id===id);
    if(!prior)return {raw:before?.raw??null,result:undefined};
    if(prior.revision!==expected)throw Error('A newer message draft was kept.');
    data.items=data.items.filter(row=>row.id!==id);
    return {raw:JSON.stringify(data),result:undefined};
   });
  },
 };
}
