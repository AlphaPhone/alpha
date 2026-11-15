import {Capacitor} from '@capacitor/core';
import {registerPlugin} from '../platform-plugins';
import {createInlineModal} from '../runtime/inline-modal';
import {inputFiles} from '../browser/file-picker';
import type {NativeResult} from '../daily';
import {library,libraryAvailable,type SavedPhoto} from './camera-adapter';
import {compareFilesEntries} from './files-index';
import type {FilesStoragePort} from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/files-browser-adapter.ts';
import {formatSize,parentOf,type StorageEntry,type StorageVolume} from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/storage-model.ts';
import {
  CHAT_IMAGE_MIME_TYPE_SET,CHAT_UPLOAD_MIME_TYPES,MAX_CHAT_ATTACHMENT_NAME_LENGTH,
  MAX_CHAT_IMAGE_RAW_BYTES,MAX_CHAT_MEDIA_RAW_BYTES,
} from '../../../../.eliza/client-features/packages/core/src/chat-upload-limits';

const uploadTypes=new Set<string>(CHAT_UPLOAD_MIME_TYPES.filter(type=>!/^(audio|video)\//.test(type)));
const uploadAccept=[...uploadTypes].join(',');
const fileLimit=(mime:string)=>CHAT_IMAGE_MIME_TYPE_SET.has(mime)?MAX_CHAT_IMAGE_RAW_BYTES:MAX_CHAT_MEDIA_RAW_BYTES;
export async function encodeChatAttachment(file:File):Promise<{data:string;mimeType:string;name:string}> {
  if(!accepts(file.name,file.type)||!file.size||file.size>fileLimit(file.type))
    throw Error('Choose a smaller supported photo or document.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  let raw='';
  for(let offset=0;offset<bytes.length;offset+=16384)raw+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  return {data:btoa(raw),mimeType:file.type,name:file.name};
}

type AttachmentBytes={name:string;mimeType:string;dataBase64:string};
type PickerFiles=Pick<FilesStoragePort<NativeResult>,'storageState'|'storageRequestAccess'|'storageList'|'storageQuery'> & {
  storageReviewedIdentities(input:{paths:string[];volume?:string;attachment:true}):Promise<{status:string;reviewed?:string[]}>;
  storageReadAttachment(input:{path:string;volume?:string;reviewed:string}):Promise<AttachmentBytes|{status:string;message?:string}>;
};
const files=registerPlugin<PickerFiles>('AlphaFiles');
type PickerRow=
  | {key:string;kind:'photo';name:string;mimeType:string;size:number;image:string;photo:SavedPhoto}
  | {key:string;kind:'file';name:string;mimeType:string;size:number;image?:undefined;entry:StorageEntry;volume?:string;reviewed?:string}
  | {key:string;kind:'local';name:string;mimeType:string;size:number;image?:undefined;file:File};

const accepts=(name:string,mime:string)=>name.length>0&&name.length<=MAX_CHAT_ATTACHMENT_NAME_LENGTH&&uploadTypes.has(mime);
const revision=(photo:SavedPhoto)=>photo.mutationRevision||photo.revision;
function decodedFile(value:AttachmentBytes):File {
  if(!accepts(value.name,value.mimeType)||value.dataBase64.length>Math.ceil(fileLimit(value.mimeType)/3)*4)
    throw Error('Choose a supported photo or document.');
  const raw=atob(value.dataBase64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new File([bytes],value.name,{type:value.mimeType});
}

/** The picker owns local selection only. The composer still owns intake and sending. */
export class ChatAttachmentPicker {
  private opened=false;
  private tab:'photos'|'files'='photos';
  private path='';
  private volume?:string;
  private volumes:StorageVolume[]=[];
  private query='';
  private rows:PickerRow[]=[];
  private selected=new Map<string,PickerRow>();
  private next='';
  private loading=false;
  private reading=false;
  private error='';
  private fileAccess=false;
  private photoAccess=false;
  private truncated=false;
  private maximum=0;
  private epoch=0;
  private request=0;
  private timer?:ReturnType<typeof setTimeout>;
  private signal?:AbortSignal;
  private computerChooser?:AbortController;
  private removeAbort?:()=>void;
  private resolve?:((files:File[])=>void);
  private current:()=>boolean=()=>false;
  private readonly modal;

  constructor(private readonly changed:()=>void,private readonly storage:PickerFiles=files) {
    this.modal=createInlineModal(()=>this.finish([]),()=>document.querySelector('button[aria-label="Chat actions"]'),{coverAssistant:true});
  }
  choose(signal:AbortSignal,maximum:number,current:()=>boolean):Promise<File[]> {
    this.finish([],false);
    if(signal.aborted||document.hidden||!current())return Promise.resolve([]);
    this.opened=true;this.signal=signal;this.current=current;this.maximum=maximum;
    this.tab='photos';this.volume=undefined;this.query='';this.path='';this.rows=[];this.next='';this.selected.clear();this.error='';
    const abort=()=>this.finish([]);
    const hide=()=>{if(document.hidden)abort();};
    signal.addEventListener('abort',abort,{once:true});
    document.addEventListener('visibilitychange',hide);
    window.addEventListener('pagehide',abort);
    window.addEventListener('launcher-home',abort);
    window.addEventListener('alpha:device-state',abort);
    this.removeAbort=()=>{
      signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hide);
      window.removeEventListener('pagehide',abort);window.removeEventListener('launcher-home',abort);window.removeEventListener('alpha:device-state',abort);
    };
    const result=new Promise<File[]>(resolve=>{this.resolve=resolve;});
    this.changed();void this.load();
    return result;
  }
  private active(epoch=this.epoch):boolean {
    return this.opened&&epoch===this.epoch&&!document.hidden&&!this.signal?.aborted&&this.current();
  }
  private finish(value:File[],paint=true):void {
    const resolve=this.resolve;this.resolve=undefined;this.opened=false;this.epoch++;this.request++;
    this.computerChooser?.abort();this.computerChooser=undefined;
    this.removeAbort?.();this.removeAbort=undefined;clearTimeout(this.timer);
    this.rows=[];this.selected.clear();this.loading=false;this.reading=false;
    resolve?.(value);if(paint)this.changed();
  }
  dispose():void {this.finish([],false);this.modal.ref(null);}
  private async load(more=false):Promise<void> {
    const epoch=this.epoch,request=++this.request;
    if(!this.active(epoch)||this.reading)return;
    this.loading=true;this.error='';this.truncated=false;this.fileAccess=false;this.photoAccess=false;this.changed();
    const current=()=>this.active(epoch)&&request===this.request;
    try {
      if(this.tab==='photos') {
        if(!libraryAvailable())throw Error('Photos are unavailable on this device.');
        let items:SavedPhoto[]=[],next=more?this.next:'';
        if(Capacitor.isNativePlatform()) {
          const access=await library.libraryAccess();if(!current())return;
          this.photoAccess=access.images!=='full';
          const result=await library.listPermitted({before:next||undefined,query:this.query||undefined,kind:'image',thumbnails:true});
          items=result.items;next=result.next;
        } else {
          // Browser storage has its own cursor. Search walks pages without retaining unrelated pixels.
          do {
            const result=await library.list({before:next||undefined,limit:30,thumbnails:true});
            if(!current())return;
            items=result.items.filter(row=>row.kind!=='video'&&(!this.query||(row.name||'Photo').toLocaleLowerCase().includes(this.query.toLocaleLowerCase())));
            next=result.next;
          } while(!items.length&&next);
        }
        if(!current())return;
        const rows:PickerRow[]=items.filter(row=>row.kind!=='video'&&!row.trashed).map(photo=>({
          key:'photo:'+photo.id,kind:'photo',name:photo.name||'Photo.jpg',mimeType:'image/jpeg',
          size:photo.size||0,image:photo.image,photo,
        }));
        this.rows=more?[...this.rows,...rows.filter(row=>!this.rows.some(old=>old.key===row.key))]:rows;
        this.next=next;
      } else {
        const state=await this.storage.storageState();if(!current())return;
        if(state.status!=='ready'||state.access!==undefined&&state.access!=='granted'){this.fileAccess=state.status==='denied'||state.access==='denied';if(!this.fileAccess)throw Error('Files are unavailable. Try again.');this.rows=[];return;}
        this.volumes=state.volumes||[];
        if(this.volume&&!this.volumes.some(row=>row.id===this.volume))this.volume=undefined;
        const result=this.query&&(!this.volume||this.volume==='primary')
          ?await this.storage.storageQuery({text:this.query,...(this.path?{folder:this.path}:{}),...(this.volume?{volume:this.volume}:{})})
          :await this.storage.storageList({path:this.path,...(this.volume?{volume:this.volume}:{})});
        if(!current())return;
        if(result.status!=='ready'){if(result.status==='denied'){this.fileAccess=true;this.rows=[];return;}throw Error(result.message||'This folder could not open. Try again.');}
        this.truncated='truncated' in result&&result.truncated===true;
        const matches=(result.entries||[]).filter(entry=>!this.query||!this.volume||this.volume==='primary'||entry.name.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
        this.rows=matches.sort(compareFilesEntries('recent')).map(entry=>({
          key:'file:'+JSON.stringify([this.volume||'primary',entry.path]),kind:'file',name:entry.name,
          mimeType:entry.mimeType,size:entry.size,entry,volume:this.volume,
        }));
        this.next='';
      }
    } catch(error) {
      if(current()){this.error=error instanceof Error?error.message:'Files could not load. Try again.';this.rows=[];}
    } finally {if(current()){this.loading=false;this.changed();}}
  }
  private switchTab(tab:'photos'|'files'):void {
    if(!this.active()||this.reading||tab===this.tab)return;
    this.tab=tab;this.query='';this.rows=[];this.next='';clearTimeout(this.timer);void this.load();
  }
  private async toggle(row:PickerRow):Promise<void> {
    if(!this.active()||this.reading||this.loading)return;
    if(row.kind==='file'&&row.entry.directory){this.path=row.entry.path;this.query='';this.rows=[];void this.load();return;}
    if(!accepts(row.name,row.mimeType))return;
    if(this.selected.has(row.key))this.selected.delete(row.key);
    else if(this.selected.size>=this.maximum)this.error='You can attach up to '+this.maximum+' more files.';
    else if(row.kind==='file'){
      const epoch=this.epoch,target=row.volume?{volume:row.volume}:{};
      this.reading=true;this.error='';this.changed();
      try{
        const identity=async()=>{
          const result=await this.storage.storageReviewedIdentities({paths:[row.entry.path],attachment:true,...target});
          return result.status==='ready'?result.reviewed?.[0]:undefined;
        };
        const reviewed=await identity();
        if(!this.active(epoch))return;
        const list=await this.storage.storageList({path:parentOf(row.entry.path),...target});
        if(!this.active(epoch))return;
        const actual=list.status==='ready'?list.entries?.find(entry=>entry.path===row.entry.path):undefined;
        if(!reviewed||!actual||actual.directory||actual.name!==row.name||actual.size!==row.size||
           actual.modified!==row.entry.modified||actual.mimeType!==row.mimeType||await identity()!==reviewed)
          throw Error('This file changed. Select it again.');
        if(this.active(epoch))this.selected.set(row.key,{...row,reviewed});
      }catch(error){
        if(this.active(epoch))this.error=error instanceof Error?error.message:'This file changed. Select it again.';
      }finally{
        if(this.active(epoch)){this.reading=false;this.changed();}
      }
      return;
    }else this.selected.set(row.key,row);
    this.changed();
  }
  private async bytes(row:PickerRow):Promise<File> {
    if(row.kind==='local')return row.file;
    if(row.kind==='photo') {
      const photo=await library.read({id:row.photo.id});
      if(photo.id!==row.photo.id||photo.trashed||!revision(row.photo)||revision(photo)!==revision(row.photo)||
         (row.photo.contentRevision!==undefined&&photo.contentRevision!==row.photo.contentRevision))
        throw Error('This photo changed. Select it again.');
      const match=/^data:(image\/[^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(photo.image);
      if(!match)throw Error('This photo could not be read. Try another photo.');
      const mime=match[1].toLowerCase(),extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' } as Record<string,string>)[mime];
      if(!extension)throw Error('This photo format cannot be attached.');
      const original=photo.name||row.name,name=new RegExp('\\.'+(extension==='jpg'?'jpe?g':extension)+'$','i').test(original)?original:original.replace(/\.(?:jpe?g|png|webp|gif|avif)$/i,'')+'.'+extension;
      return decodedFile({name,mimeType:mime,dataBase64:match[2]});
    }
    if(!row.reviewed)throw Error('This file changed. Select it again.');
    const value=await this.storage.storageReadAttachment({path:row.entry.path,reviewed:row.reviewed,...(row.volume?{volume:row.volume}:{})});
    if(!('dataBase64' in value))throw Error(value.message||'This file could not be read. Select it again.');
    const file=decodedFile(value);
    if(file.name!==row.name||file.type!==row.mimeType||file.size!==row.size)throw Error('This file changed. Select it again.');
    return file;
  }
  private async attach():Promise<void> {
    if(!this.active()||this.reading||!this.selected.size)return;
    const epoch=this.epoch,rows=[...this.selected.values()];this.reading=true;this.error='';this.changed();
    try {
      const chosen:File[]=[];
      for(const row of rows) {
        if(!this.active(epoch))return;
        const file=await this.bytes(row);
        if(!this.active(epoch))return;
        if(!file.size||file.size>fileLimit(file.type))throw Error('Choose a nonempty photo or document within the size limit.');
        chosen.push(file);
      }
      (document.activeElement as HTMLElement|null)?.blur();this.finish(chosen);
    } catch(error) {
      if(this.active(epoch)){this.error=error instanceof Error?error.message:'The selection could not be read. Try again.';}
    } finally {if(this.active(epoch)){this.reading=false;this.changed();}}
  }
  private async fromComputer():Promise<void> {
    if(Capacitor.isNativePlatform()||!this.active()||this.reading||this.computerChooser)return;
    const epoch=this.epoch,chooser=this.computerChooser=new AbortController();
    try {
      const chosen=await inputFiles(chooser.signal,{multiple:true,accept:uploadAccept});
      if(!this.active(epoch)||!chosen.length)return;
      this.tab='files';this.query='';this.rows=[];this.request++;this.loading=false;this.next='';
      for(const file of chosen) {
        if(!accepts(file.name,file.type)){this.error='Choose a supported photo or document.';continue;}
        if(this.selected.size>=this.maximum){this.error='You can attach up to '+this.maximum+' more files.';break;}
        const row:PickerRow={key:'local:'+crypto.randomUUID(),kind:'local',name:file.name,mimeType:file.type,size:file.size,file};
        this.rows=[row,...this.rows];this.selected.set(row.key,row);
      }
      this.changed();
    } catch(error) {if(this.active(epoch)){this.error=error instanceof Error?error.message:'Files could not open. Try again.';this.changed();}}
    finally{if(this.computerChooser===chooser)this.computerChooser=undefined;}
  }
  view(icons:Record<string,string>={}) {
    if(this.opened&&!this.active())this.finish([],false);
    return {
      open:this.opened,ref:this.modal.ref,close:()=>this.finish([]),inside:(event:Event)=>event.stopPropagation(),
      photos:this.tab==='photos',files:this.tab==='files',photosTab:()=>this.switchTab('photos'),filesTab:()=>this.switchTab('files'),
      query:this.query,searchLabel:this.tab==='photos'?'Search photos':'Search files',search:(event:Event)=>{if(this.reading)return;this.query=(event.target as HTMLInputElement).value;clearTimeout(this.timer);this.timer=setTimeout(()=>{this.rows=[];this.next='';void this.load();},180);this.changed();},
      loading:this.loading,firstLoading:this.loading&&!this.rows.length,reading:this.reading,error:this.error,retry:()=>void this.load(),empty:!this.loading&&!this.rows.length&&!this.error&&!this.fileAccess&&!this.photoAccess,
      emptyLabel:this.query?'No matching files':this.tab==='photos'?'No photos yet':'This folder is empty',
      photoAccess:this.photoAccess,allowPhotos:async()=>{const epoch=this.epoch;try{await library.requestLibraryAccess();if(this.active(epoch))await this.load();}catch{if(this.active(epoch)){this.error='Photo access could not open. Try again.';this.changed();}}},
      fileAccess:this.fileAccess,allowFiles:async()=>{const epoch=this.epoch;try{await this.storage.storageRequestAccess();if(this.active(epoch))await this.load();}catch{if(this.active(epoch)){this.error='File access could not open. Try again.';this.changed();}}},
      locationVisible:this.tab==='files'&&((!!this.path&&!this.query)||this.volumes.length>1),
      backFolder:this.tab==='files'&&!!this.path&&!this.query,folderName:this.path.split('/').filter(Boolean).at(-1)||'',
      up:()=>{if(this.reading)return;this.path=parentOf(this.path);this.query='';void this.load();},
      locations:this.tab==='files'&&this.volumes.length>1?this.volumes.map(volume=>({id:volume.id,label:volume.name,selected:(this.volume||'primary')===volume.id,choose:()=>{if(this.reading)return;this.volume=volume.id;this.path='';this.query='';void this.load();}})):[],
      rows:this.rows.map(row=>({key:row.key,name:row.name,image:row.image||'',hasImage:!!row.image,imageMissing:!row.image,photo:row.kind==='photo',folder:row.kind==='file'&&row.entry.directory,selectable:!(row.kind==='file'&&row.entry.directory),
        icon:row.kind==='file'&&row.entry.directory?icons.folder:icons.filesDoc,
        selected:this.selected.has(row.key),pressed:row.kind==='file'&&row.entry.directory?undefined:this.selected.has(row.key),disabled:this.reading||(!(row.kind==='file'&&row.entry.directory)&&!accepts(row.name,row.mimeType)),
        detail:row.kind==='file'&&row.entry.directory?'Folder':accepts(row.name,row.mimeType)?formatSize(row.size):'Unsupported file type',
        choose:()=>void this.toggle(row)})),
      more:!!this.next,loadMore:()=>void this.load(true),truncated:this.truncated,
      selectionLabel:this.selected.size?this.selected.size+' selected':'',canAttach:!!this.selected.size&&!this.reading&&!this.loading,attachDisabled:!this.selected.size||this.reading||this.loading,
      attach:()=>void this.attach(),clear:()=>{if(this.reading)return;this.selected.clear();this.error='';this.changed();},
      computer:!Capacitor.isNativePlatform(),fromComputer:()=>void this.fromComputer(),
    };
  }
}
