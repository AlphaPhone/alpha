import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Alpha's wording for Files storage results and the selected-document text preview
// (apps/app/src/ui/files/storage-presentation.ts). Every distinct, actionable reason a backend
// reports must keep its own Alpha sentence: the share limit with its count, a folder in a share,
// no app for a file, sharing unavailable in this browser, and reopening Files for a review.
const text=await import('../apps/app/src/ui/files/storage-presentation.ts');
const {storageResultText,selectedPreviewText,STORAGE_OUTCOMES,PREVIEW_OUTCOMES}=text;
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('each reviewed Files refusal keeps its own reason in Alpha wording',()=>{
 const cases=[
  // Android share limit: the count is data, not a generic "cannot be shared".
  [{status:'unsupported',message:'Select up to 100 files to share.'},'share','Select up to 100 files to share.'],
  [{status:'unsupported',message:'Select up to 25 files to share.'},'share','Select up to 25 files to share.'],
  [{status:'unsupported',message:'Select files without folders to share.'},'share','Select files without folders to share.'],
  [{status:'failed',message:'Sharing could not open.'},'share','Sharing could not open.'],
  // Opening a browsed file with no handler app (Open with, or a tap on a non-previewed file).
  [{status:'unsupported',message:'No app can open this file.'},undefined,'No app can open this file.'],
  // The browser's share, through the staged plugin-files volume.
  [{status:'unsupported',message:'Sharing is unavailable in this browser.'},'share','Sharing is unavailable in this browser.'],
  [{status:'unsupported',message:'Select files to share.'},'share','Select files to share.'],
  [{status:'missing',message:'A selected item changed. Refresh and select again.'},'share','A selected item changed. Refresh and select it again.'],
  // An agent move or trash while Files is not focused: the remedy is to open Files.
  [{status:'changed',message:'Open Files to review these items.'},undefined,'Open Files to review these items.'],
  [{status:'changed',message:'A file couldn’t be verified. Nothing changed.'},undefined,'A file couldn’t be verified. Nothing changed.'],
  [{status:'invalid',message:'Choose one file to review.'},undefined,'Choose one file to review.'],
  // Shared refusals of both backends.
  [{status:'invalid',message:'Invalid name or path.'},undefined,'That name or location is not allowed.'],
  [{status:'exists',message:'That name is already used here.'},undefined,'That name is already used here.'],
  [{status:'missing',message:'This item is no longer there.'},undefined,'This item is no longer there. Refresh and try again.'],
  [{status:'unavailable',message:'This storage is not mounted.'},undefined,'This storage is not mounted.'],
  [{status:'unavailable',message:'Files closed.'},undefined,'Files closed before this finished. Try again.'],
  [{status:'failed',message:'The operation could not be confirmed.'},undefined,'The operation could not be confirmed.'],
  [{status:'confirmation-required',message:'Confirm before deleting permanently.'},undefined,'Confirm before deleting permanently.'],
  [{status:'unsupported',message:'Unsupported file operation.'},undefined,'Files cannot do that here.'],
  [{status:'invalid',message:'Nothing selected'},undefined,'Nothing is selected.'],
  [{status:'denied',message:'Allow all-files access to browse storage.'},undefined,'Allow all files access to browse storage.'],
  [{status:'denied',message:'Allow storage access to browse files.'},undefined,'Allow storage access to browse files.'],
 ];
 for(const [result,operation,expected] of cases)
  assert.equal(storageResultText(result,'FALLBACK',operation),expected,JSON.stringify(result));
});

test('an unreviewed sentence is never shown: its status is worded, else the caller fallback',()=>{
 assert.equal(storageResultText({status:'unsupported',message:'Raw backend text.'},'FALLBACK','share'),'This selection cannot be shared here.');
 assert.equal(storageResultText({status:'unsupported',message:'Raw backend text.'},'FALLBACK'),'Files cannot do that here.');
 assert.equal(storageResultText({status:'cancelled'},'FALLBACK','share'),'Sharing was cancelled.');
 assert.equal(storageResultText({status:'changed'},'FALLBACK'),'A selected item changed. Refresh and select it again.');
 assert.equal(storageResultText({status:'mystery',message:'Raw backend text.'},'Nothing was changed.'),'Nothing was changed.');
 // A local name refusal with no reviewed sentence reads as a local input problem.
 assert.equal(storageResultText({status:'surprise'},'Choose another name.'),'Choose another name.');
 assert.equal(storageResultText({status:'unsupported',message:'Select up to 1e9 files to share.'},'F','share'),'This selection cannot be shared here.');
});

