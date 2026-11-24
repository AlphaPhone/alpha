import {openPhotoShare,choosePhotoAction} from './helpers/owned-photo';
import { returnToApps } from './app-navigation';
import {test,expect} from '@playwright/test';

test('browser camera persists a real encoded frame, releases capture and restores Photos after reload',async({page},info)=>{
 await page.clock.install();
 await page.addInitScript(()=>{
 const devices=navigator.mediaDevices;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices});
 localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#c33';ctx.fillRect(0,0,320,480);ctx.fillStyle='#3c3';ctx.fillRect(320,0,320,480);
 navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);setInterval(()=>{ctx.fillStyle='#3c3';ctx.fillRect(320,0,320,480);},100);return stream;};

 });
 await page.goto('/');await page.getByRole('button',{name:'Camera',exact:true}).click();
 const video=page.locator('[data-alpha-camera="viewfinder"] video');await expect(video).toBeVisible();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.evaluate(()=>{(window as any).cameraTracks=(document.querySelector('[data-alpha-camera="viewfinder"] video') as HTMLVideoElement).srcObject;});
 await page.evaluate(()=>{const add=IDBObjectStore.prototype.add;(window as any).restorePhotoWrites=()=>{IDBObjectStore.prototype.add=add;};IDBObjectStore.prototype.add=function(value,key){if(this.name==='photos')throw new DOMException('Synthetic full storage','QuotaExceededError');return add.call(this,value,key);};});
 await page.getByRole('button',{name:'Take photo',exact:true}).click();
 await expect(page.getByText('Not saved',{exact:true})).toBeVisible();
 expect(await page.evaluate(async()=>{const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');return (await browserPhotoLibrary.list()).items.length;})).toBe(0);
 await page.evaluate(()=>(window as any).restorePhotoWrites());
 await page.getByRole('button',{name:'Take photo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open last photo',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('capture.png')});
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
 await expect.poll(()=>page.evaluate(()=>(window as any).cameraTracks.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await page.reload();await page.getByRole('button',{name:'Photos',exact:true}).click();
 const saved=page.getByRole('button',{name:/^Photo, /});await expect(saved).toHaveCount(1);await saved.click();
 await expect(page.locator('[data-alpha-subview="photos-viewer"]').getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await openPhotoShare(page);await page.getByRole('dialog',{name:'Share',exact:true}).getByRole('button',{name:'Save file',exact:true}).click();
 expect((await download).suggestedFilename()).toMatch(/^Alpha-photo-\d+\.jpg$/);
 await page.getByRole('button',{name:'Favorite',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove from favorites',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('saved-photo.png'),animations:'disabled'});
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await choosePhotoAction(page,'Delete photo');
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Albums',exact:true}).click();
 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 await page.getByRole('button',{name:/^Photo, /}).click();
 await page.getByLabel('Photo actions',{exact:true}).click();await expect(page.getByRole('button',{name:'Recover',exact:true})).toBeVisible();
 expect(await page.evaluate(async()=>{const {browserPhotoLibrary:library}=await import('/src/prototype/browser-camera.ts');return (await library.list({trashed:true})).items.length;})).toBe(1);
 await choosePhotoAction(page,'Recover');await page.mouse.move(0,0);
 await expect.poll(()=>page.evaluate(async()=>{const {browserPhotoLibrary:library}=await import('/src/prototype/browser-camera.ts');return {trash:(await library.list({trashed:true})).items.length,live:(await library.list()).items.length};})).toEqual({trash:0,live:1});
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await expect(page.getByText('Restored',{exact:true})).toHaveCount(0);
 await page.clock.fastForward(9999);
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await page.clock.fastForward(1);
 await expect(page.getByText('Restored',{exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {browserPhotoLibrary:library}=await import('/src/prototype/browser-camera.ts');
  const row=(await library.list()).items[0];
  await library.setFavorite({id:row.id,revision:row.mutationRevision,favorite:false});
  let staleRejected=false;try{await library.setTrashed({id:row.id,revision:row.mutationRevision,trashed:true});}catch{staleRejected=true;}
  const current=await library.read({id:row.id});
  const trashed=await library.setTrashed({id:row.id,revision:current.mutationRevision,trashed:true});
  const confirmation=await library.prepareDeleteTrash({all:true});
  await library.setTrashed({id:row.id,revision:trashed.mutationRevision,trashed:false});
  const receipt=await library.deletePreparedTrash(confirmation);
  return {staleRejected,deleted:receipt.deletedIds.length,skipped:receipt.skippedIds.length,retained:(await library.list()).items.length};
 });
 expect(result).toEqual({staleRejected:true,deleted:0,skipped:1,retained:1});
});

test('browser camera permission denial retries explicitly without a saved photo',async({page})=>{
 await page.addInitScript(()=>{
 const devices=navigator.mediaDevices;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices});
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  (window as any).cameraAttempts=0;
  navigator.mediaDevices.getUserMedia=async()=>{(window as any).cameraAttempts++;throw new DOMException('Synthetic denial','NotAllowedError');};
 });
 await page.goto('/');await page.getByRole('button',{name:'Camera',exact:true}).click();
 const recovery=page.getByRole('alert',{name:'Camera off'});
 await expect(recovery).toBeVisible();
 await expect(page.locator('[data-alpha-camera="said"]')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).cameraAttempts)).toBe(1);
 await expect(recovery).toHaveText('Camera offRetry');
 await expect(recovery.getByRole('button',{name:'Open settings'})).toHaveCount(0);
 await page.getByRole('button',{name:'Take photo',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).cameraAttempts)).toBe(2);
 await recovery.getByRole('button',{name:'Retry',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).cameraAttempts)).toBe(3);
 await expect(recovery).toBeVisible();
 await expect(page.locator('[data-alpha-camera="viewfinder"] video')).toHaveCount(0);
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
 await page.getByRole('button',{name:'Photos',exact:true}).click();
 await expect(page.getByRole('button',{name:/^Photo, /})).toHaveCount(0);
});

test('leaving Camera while permission is pending stops a late stream without reopening preview',async({page})=>{
 await page.addInitScript(()=>{
 const devices=navigator.mediaDevices;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices});
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{(window as any).releaseCamera=()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const stream=canvas.captureStream(10);(window as any).lateCameraStream=stream;resolve(stream);
  };});
 });
 await page.goto('/');await page.getByRole('button',{name:'Camera',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseCamera)).toBe('function');
 await returnToApps(page);
 await expect(page.getByRole('button',{name:'Camera',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as any).releaseCamera());
 await expect.poll(()=>page.evaluate(()=>(window as any).lateCameraStream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await expect(page.locator('[data-alpha-camera="viewfinder"] video')).toHaveCount(0);
});

test('a pending photo read cannot attach to a replacement conversation',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
  const paint=()=>{const ctx=canvas.getContext('2d')!;ctx.fillStyle='green';ctx.fillRect(0,0,320,240);};
  paint();
  navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);setInterval(paint,100);return stream;};
 });
 await page.goto('/?mode=dev');
 const firstConversation=await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  await connectionController.initialize();
  await connectionController.startDevelopment('local');
  await connectionController.newConversation();
  return connectionController.getSelectedConversationId();
 });
 expect(firstConversation).toBeTruthy();
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await page.getByRole('button',{name:'Camera',exact:true}).click();
 const video=page.locator('[data-alpha-camera="viewfinder"] video');
 await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.readyState)).toBeGreaterThanOrEqual(2);
 await page.getByRole('button',{name:'Take photo',exact:true}).click();
 await page.getByRole('button',{name:'Open last photo',exact:true}).click();
 await expect(page.locator('[data-alpha-subview="photos-viewer"]')).toBeVisible();
 await page.evaluate(async()=>{
  const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');
  const read=browserPhotoLibrary.read.bind(browserPhotoLibrary);
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;});
  const fixture={started:false,finished:false,release};
  (window as any).cameraAttachmentRead=fixture;
  browserPhotoLibrary.read=async input=>{
   const result=await read(input);
   if(!fixture.started){fixture.started=true;await held;fixture.finished=true;}
   return result;
  };
 });
 await choosePhotoAction(page,'Ask Alpha');
 await expect.poll(()=>page.evaluate(()=>(window as any).cameraAttachmentRead.started)).toBe(true);
 const nextConversation=await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  await connectionController.newConversation();
  return connectionController.getSelectedConversationId();
 });
 expect(nextConversation).toBeTruthy();expect(nextConversation).not.toBe(firstConversation);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','photos');
 await page.evaluate(()=>(window as any).cameraAttachmentRead.release());
 await expect.poll(()=>page.evaluate(()=>(window as any).cameraAttachmentRead.finished)).toBe(true);
 const attachment=page.getByRole('button',{name:'Preview attached photo',exact:true});
 await expect(page.getByText('Chat changed. Choose the photo again.',{exact:true})).toBeVisible();
 await expect(attachment).toHaveCount(0);

 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await choosePhotoAction(page,'Ask Alpha');
 await expect(attachment).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');
});
