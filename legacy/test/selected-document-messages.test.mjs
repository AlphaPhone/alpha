import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Alpha's wording for what Android's shared selected-document registry (SelectedDocuments.java in
// plugin-native-media) answers to open, share, rename, PDF preview and saved-selection calls
// (apps/app/src/ui/files/selected-document-messages.ts). Each sentence it can answer maps to its
// own Alpha sentence; the registry's text is never shown.
const {SELECTED_DOCUMENT_OUTCOMES,selectedDocumentText}=await import('../apps/app/src/ui/files/selected-document-messages.ts');
const {PREVIEW_OUTCOMES,selectedPreviewText}=await import('../apps/app/src/ui/files/storage-presentation.ts');
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const JAVA='vendor/eliza/plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media/SelectedDocuments.java';

/** Every `result("status", "sentence" [+ "more"])` the registry answers, with its status. */
function registrySentences(){
 const java=source(JAVA);
 return [...java.matchAll(/result\(\s*"([a-z-]+)",\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)\)/g)]
  .map(([,status,expr])=>[status,[...expr.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m=>m[1]).join('')]);
}

// The reviewed mapping, one row per registry sentence: [status, registry sentence, Alpha sentence].
const PINNED=[
 // restore / describeSelected
 ['failed','The saved document provider is unavailable. Try again or select another document.','The app that stores the saved document is unavailable. Try again or select another document.'],
 ['unavailable','No saved document selection','No saved document is selected.'],
 ['unavailable','Access to this file ended. Select it again.','Access to this file ended. Select it again.'],
 ['failed','The document provider is unavailable. Try again.','The app that stores this document is unavailable. Try again.'],
 // rename
 ['unavailable','Select this document again.','Select this document again.'],
 ['failed','Enter a valid file name.','Enter a valid file name.'],
 ['unsupported','This provider did not grant rename access. Select the file again or rename it in its document app.','The app that stores this file did not allow renaming. Select the file again or rename it in that app.'],
 ['failed','The provider did not rename the document.','The app that stores this document did not rename it.'],
 ['renamed-reselect','The provider completed the rename but did not retain access. Select the renamed file to verify it and continue.','The file was renamed, but access to it ended. Select the renamed file to check it and continue.'],
 ['unavailable','Access expired. Select this document again.','Access expired. Select this document again.'],
 ['failed','The provider could not confirm the rename. Refresh or reselect before retrying.','The rename could not be confirmed. Refresh or select the file again before trying again.'],
 // pdf
 ['unsupported','PDF preview is unavailable here. Open it in Android to view it.','PDF preview is unavailable here. Open it in Android to view it.'],
 ['unsupported','This selection is not a PDF.','This file is not a PDF.'],
 ['failed','PDF preview timed out. Try again.','PDF preview took too long. Try again.'],
 ['rendered','PDF rendered on this device. Nothing was uploaded.','PDF shown from this device. Nothing was uploaded.'],
 ['unavailable','This PDF is encrypted or access expired. Open it in a compatible app or select it again.','This PDF is encrypted or access to it expired. Open it in a compatible app or select it again.'],
 ['failed','PDF preview is unavailable. It may be malformed, encrypted, or larger than 20 MiB.','PDF preview is unavailable. The file may be damaged, encrypted, or larger than 20 MiB.'],
 // readTransientText (native picker callbacks)
 ['unavailable','Select a document first.','Select a document first.'],
 // share / shareUri
 ['unavailable','Select this document again before sharing it.','Select this document again before sharing it.'],
 ['unavailable','This item is no longer available.','This item is no longer available.'],
 ['opened','Choose an app to share this item. Nothing has been sent yet.','Choose an app to share this item. Nothing has been sent yet.'],
 ['unavailable','Access expired or the item was removed. Select it again.','Access expired or the item was removed. Select it again.'],
 ['failed','Android could not open sharing for this item.','Android could not open sharing for this item.'],
 // open
 ['unavailable','Select this document again before opening it.','Select this document again before opening it.'],
 ['opened','Opened the selected document. Complete any further action in that app.','Opened the selected document. Finish anything else in that app.'],
 ['unavailable','No compatible app is installed to open this document.','No installed app can open this document.'],
 ['failed','Android could not open the selected document.','Android could not open the selected document.'],
];

