/** Files Recent and search index. Device-local, nonsecret metadata only: names,
 * types, times and opaque selection identifiers. Authority stays with Android
 * grants (or the browser file store); a stored row never grants access. A row
 * whose grant has ended is shown as "Select again", never reopened silently. */
export type RecentKind='selected'|'scan-pdf';
export type RecentFile={
  key:string;kind:RecentKind;name:string;mimeType:string;openedAt:number;
  /** Opaque picker capability; absent for exported scan PDFs. */
  selectionId?:string;
  status:'ready'|'revoked'|'saved';
};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export const filesIndexKey='alpha.files.recent.v1';
const filesOpenKey='alpha.files.open.v1';
/** Native SelectedDocumentAccess retains at most 32 grants; Recent stays below it. */
export const RECENT_LIMIT=24;
const kinds=new Set<RecentKind>(['selected','scan-pdf']);
const statuses=new Set(['ready','revoked','saved']);
function clean(value:unknown):RecentFile|undefined{
  const row=value as Partial<RecentFile>|null;
  if(!row||typeof row!=='object'||typeof row.key!=='string'||!row.key||row.key.length>200||!kinds.has(row.kind as RecentKind))return undefined;
  if(typeof row.name!=='string'||!row.name||row.name.length>255||typeof row.mimeType!=='string'||row.mimeType.length>200)return undefined;
  if(!Number.isFinite(row.openedAt)||!statuses.has(String(row.status)))return undefined;
  if(row.selectionId!==undefined&&(typeof row.selectionId!=='string'||!/^[A-Za-z0-9:_-]{1,100}$/.test(row.selectionId)))return undefined;
  return {key:row.key,kind:row.kind as RecentKind,name:row.name,mimeType:row.mimeType,openedAt:Number(row.openedAt),status:row.status as RecentFile['status'],...(row.selectionId?{selectionId:row.selectionId}:{})};
}
function defaultStore():Store|undefined{try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}
export function recentKey(input:{kind:RecentKind;name:string;selectionId?:string}){return input.kind==='selected'&&input.selectionId?'selected:'+input.selectionId:input.kind+':'+input.name;}
export function createFilesIndex(store:Store|undefined=defaultStore(),now:()=>number=()=>Date.now()){
  let memory:RecentFile[]=[],openMemory:string|null=null;
  const read=():RecentFile[]=>{
    if(!store)return memory;
    try{const raw=JSON.parse(store.getItem(filesIndexKey)||'[]');return Array.isArray(raw)?raw.map(clean).filter((row):row is RecentFile=>!!row).slice(0,RECENT_LIMIT):[];}
    catch{return [];}
  };
  const write=(rows:RecentFile[])=>{memory=rows;if(!store)return;try{store.setItem(filesIndexKey,JSON.stringify(rows));}catch{/* Recent is a convenience; access is unaffected. */}};
  return {
    list:()=>read().sort((a,b)=>b.openedAt-a.openedAt),
    has:(selectionId:string)=>read().some(row=>row.selectionId===selectionId),
    /** Insert or refresh a row. Returns selection IDs replaced or evicted past
     * the limit so the caller can release their grants. */
    record(input:Omit<RecentFile,'key'|'openedAt'|'status'>&{status?:RecentFile['status']}):string[]{
      const row=clean({...input,key:recentKey(input),openedAt:now(),status:input.status??(input.kind==='scan-pdf'?'saved':'ready')});
      if(!row)return [];
      // The same row replaces its older grant. Picked files match only by selection: two
      // files may share a name.
      const previous=read(),same=(old:RecentFile)=>old.key===row.key;
      const rows=[row,...previous.filter(old=>!same(old))],replaced=previous.filter(same);
      const kept=rows.slice(0,RECENT_LIMIT),evicted=[...replaced,...rows.slice(RECENT_LIMIT)];
      write(kept);
      return evicted.flatMap(old=>old.selectionId&&!kept.some(k=>k.selectionId===old.selectionId)?[old.selectionId]:[]);
    },
    remove(key:string){const rows=read(),gone=rows.find(row=>row.key===key);write(rows.filter(row=>row.key!==key));return gone;},
    /** The selection showing when the app last closed, so a restart restores only that one. */
    open():string|null{if(!store)return openMemory;try{const value=store.getItem(filesOpenKey);return value&&/^[A-Za-z0-9:_-]{1,100}$/.test(value)?value:null;}catch{return null;}},
    setOpen(selectionId:string|null){openMemory=selectionId;if(!store)return;try{if(selectionId)store.setItem(filesOpenKey,selectionId);else store.removeItem(filesOpenKey);}catch{/* Restore is a convenience. */}},
  };
}
export const filesIndex=createFilesIndex();

type SortMode='recent'|'name';
type SortableEntry={name:string;directory:boolean;modified?:number};
const collator=typeof Intl!=='undefined'?new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}):undefined;
/** Folders first in both modes. Recent: newest modified first, unknown times
 * last, then name. Name: natural, case-insensitive order. */
export function compareFilesEntries(mode:SortMode){
  const byName=(a:SortableEntry,b:SortableEntry)=>(collator?collator.compare(a.name,b.name):a.name.toLowerCase().localeCompare(b.name.toLowerCase()))||(a.name<b.name?-1:a.name>b.name?1:0);
  return (a:SortableEntry,b:SortableEntry)=>{
    if(a.directory!==b.directory)return a.directory?-1:1;
    if(mode==='recent'){
      const am=Number.isFinite(a.modified)&&a.modified!>0?a.modified!:-1,bm=Number.isFinite(b.modified)&&b.modified!>0?b.modified!:-1;
      if(am!==bm)return bm-am;
    }
    return byName(a,b);
  };
}