/** Every `result("status","sentence")` Alpha's Android Files plugin can answer. */
function androidSentences(){
 const java=source('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaFilesPlugin.java');
 const found=[];
 for(const match of java.matchAll(/result\("([a-z-]+)",\s*("(?:[^"\\]|\\.)*"(?:\s*\+\s*[A-Z_]+\s*\+\s*"(?:[^"\\]|\\.)*")?|[A-Za-z.()]+\?"[^"]*":"[^"]*")\)/g)){
  const [,status,expr]=match;
  if(['ready','opened','selected'].includes(status))continue;
  const ternary=/^[A-Za-z.()]+\?"([^"]*)":"([^"]*)"$/.exec(expr);
  if(ternary){found.push([status,ternary[1]],[status,ternary[2]]);continue;}
  found.push([status,expr.replace(/"\s*\+\s*MAX_SHARE_FILES\s*\+\s*"/,String(/MAX_SHARE_FILES=(\d+)/.exec(java)[1])).slice(1,-1)]);
 }
 return found;
}
/** Every `{status, message}` refusal of the staged plugin-files browser volume. */
function browserSentences(){
 const ts=source('.eliza/client-features/plugins/plugin-files/src/browser/storage-volume.ts')+source('apps/app/src/browser/files.ts');
 return [...ts.matchAll(/status:\s*["']([a-z-]+)["'],\s*message:\s*["']([^"']+)["']/g)].map(m=>[m[1],m[2]]);
}

test('every refusal sentence the Files backends answer has an explicit Alpha sentence',()=>{
 const android=androidSentences(),browser=browserSentences();
 // The cases the owner used to read must be found, so the extraction cannot silently go empty.
 for(const sentence of ['Select up to 100 files to share.','Select files without folders to share.','No app can open this file.','Open Files to review these items.'])
  assert.ok(android.some(([,s])=>s===sentence),sentence);
 assert.ok(browser.some(([,s])=>s==='Sharing is unavailable in this browser.'));
 assert.ok(browser.some(([,s])=>s==='Nothing selected'));
 for(const [status,sentence] of [...android,...browser]){
  const shown=storageResultText({status,message:sentence},'FALLBACK');
  assert.ok(STORAGE_OUTCOMES.has(sentence)||/^Select up to \d+ files to share\.$/.test(sentence),'unmapped backend sentence: '+sentence);
  assert.notEqual(shown,'FALLBACK',sentence);
 }
});

test('the selected-document preview words its reader status, never the reader text',()=>{
 // Web lane: the staged plugin-files browser library.
 assert.equal(selectedPreviewText({status:'large',message:'Open or download this file to read it.'}),'Open or download this file to read it.');
 assert.equal(selectedPreviewText({status:'binary',message:'Open or download this file.'}),'Open or download this file.');
 assert.equal(selectedPreviewText({status:'large',message:'Some other upstream text.'}),'Open or download this file to read it.');
 assert.equal(selectedPreviewText({status:'read',text:'hi'}),'Loaded');
 assert.equal(selectedPreviewText({status:'read',message:'Read the selected document on this device. Nothing was uploaded.',text:'hi'}),'Loaded');
 // Android: one status covers several outcomes, picked by the reviewed sentence.
 for(const [status,sentence,expected] of [
  ['unsupported','This file type has no text preview. Open it in a compatible app.','This file type has no text preview. Open it in a compatible app.'],
  ['unsupported','This document does not contain supported UTF-8 text.','This document does not contain supported UTF-8 text.'],
  ['unsupported','Text preview requires UTF-8. Open this document in a compatible app.','Text preview requires UTF-8. Open this document in a compatible app.'],
  ['too-large','Text preview is limited to 64 KiB. Open this document in a compatible app.','Text preview is limited to 64 KiB. Open this document in a compatible app.'],
  ['unavailable','Select this document again before reading it.','Select this document again before reading it.'],
  ['unavailable','The document provider could not open this selection.','The app that stores this document could not open it.'],
  ['unavailable','Access expired. Select this document again.','Access expired. Select this document again.'],
  ['failed','The document provider could not read this selection.','The app that stores this document could not read it.'],
 ])assert.equal(selectedPreviewText({status,message:sentence}),expected,sentence);
 assert.equal(selectedPreviewText({status:'mystery',message:'Raw reader text.'}),'No preview');
 assert.equal(selectedPreviewText({}),'No preview');
});

test('every preview sentence the readers answer has an explicit Alpha sentence',()=>{
 const web=source('.eliza/client-features/plugins/plugin-files/src/browser/files.ts');
 const readSelected=web.slice(web.indexOf('async readSelected('),web.indexOf('async pdfSelected('));
 const webStatuses=[...readSelected.matchAll(/status:\s*"([a-z-]+)"/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(webStatuses)].sort(),['binary','large','read']);
 for(const status of webStatuses)assert.notEqual(selectedPreviewText({status}),'No preview',status);
 const java=source('vendor/eliza/plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media/SelectedDocuments.java');
 // read() and the readTextUri() it calls; readTransientText() serves native picker callbacks only.
 const read=java.slice(java.indexOf('public JSObject read(String id)'),java.indexOf('public JSObject readTransientText('))
  +java.slice(java.indexOf('private JSObject readTextUri('),java.indexOf('public JSObject share('));
 const answers=[...read.matchAll(/result\(\s*"([a-z-]+)",\s*"([^"]+)"\)/g)].map(m=>[m[1],m[2]]);
 assert.ok(answers.length>=8,'Android reader sentences found: '+answers.length);
 for(const [status,sentence] of answers){
  if(status==='read')continue;
  assert.ok(PREVIEW_OUTCOMES.has(sentence),'unmapped reader sentence: '+sentence);
 }
});

test('Files shows Alpha sentences, never a storage or reader message',()=>{
 const adapter=source('apps/app/src/ui/files/files-browser-adapter.ts');
 assert.doesNotMatch(adapter,/toast\([^)]*\.message|summary:\s*value\.message/);
 const selection=source('apps/app/src/prototype/selection-adapter.ts');
 assert.match(selection,/status: selectedPreviewText\(response\)/);
});
