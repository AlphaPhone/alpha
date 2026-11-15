import {test,expect,Page} from '@playwright/test';
async function open(page:Page){await page.getByRole('button',{name:'Messages',exact:true}).click();await page.getByRole('button',{name:/^(Unread, )?Maya Chen$/}).click();}
async function chooser(page:Page){
 await page.getByRole('button',{name:'Attach',exact:true}).scrollIntoViewIfNeeded();const anchor=await page.getByRole('button',{name:'Attach',exact:true}).boundingBox();await page.getByRole('button',{name:'Attach',exact:true}).click();const menu=page.getByRole('dialog',{name:'Message attachments',exact:true});
 await expect(menu.getByRole('button',{name:'Camera',exact:true})).toBeVisible();const popup=await menu.boundingBox();if(!anchor||!popup)throw Error('Attachment anchor was not visible');expect(popup.y+popup.height).toBeLessThanOrEqual(anchor.y-2);
await expect(menu.getByRole('button',{name:'Search chat',exact:true})).toHaveCount(0);
 await menu.getByRole('button',{name:'Photos and files',exact:true}).click();const pending=page.waitForEvent('filechooser');await page.getByRole('dialog',{name:'Attach files',exact:true}).getByRole('button',{name:'From computer',exact:true}).click();return pending;
}
async function confirm(page:Page){await page.getByRole('dialog',{name:'Attach files',exact:true}).getByRole('button',{name:'Attach selected files',exact:true}).click();}
async function upload(page:Page,file:{name:string;mimeType:string;buffer:Buffer}){await (await chooser(page)).setFiles(file);await confirm(page);}
async function attach(page:Page){await upload(page,{name:'message.txt',mimeType:'text/plain',buffer:Buffer.from('Café\r\nExact message bytes')});await expect(page.getByRole('button',{name:'Remove message.txt',exact:true})).toBeVisible();}
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/?mode=dev');await open(page);});
test('automatic draft restore send and reload retain exact attachment bytes and preview',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});await attach(page);
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Message with file');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).localDrafts.maya?.text)).toBe('Message with file');
 await expect(page.getByRole('button',{name:'Save draft locally',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Ask Alpha to reply',exact:true})).toHaveCount(0);
 await page.reload();await open(page);await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Message with file');await expect(page.getByRole('button',{name:'Remove message.txt',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page.getByRole('button',{name:'Open message.txt',exact:true})).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!));expect(saved.localDrafts.maya).toBeUndefined();expect(Buffer.from(saved.threads.maya.find((m:any)=>m.file==='message.txt').browserAttachment.dataBase64,'base64').toString()).toBe('Café\r\nExact message bytes');
 await page.reload();await open(page);await page.getByRole('button',{name:'Open message.txt',exact:true}).click();await expect(page.getByRole('dialog',{name:'Reviewed attachment'})).toContainText('Exact message bytes');expect(external).toEqual([]);
});
test('failed send retains selected bytes and text and retry stores one attachment',async({page})=>{
 await attach(page);await page.getByRole('textbox',{name:'Message',exact:true}).fill('Retry attached message');await page.evaluate(()=>{const set=Storage.prototype.setItem;(window as any).restore=()=>Storage.prototype.setItem=set;Storage.prototype.setItem=function(k,v){if(k==='alpha.dev.app.messages')throw Error('Full');return set.call(this,k,v);};});
 await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page.getByRole('button',{name:'Remove message.txt',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Retry attached message');await page.evaluate(()=>(window as any).restore());await page.getByRole('button',{name:'Send message',exact:true}).click();const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).threads.maya);expect(rows.filter((m:any)=>m.file==='message.txt')).toHaveLength(1);expect(rows.filter((m:any)=>m.text==='Retry attached message')).toHaveLength(1);
});
test('late selection after Home is discarded and invalid replacement keeps existing file',async({page})=>{
 const choice=await chooser(page);await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));await choice.setFiles({name:'late.txt',mimeType:'text/plain',buffer:Buffer.from('late')});await open(page);await expect(page.getByRole('button',{name:'Remove late.txt',exact:true})).toHaveCount(0);
 await attach(page);await upload(page,{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from([0,255])});await expect(page.getByRole('button',{name:'Attach',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Remove message.txt',exact:true})).toBeVisible();
});
test('a restored text-only draft is removed atomically when sent',async({page})=>{
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Saved text-only draft');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).localDrafts.maya?.text)).toBe('Saved text-only draft');await page.reload();await open(page);await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Saved text-only draft');await page.getByRole('button',{name:'Send message',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!));expect(saved.localDrafts.maya).toBeUndefined();expect(saved.threads.maya.filter((m:any)=>m.text==='Saved text-only draft')).toHaveLength(1);
});
test('device retirement rejects a late file selection and unlocks attachment controls',async({page})=>{
 const choice=await chooser(page);await page.evaluate(()=>window.dispatchEvent(new Event('alpha:device-state')));await choice.setFiles({name:'retired.txt',mimeType:'text/plain',buffer:Buffer.from('Retired selection')});await expect(page.getByRole('button',{name:'Attach',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Remove retired.txt',exact:true})).toHaveCount(0);await attach(page);
});
test('device retirement during attachment review prevents late adoption',async({page})=>{
 await page.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);let release:()=>void;const gate=new Promise<void>(resolve=>release=resolve);(window as any).releaseReview=()=>release();crypto.subtle.digest=async(...args:any[])=>{(window as any).reviewWaiting=true;await gate;return (digest as any)(...args);};});
 await upload(page,{name:'reviewing.txt',mimeType:'text/plain',buffer:Buffer.from('Review pending')});await expect.poll(()=>page.evaluate(()=>(window as any).reviewWaiting)).toBe(true);await page.evaluate(()=>{window.dispatchEvent(new Event('alpha:device-state'));(window as any).releaseReview();});await expect(page.getByRole('button',{name:'Attach',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Remove reviewing.txt',exact:true})).toHaveCount(0);
});
test('PNG attachment is embedded and retains exact binary bytes after reload',async({page})=>{
 const encoded=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=3;canvas.height=2;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e02424';ctx.fillRect(0,0,3,2);return canvas.toDataURL('image/png').split(',')[1];});await upload(page,{name:'pixels.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});await expect(page.getByRole('button',{name:'Remove pixels.png',exact:true}).locator('img')).toBeVisible();await page.getByRole('button',{name:'Send message',exact:true}).click();await page.reload();await open(page);await page.getByRole('button',{name:'Photo',exact:true}).click();const image=page.frameLocator('iframe[title="pixels.png"]').locator('img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>[el.naturalWidth,el.naturalHeight])).toEqual([3,2]);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).threads.maya.find((m:any)=>m.file==='pixels.png').browserAttachment.dataBase64)).toBe(encoded);
});
test('PDF attachment download after reload preserves the complete document',async({page})=>{
 const {PDFDocument}=await import('pdf-lib');const {readFile}=await import('node:fs/promises');const pdf=await PDFDocument.create();pdf.addPage([300,400]).drawText('Local Messages PDF');const bytes=Buffer.from(await pdf.save());await upload(page,{name:'message.pdf',mimeType:'application/pdf',buffer:bytes});await expect(page.getByRole('button',{name:'Remove message.pdf',exact:true})).toBeVisible();await page.getByRole('button',{name:'Send message',exact:true}).click();await page.reload();await open(page);await page.getByRole('button',{name:'Open message.pdf',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Reviewed attachment'});await expect(dialog.locator('iframe')).toHaveAttribute('title','message.pdf');const pending=page.waitForEvent('download');await dialog.getByRole('link',{name:'Download',exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toBe('message.pdf');const result=await readFile((await download.path())!);expect(result).toEqual(bytes);expect((await PDFDocument.load(result)).getPageCount()).toBe(1);
});

for(const capture of [true,false])test('Messages Camera '+(capture?'returns one embedded photo to the same unsent draft':'Back preserves the draft without a photo'),async({page})=>{
 await page.evaluate(()=>{
  Object.defineProperty(document,'permissionsPolicy',{configurable:true,value:{allowsFeature:()=>true}});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const context=canvas.getContext('2d')!;context.fillStyle='#3c7';context.fillRect(0,0,640,480);
  navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);(window as any).messageCameraTracks=stream.getTracks();const tick=setInterval(()=>{if(stream.getTracks().every(track=>track.readyState==='ended')){clearInterval(tick);return;}context.fillStyle='#3c7';context.fillRect(0,0,640,480);},100);return stream;};
 });
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Keep the Camera draft');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).threads.maya.length);
 await page.getByRole('button',{name:'Attach',exact:true}).click();await page.getByRole('dialog',{name:'Message attachments',exact:true}).getByRole('button',{name:'Camera',exact:true}).click();
 const video=page.locator('[data-alpha-camera="viewfinder"] video');await expect(video).toBeVisible();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 if(capture)await page.getByRole('button',{name:'Take photo',exact:true}).click();else await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Keep the Camera draft');await expect(page.getByRole('button',{name:'Attach',exact:true})).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>(window as any).messageCameraTracks.every((track:MediaStreamTrack)=>track.readyState==='ended'))).toBe(true);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).threads.maya.length)).toBe(before);
 await expect(page.getByRole('button',{name:'Remove Photo.jpg',exact:true}).locator('img')).toHaveCount(capture?1:0);
 if(capture){const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).localDrafts.maya);expect(draft.file.mimeType).toBe('image/jpeg');expect(Buffer.from(draft.file.dataBase64,'base64').subarray(0,2)).toEqual(Buffer.from([255,216]));}
});

test('a delayed Camera commit cannot attach to or block a newer conversation',async({page})=>{
 await page.evaluate(async()=>{
  Object.defineProperty(document,'permissionsPolicy',{configurable:true,value:{allowsFeature:()=>true}});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#5a8';ctx.fillRect(0,0,640,480);
  navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);const timer=setInterval(()=>{if(stream.getTracks().every(t=>t.readyState==='ended')){clearInterval(timer);return;}ctx.fillRect(0,0,640,480);},100);return stream;};
  const {Component}=await import('/src/prototype/model.js'),original=Component.prototype.setState;
  Component.prototype.setState=function(patch:any,callback?:()=>void){if((window as any).holdMessageCommit&&callback){(window as any).holdMessageCommit=false;(window as any).messageCommitHeld=true;(window as any).releaseMessageCommit=()=>callback.call(this);return original.call(this,patch);}return original.call(this,patch,callback);};
 });
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Original Camera draft');
 const before=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).threads).reduce((sum:number,rows:any)=>sum+rows.length,0));
 await page.getByRole('button',{name:'Attach',exact:true}).click();await page.getByRole('dialog',{name:'Message attachments',exact:true}).getByRole('button',{name:'Camera',exact:true}).click();
 const video=page.locator('[data-alpha-camera="viewfinder"] video');await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.evaluate(()=>(window as any).holdMessageCommit=true);await page.getByRole('button',{name:'Take photo',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).messageCommitHeld)).toBe(true);
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Original Camera draft');
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));await page.getByRole('button',{name:'Messages',exact:true}).click();await page.getByRole('button',{name:'Dad',exact:true}).click();
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Keep the newer draft');await page.evaluate(()=>(window as any).releaseMessageCommit());
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Keep the newer draft');await expect(page.getByRole('button',{name:'Attach',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Remove Photo.jpg',exact:true})).toHaveCount(0);
 const result=await page.evaluate(async()=>{const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');const state=JSON.parse(localStorage.getItem('alpha.dev.app.messages')!);return {photos:(await browserPhotoLibrary.list()).items.length,messages:Object.values(state.threads).reduce((sum:number,rows:any)=>sum+rows.length,0),newDraft:state.localDrafts.dad};});
 expect(result.photos).toBe(1);expect(result.messages).toBe(before);expect(result.newDraft.text).toBe('Keep the newer draft');expect(result.newDraft.file).toBeNull();
});

test('the shared Photos grid embeds a PNG with matching bytes and file type',async({page})=>{
 const encoded=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=12;canvas.height=8;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a36';ctx.fillRect(0,0,12,8);const image=canvas.toDataURL('image/png'),bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));const {importBrowserPhoto}=await import('/src/prototype/browser-camera.ts');await importBrowserPhoto({original:new File([bytes],'library-source.png',{type:'image/png'}),image,width:12,height:8},new AbortController().signal);return image.split(',')[1];});
 await page.getByRole('button',{name:'Attach',exact:true}).click();await page.getByRole('dialog',{name:'Message attachments',exact:true}).getByRole('button',{name:'Photos and files',exact:true}).click();const picker=page.getByRole('dialog',{name:'Attach files',exact:true});await picker.locator('.attachment-picker-photos>button').first().click();await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove Photo.png',exact:true}).locator('img')).toBeVisible();const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.messages')!).localDrafts.maya.file);expect(draft.mimeType).toBe('image/png');expect(draft.dataBase64).toBe(encoded);
});
