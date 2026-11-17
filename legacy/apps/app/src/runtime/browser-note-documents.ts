import { WebPlugin } from '@capacitor/core';
import {NOTE_IMPORT_LIMIT,noteDocumentFileName,noteImportText,notePdfBytes,type NoteDocumentResult,type NoteDocumentsPort} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-documents.ts';
import {inputFiles,runFilePicker} from '../browser/file-picker';
import {downloadBlob} from '../browser/download';
import {noteDocumentText,type NoteDocumentOperation} from '../ui/notes/note-document-messages';

const result=(operation:NoteDocumentOperation,status:string,extra:Partial<NoteDocumentResult>={}):NoteDocumentResult=>({status,message:noteDocumentText(operation,status),...extra});
/** `AlphaNoteDocuments` in the browser: a local file input for import and downloads for export.
 * Nothing is uploaded, and an export is only "requested": the browser does not confirm where the
 * bytes landed. The import limit, the file name and the text and PDF checks are the shared
 * Notes document rules; the picker, the download and the wording are Alpha's. */
export class BrowserNoteDocuments extends WebPlugin implements NoteDocumentsPort {
  async importText(){
    const files=await runFilePicker(signal=>inputFiles(signal,{accept:'.txt,.md,.markdown,text/plain,text/markdown'}),[] as File[]);
    const file=files[0];
    if(!file)return result('import','cancelled');
    if(file.size>NOTE_IMPORT_LIMIT)return result('import','too-large');
    try{return result('import','read',{name:file.name,text:noteImportText(await file.arrayBuffer())});}
    catch{return result('import','failed');}
  }
  async exportPdf({title,dataBase64}:{title:string;dataBase64:string}){
    downloadBlob(new Blob([notePdfBytes(dataBase64) as BlobPart],{type:'application/pdf'}),`${noteDocumentFileName(title,'Alpha scan',100)}.pdf`);
    return result('export-pdf','requested');
  }
  async exportText({title,text}:{title:string;text:string}){
    downloadBlob(new Blob([text],{type:'text/plain;charset=utf-8'}),`${noteDocumentFileName(title,'Note',160)}.txt`);
    return result('export-text','requested');
  }
}
