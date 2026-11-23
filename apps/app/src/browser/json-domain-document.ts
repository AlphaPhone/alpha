import {browserDocuments} from './documents';
import {BrowserDomainDocument} from './domain-document';

/** Stored value: the JSON text of the document, or null. */
type Archive={raw:string|null};
const emptyArchive=():Archive=>({raw:null});
function decode<T>(archive:Archive):T|null{
 if(!archive||!Object.hasOwn(archive,'raw')||archive.raw!==null&&typeof archive.raw!=='string'||Object.keys(archive).some(key=>key!=='raw'))throw Error('Browser history needs recovery');
 return archive.raw===null?null:JSON.parse(archive.raw);
}
export class BrowserJsonDomainDocument extends BrowserDomainDocument{
 constructor(key:string){super(browserDocuments,key);}
 async readJson<T>(signal?:AbortSignal):Promise<T|null>{return decode<T>(await this.read(emptyArchive,signal));}
 async editJson<T>(update:(value:T|null)=>T|null,signal?:AbortSignal):Promise<void>{
  await this.edit(emptyArchive,archive=>{const value=update(decode<T>(archive));archive.raw=value===null?null:JSON.stringify(value);},signal);
 }
}