test('each registry sentence outside the text reader maps to its pinned Alpha sentence',()=>{
 for(const [status,sentence,expected] of PINNED){
  assert.equal(selectedDocumentText({status,message:sentence},'FALLBACK'),expected,sentence);
  assert.equal(SELECTED_DOCUMENT_OUTCOMES.get(sentence),expected,sentence);
 }
 // The map holds exactly the pinned rows, so a new or changed entry needs a pinned row.
 assert.deepEqual([...SELECTED_DOCUMENT_OUTCOMES.keys()].sort(),[...new Set(PINNED.map(([,s])=>s))].sort());
});

test('every sentence SelectedDocuments.java answers has a pinned Alpha sentence',()=>{
 const found=registrySentences();
 // The extraction must find the operations the owner reads, joined across concatenated lines.
 for(const sentence of ['No compatible app is installed to open this document.','Android could not open sharing for this item.',
  'The provider completed the rename but did not retain access. Select the renamed file to verify it and continue.',
  'PDF preview is unavailable. It may be malformed, encrypted, or larger than 20 MiB.','Text preview is limited to 64 KiB. Open this document in a compatible app.'])
  assert.ok(found.some(([,s])=>s===sentence),'extracted: '+sentence);
 assert.ok(found.length>=35,'registry sentences found: '+found.length);
 const pinned=new Map(PINNED.map(([status,sentence])=>[sentence+'\0'+status,true]));
 for(const [status,sentence] of found){
  if(status==='read'){
   // The text reader's success is worded by its status.
   assert.equal(selectedPreviewText({status,message:sentence}),'Loaded');
   continue;
  }
  if(PREVIEW_OUTCOMES.has(sentence)&&!SELECTED_DOCUMENT_OUTCOMES.has(sentence)){
   assert.notEqual(selectedPreviewText({status,message:sentence}),'No preview',sentence);
   continue;
  }
  assert.ok(pinned.has(sentence+'\0'+status),`unpinned registry sentence (${status}): ${sentence}`);
 }
});

test('an unreviewed registry sentence is never shown: the caller fallback is',()=>{
 assert.equal(selectedDocumentText({status:'failed',message:'Raw registry text.'},'Share failed'),'Share failed');
 assert.equal(selectedDocumentText({status:'unavailable'},'Unavailable'),'Unavailable');
 assert.equal(selectedDocumentText({status:'failed',message:42},'Rename unavailable'),'Rename unavailable');
 assert.equal(selectedDocumentText(undefined,'PDF preview unavailable'),'PDF preview unavailable');
 assert.equal(selectedDocumentText({message:'  Access expired. Select this document again.  '},'F'),'Access expired. Select this document again.');
});

test('the bridge refusals are rejections, which the selection adapter never shows',()=>{
 const calls=source('vendor/eliza/plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media/SelectedDocumentCalls.java');
 assert.deepEqual([...calls.matchAll(/reject\(\s*"([^"]+)"\)/g)].map(m=>m[1]),['Document access could not be released']);
 assert.match(calls,/UNAVAILABLE = "Saved document access is unavailable"/);
 assert.doesNotMatch(calls,/call\.resolve\([^)]*error/);
 const adapter=source('apps/app/src/prototype/selection-adapter.ts');
 // Caught bridge failures read as fixed Alpha sentences, never the error's message.
 assert.doesNotMatch(adapter,/catch\s*\(\s*\w+\s*\)\s*\{[^}]*toast\(\s*\w+\.message/);
});

test('the selection adapter shows only Alpha sentences for open, share, rename and PDF preview',()=>{
 const adapter=source('apps/app/src/prototype/selection-adapter.ts');
 assert.doesNotMatch(adapter,/errorNotice/);
 assert.doesNotMatch(adapter,/(response|result)\.message/);
 assert.match(adapter,/api\.toast\(selectedDocumentText\(result,'Unavailable'\),ERROR_TOAST\)/);
 assert.match(adapter,/api\.toast\(selectedDocumentText\(result, 'Share failed'\), ERROR_TOAST\)/);
 assert.match(adapter,/api\.toast\(selectedDocumentText\(response, 'Rename unavailable'\), ERROR_TOAST\)/);
 assert.match(adapter,/status: selectedDocumentText\(response, 'PDF loaded'\)/);
 assert.match(adapter,/selectedDocumentText\(response, 'PDF preview unavailable'\)/);
 assert.match(adapter,/status:selectedDocumentText\(response,'Reselect file'\)/);
 assert.match(adapter,/status: selectedPreviewText\(response\)/);
});
