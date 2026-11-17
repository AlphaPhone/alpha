// The scan PDF and on-device text recognition refusals come from the staged plugin-files documents
// modules as plain English errors. Alpha words each one in apps/app/src/ui/documents
// (scan-pdf-messages.ts, local-ocr-messages.ts) and never shows the upstream sentence. Each table
// row below pins a refusal the owner used to see verbatim to the Alpha sentence that keeps its
// reason (limit, field, unavailable engine); anything unknown gets the screen's own fallback.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {tsImport} from './support/ts-import.mjs';
const {scanPdfErrorText,scanTextLayerErrorText}=await tsImport('../apps/app/src/ui/documents/scan-pdf-messages.ts',import.meta.url);
const {localOcrErrorText}=await tsImport('../apps/app/src/ui/documents/local-ocr-messages.ts',import.meta.url);
const staged=name=>readFileSync(`.eliza/client-features/plugins/plugin-files/src/documents/${name}`,'utf8').replace(/\s+/g,' ');

const textLayer=[
 ['scan-text-layer.ts','Choose at most 2,000 text lines per page.','A page can have at most 2,000 text lines.'],
 ['scan-text-layer.ts','Invalid scanned line or position.','A text line or its position is invalid.'],
 ['scan-text-layer.ts','Page text exceeds 100,000 characters.',"A page's text is over 100,000 characters."],
 ['scan-draft.ts','Saved text does not match the document pages.','The saved text does not match the document pages.'],
];
const pdf=[
 ['Choose 1 to 20 pages, up to 64 MB total.','Choose 1 to 20 pages, up to 64 MB in total.'],
 ['Text review must match every document page.','The reviewed text must cover every page.'],
 ['Searchable PDF supports English and Western European text. Correct unsupported characters or export an image-only PDF.','A searchable PDF supports English and Western European text only. Correct unsupported characters or save a PDF without text.'],
 ['Choose a supported image up to 16 MB.','Each page must be a JPEG, PNG or WebP photo up to 16 MB.'],
 ['Image dimensions are too large.','A page photo is larger than 32 million pixels.'],
 ['Image conversion is unavailable.','PDF conversion is unavailable on this device.'],
 ['Image conversion failed.','A page could not be converted to PDF.'],
 ['PDF exceeds the 8 MB export limit.','The PDF is over the 8 MB limit.'],
];
const ocr=[
 ['Choose a JPEG, PNG or WebP image up to 16 MB.','Choose a JPEG, PNG or WebP photo up to 16 MB.'],
 ['The local scan engine could not start.','On-device text recognition could not start.'],
 ['The local scan engine returned unreadable data.','On-device text recognition returned unreadable data.'],
 ['The image could not be read by the local scan engine.','On-device text recognition could not read this photo.'],
 ['The scan request could not start.','The text recognition request could not start.'],
 ['Choose an image with at most 32 million pixels.','Choose a photo with at most 32 million pixels.'],
 ['Image processing is unavailable.','Photo processing is unavailable on this device.'],
 ['Image conversion failed.','This photo could not be prepared for text recognition.'],
 ['The scan result is invalid or too large.','The recognized text is invalid or too long.'],
 ['The scan engine did not return text positions.','Text recognition did not return line positions.'],
 ['Invalid scanned text position.','A recognized line has an invalid position.'],
 ['Too many scanned lines.','Too many lines were recognized on this page.'],
];

test('every keyed refusal is still thrown by the staged source, so a reworded upstream error is caught here',()=>{
 for(const [file,upstream] of textLayer)assert.ok(staged(file).includes(JSON.stringify(upstream)),`${file}: ${upstream}`);
 for(const [upstream] of pdf)assert.ok(staged('scan-pdf.ts').includes(JSON.stringify(upstream)),`scan-pdf.ts: ${upstream}`);
 for(const [upstream] of ocr)assert.ok(staged('local-ocr.ts').includes(JSON.stringify(upstream)),`local-ocr.ts: ${upstream}`);
});
test('scan PDF refusals show Alpha sentences that keep the limit or reason',()=>{
 for(const [upstream,alpha] of pdf)assert.equal(scanPdfErrorText(Error(upstream)),alpha,upstream);
 for(const [,upstream,alpha] of textLayer)assert.equal(scanPdfErrorText(Error(upstream)),alpha,upstream);
});
test('on-device text recognition refusals show Alpha sentences that keep the limit or reason',()=>{
 for(const [upstream,alpha] of ocr)assert.equal(localOcrErrorText(Error(upstream),'Scan failed'),alpha,upstream);
 for(const [,upstream,alpha] of textLayer)assert.equal(localOcrErrorText(Error(upstream),'Recognition failed'),alpha,upstream);
});
test('reviewed and saved text-line refusals keep their reason when Keep text fails',()=>{
 for(const [,upstream,alpha] of textLayer)assert.equal(scanTextLayerErrorText(Error(upstream),'Not kept'),alpha,upstream);
 assert.equal(scanTextLayerErrorText(Error('Image conversion failed.'),'Not kept'),'Not kept','a PDF refusal is not a text-line reason');
});
test('the same upstream sentence is worded for the step that failed',()=>{
 assert.equal(scanPdfErrorText(Error('Image conversion failed.')),'A page could not be converted to PDF.');
 assert.equal(localOcrErrorText(Error('Image conversion failed.'),'Scan failed'),'This photo could not be prepared for text recognition.');
});
test('unknown or non-error failures show the screen fallback, never their own text',()=>{
 for(const error of [Error('Page 2 is larger than 32 million pixels'),Error(''),'opaque',null,undefined,{message:42}]){
  assert.equal(scanPdfErrorText(error),'PDF failed');
  assert.equal(localOcrErrorText(error,'Scan failed'),'Scan failed');
  assert.equal(localOcrErrorText(error,'Recognition failed'),'Recognition failed');
  assert.equal(scanTextLayerErrorText(error,'Not kept'),'Not kept');
 }
});
