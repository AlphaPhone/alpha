import {browserDocuments} from '../browser/documents';

const browserNotesKey='alpha.browser.notes.v1';
/** The saved browser Notes collection text from its document envelope `{version:1,archive,currentRaw}`. */
export async function readBrowserNotesRaw(){
 const saved=await browserDocuments.read(browserNotesKey),value=saved?.raw==null?null:JSON.parse(saved.raw);
 if(value?.version!==1||typeof value.currentRaw!=='string')throw Error('Notes readback unavailable');
 return value.currentRaw as string;
}
