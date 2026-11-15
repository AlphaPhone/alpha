import {test,expect,type Page} from '@playwright/test';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';

async function setup(page:Page){
  await page.addInitScript(()=>{if(!localStorage.getItem('alpha.connection.selection.v1'))localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));});
  await page.goto('/?mode=dev&tools=1');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await openConnectionDiagnostics(page);
  await page.getByRole('button',{name:'Connect development profile',exact:true}).click();
  await returnToApps(page);
  await page.getByRole('button',{name:'Open conversation',exact:true}).click();
}
async function attach(page:Page,file={name:'composer-qa.txt',mimeType:'text/plain',buffer:Buffer.from('The launch check word is lilac.')}){
  await page.getByRole('button',{name:'Chat actions',exact:true}).click();
  await page.getByRole('button',{name:'Photos and files',exact:true}).click();
  const picker=page.getByRole('dialog',{name:'Attach files',exact:true});await expect(picker).toBeVisible();
  const chooser=page.waitForEvent('filechooser');
  await picker.getByRole('button',{name:'From computer',exact:true}).click();
  await(await chooser).setFiles(file);
  await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Remove attachment '+file.name,exact:true})).toBeVisible();
}

test('the plus menu adds a file, sends its exact bytes and retains its message chip on reload',async({page})=>{
  await setup(page);
  await page.evaluate(async()=>{
    const {alphaClient}=await import('/src/runtime/alpha-client.ts');const original=alphaClient.send.bind(alphaClient);
    alphaClient.send=async(...args:any[])=>{(window as any).sentFileText=args[0];(window as any).sentFileOptions=args[4];return original(...args);};
  });
  await attach(page);
  await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText('Development reply. Edit this response in Agent connection.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).sentFileText)).toBe('Please review the attached file.');
  expect(await page.evaluate(()=>(window as any).sentFileOptions.images)).toMatchObject([{name:'composer-qa.txt',mimeType:'text/plain',data:'VGhlIGxhdW5jaCBjaGVjayB3b3JkIGlzIGxpbGFjLg=='}]);
  await expect(page.getByRole('button',{name:'Remove attachment composer-qa.txt',exact:true})).toHaveCount(0);
  await expect(page.locator('[data-alpha-message-id]').getByText('composer-qa.txt',{exact:true})).toBeVisible();
  await expect(page.locator('.alpha-user-message')).toHaveCount(0);
  await page.reload();await page.getByRole('button',{name:'Open conversation',exact:true}).click();
  await expect(page.locator('[data-alpha-message-id]').getByText('composer-qa.txt',{exact:true})).toBeVisible();
  await expect(page.locator('.alpha-user-message')).toHaveCount(0);
});

test('the plus menu opens cancellable message search without a Home item',async({page})=>{
  await setup(page);
  await page.evaluate(async()=>{const {connectionController}=await import('/src/runtime/connection-ui.tsx');connectionController.searchMessages=async(query:string)=>[{messageId:'11111111-1111-4111-8111-111111111111',conversationId:'22222222-2222-4222-8222-222222222222',roomId:'33333333-3333-4333-8333-333333333333',role:'user',text:query+' exact result',snippet:query+' exact result',createdAt:Date.now(),score:1}];});
  await page.getByRole('button',{name:'Chat actions',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Chat actions',exact:true}).getByText('Back to Home',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Search chat',exact:true}).click();
  await page.getByRole('textbox',{name:'Search messages',exact:true}).fill('launch');
  await expect(page.getByRole('dialog',{name:'Search chats',exact:true}).getByText('launch exact result',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close search',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Search chats',exact:true})).toHaveCount(0);
});

 test('attachment menu is absent during an active reply and returns after completion',async({page})=>{
  await setup(page);await page.evaluate(async()=>{const {alphaClient}=await import('/src/runtime/alpha-client.ts');const send=alphaClient.send.bind(alphaClient);alphaClient.send=async(...args:any[])=>{await new Promise<void>(resolve=>(window as any).finishHeldReply=resolve);return send(...args);};});
  await page.getByRole('textbox',{name:'Message Alpha',exact:true}).fill('Controlled pending reply');await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByRole('button',{name:'Chat actions',exact:true})).toHaveCount(0);
  await page.evaluate(()=>(window as any).finishHeldReply());await expect(page.getByText('Development reply. Edit this response in Agent connection.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Chat actions',exact:true})).toBeVisible();
 });

 test('a photo can be sent with an empty editor and restores without a generated caption or empty bubble',async({page})=>{
  await setup(page);await attach(page,{name:'image-only-qa.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7l8AAAAASUVORK5CYII=','base64')});
  await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Send',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('Development reply. Edit this response in Agent connection.',{exact:true})).toBeVisible();
  await expect(page.locator('.alpha-user-message')).toHaveCount(0);await page.reload();await page.getByRole('button',{name:'Open conversation',exact:true}).click();await expect(page.locator('[data-alpha-message-id]').getByText('image-only-qa.png',{exact:true})).toBeVisible();await expect(page.getByText('Please review the attached file.',{exact:true})).toHaveCount(0);await expect(page.locator('.alpha-user-message')).toHaveCount(0);
 });

 test('the in-app file picker reads a selected Alpha file without opening a system chooser and preserves the draft',async({page})=>{
  await setup(page);await page.getByRole('textbox',{name:'Message Alpha',exact:true}).fill('Keep this draft');
  await page.evaluate(async()=>{const {BrowserFiles}=await import('/src/browser/files.ts');const f=new BrowserFiles();const selected=await f.importFile(new File(['{"picker":"exact"}'],'alpha-picker-qa.json',{type:'application/json'}));await f.forgetSelected(selected);});
  let choosers=0;page.on('filechooser',()=>choosers++);
  await page.getByRole('button',{name:'Chat actions',exact:true}).click();await page.getByRole('button',{name:'Photos and files',exact:true}).click();const picker=page.getByRole('dialog',{name:'Attach files',exact:true});await picker.getByRole('button',{name:'Files',exact:true}).click();
  const item=picker.getByRole('button',{name:'alpha-picker-qa.json',exact:true});await expect(item).toBeVisible();await item.click();await expect(item).toHaveAttribute('aria-pressed','true');await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
  await expect(picker).toHaveCount(0);expect(choosers).toBe(0);await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('Keep this draft');await expect(page.getByRole('button',{name:'Remove attachment alpha-picker-qa.json',exact:true})).toBeVisible();
 });

 test('the in-app photo grid selects a saved photo without opening Android-style file selection',async({page})=>{
  await setup(page);await page.evaluate(async()=>{const {importBrowserPhoto}=await import('/src/prototype/browser-camera.ts');const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;const c=canvas.getContext('2d')!;c.fillStyle='red';c.fillRect(0,0,80,100);c.fillStyle='blue';c.fillRect(80,0,80,100);await importBrowserPhoto({original:new File(['synthetic'],'picker-photo.png',{type:'image/png'}),image:canvas.toDataURL('image/png'),width:160,height:100},new AbortController().signal);});
  let choosers=0;page.on('filechooser',()=>choosers++);await page.getByRole('button',{name:'Chat actions',exact:true}).click();await page.getByRole('button',{name:'Photos and files',exact:true}).click();const picker=page.getByRole('dialog',{name:'Attach files',exact:true});
  const photo=picker.locator('.attachment-picker-photos>button').first();await expect(photo).toBeVisible();await photo.click();await expect(photo).toHaveAttribute('aria-pressed','true');await photo.click();await expect(photo).toHaveAttribute('aria-pressed','false');await photo.click();await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
  expect(choosers).toBe(0);await expect(picker).toHaveCount(0);await expect(page.locator('.chat-file-chip img')).toBeVisible();await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');
 });

 test('closing an in-flight local read releases its selection and cannot attach later',async({page})=>{
  await setup(page);await page.getByRole('textbox',{name:'Message Alpha',exact:true}).fill('Keep the unsent draft');
  await page.evaluate(async()=>{const {BrowserFiles}=await import('/src/browser/files.ts');const f=new BrowserFiles();const selected=await f.importFile(new File(['cancelled-read'],'picker-cancel.txt',{type:'text/plain'}));await f.forgetSelected(selected);const original=BrowserFiles.prototype.attachment,forget=BrowserFiles.prototype.forgetSelected;(window as any).pickerReads=0;(window as any).pickerReleased=[];BrowserFiles.prototype.attachment=async function(input:any){(window as any).pickerReads++;await new Promise<void>(resolve=>(window as any).releasePickerRead=resolve);return original.call(this,input);};BrowserFiles.prototype.forgetSelected=async function(input:any){(window as any).pickerReleased.push(input.selectionId);return forget.call(this,input);};});
  await page.getByRole('button',{name:'Chat actions',exact:true}).click();await page.getByRole('button',{name:'Photos and files',exact:true}).click();const picker=page.getByRole('dialog',{name:'Attach files',exact:true});await picker.getByRole('button',{name:'Files',exact:true}).click();await picker.getByRole('button',{name:'picker-cancel.txt',exact:true}).click();await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();await page.waitForFunction(()=>(window as any).pickerReads===1);
  await picker.getByRole('button',{name:'Close attachments',exact:true}).click();await expect(picker).toHaveCount(0);await page.evaluate(()=>(window as any).releasePickerRead());await expect.poll(()=>page.evaluate(()=>(window as any).pickerReleased.length)).toBe(1);await expect(page.locator('.chat-file-chip')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('Keep the unsent draft');
 });

 test('folder search and Android Back unwind inside the picker before cancelling',async({page})=>{
  await setup(page);await page.evaluate(async()=>{const {BrowserFiles}=await import('/src/browser/files.ts');const f=new BrowserFiles();await f.storageCreateFolder({parent:'',name:'Picker folder'});const folder=(await f.list({id:'root'})).entries.find((row:any)=>row.name==='Picker folder')!;const selected=await f.importFile(new File(['scope'],'needle-picker.txt',{type:'text/plain'}),folder.id);await f.forgetSelected(selected);});
  await page.getByRole('button',{name:'Chat actions',exact:true}).click();await page.getByRole('button',{name:'Photos and files',exact:true}).click();const picker=page.getByRole('dialog',{name:'Attach files',exact:true});await picker.getByRole('button',{name:'Files',exact:true}).click();await picker.getByRole('button',{name:'Picker folder',exact:true}).click();await expect(picker.getByRole('button',{name:'needle-picker.txt',exact:true})).toBeVisible();
  const search=picker.getByRole('searchbox',{name:'Search files',exact:true});await search.fill('needle');await expect(picker.getByRole('button',{name:'needle-picker.txt',exact:true})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(search).toHaveValue('');await expect(picker).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(picker.getByRole('button',{name:'Picker folder',exact:true})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(picker).toHaveCount(0);await expect(page.locator('.chat-file-chip')).toHaveCount(0);
 });
