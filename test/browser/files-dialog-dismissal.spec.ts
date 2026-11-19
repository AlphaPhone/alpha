import {guardCalendarFixture as guardNoMedia} from './calendar-draft-readiness';
import {test,expect} from '@playwright/test';
test.beforeEach(async({context,page})=>{await guardNoMedia(context);await page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/,route=>route.abort());});
for(const theme of ['light','dark'])test(`${theme} file rename and delete dialogs restore their opener and preserve the file`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto(`/?mode=dev&theme=${theme}`);
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Retained contents'],'keep.txt',{type:'text/plain'}));});
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Retained unsent file question');
 // The first outside tap lowers the raised composer; it preserves the draft.
 await page.locator('[data-alpha-dock-scrim="true"]').click({position:{x:12,y:12}});
 await expect(page.getByRole('textbox',{name:'Ask Alpha',exact:true})).toHaveValue('Retained unsent file question');
 await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();await page.getByRole('button',{name:'Open keep.txt',exact:true}).click();
 const remove=page.getByRole('button',{name:'Delete file',exact:true});await expect(remove).toHaveCount(0);
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 const actions=page.getByRole('dialog',{name:'File actions',exact:true});
 await expect(actions.getByRole('button')).toHaveText(['Share','Add to folder','Ask Alpha','Download file','Delete']);
 await page.screenshot({path:test.info().outputPath('file-actions.png'),animations:'disabled'});
 await page.keyboard.press('Escape');await expect(remove).toHaveCount(0);
 await expect(page.getByRole('button',{name:'File actions',exact:true})).toBeFocused();
 const selection=await page.evaluate(async()=>(await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context.selectedObject);
 const rename=page.getByRole('button',{name:'Rename',exact:true});await rename.click();
 const dialog=page.getByRole('dialog',{name:'Rename',exact:true}),name=dialog.getByRole('textbox',{name:'Name',exact:true});await expect(name).toBeFocused();await name.fill('Unapproved.txt');
 const dock=await page.locator('[data-alpha-layer="pill"]').boundingBox(),confirm=await dialog.getByRole('button',{name:'Rename',exact:true}).boundingBox();
 expect(confirm!.y+confirm!.height).toBeLessThan(dock!.y);
 await page.screenshot({path:test.info().outputPath('rename-review.png'),animations:'disabled'});
 // A native HTML review above the inline sheet owns the first Back.
 await page.evaluate(()=>{const review=document.createElement('dialog');review.setAttribute('aria-label','Owned outer review');review.textContent='Synthetic review';review.addEventListener('close',()=>review.remove());document.body.append(review);review.showModal();});
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(page.getByRole('dialog',{name:'Owned outer review',exact:true})).toHaveCount(0);await expect(name).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(name).toHaveCount(0);await expect(rename).toBeFocused();expect(await page.evaluate(async()=>(await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context.selectedObject)).toEqual(selection);
 await rename.click();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(rename).toBeFocused();
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));await expect(page.getByRole('button',{name:'Files',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Ask Alpha',exact:true})).toHaveValue('Retained unsent file question');
 expect(await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return (await registerPlugin<any>('AlphaFiles').storageList({path:''})).entries.map((row:any)=>row.name);})).toEqual(['keep.txt']);
});
test.describe('wide Files preview',()=>{
 test.use({hasTouch:true,isMobile:true});
 test('keeps folder options beside File actions and returns Move focus to the menu opener',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
  await page.goto('/?mode=dev');
  await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Split contents'],'split.txt',{type:'text/plain'}));});
  await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();await page.getByRole('button',{name:'Open split.txt',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/(^|\s)alpha-split(\s|$)/);
  // The folder beside the preview still opens its own menu.
  const folderOptions=page.getByRole('button',{name:'Files options',exact:true});
  await folderOptions.click();
  const folderMenu=page.getByRole('dialog',{name:'Sort and more',exact:true});
  await expect(folderMenu.getByRole('button',{name:'New folder',exact:true})).toBeVisible();
  await expect(folderMenu.getByRole('button',{name:'Delete file',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(folderMenu).toHaveCount(0);
  // The preview's menu holds only the file's actions; a sheet opened from it returns focus to its opener.
  const opener=page.getByRole('button',{name:'File actions',exact:true});
  await opener.click();
  const actions=page.getByRole('dialog',{name:'File actions',exact:true});
  await expect(actions.getByRole('button',{name:'Delete file',exact:true})).toBeVisible();
  await expect(actions.getByRole('button',{name:'New folder',exact:true})).toHaveCount(0);
  await actions.getByRole('button',{name:'Add to folder',exact:true}).click();
  const move=page.getByRole('dialog',{name:'Move to',exact:true});await expect(move).toBeVisible();
  await move.getByRole('button',{name:'Cancel',exact:true}).click();await expect(move).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return (await registerPlugin<any>('AlphaFiles').storageList({path:''})).entries.map((row:any)=>row.name);})).toEqual(['split.txt']);
 });
});
test('cancelling an excerpt review opened from File actions returns focus to the menu opener',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/?mode=dev');
 // Ask Alpha attaches a plain file directly; a file with a secret opens the excerpt review from the menu instead.
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Your verification code is 482913'],'question.txt',{type:'text/plain'}));});
 await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();await page.getByRole('button',{name:'Open question.txt',exact:true}).click();
 const opener=page.getByRole('button',{name:'File actions',exact:true});
 await opener.click();await page.getByRole('dialog',{name:'File actions',exact:true}).getByRole('button',{name:'Use excerpt',exact:true}).click();
 const question=page.getByRole('dialog',{name:'Ask about selected content'});await expect(question).toBeVisible();
 await question.getByRole('button',{name:'Cancel',exact:true}).click();await expect(question).toHaveCount(0);
 await expect(opener).toBeFocused();
});
test('a File actions menu opened during a slow delete closes with the preview and leaves folder options working',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/?mode=dev');
 await page.evaluate(async()=>{
  const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Slow delete'],'slow.txt',{type:'text/plain'}));
  const {BrowserFiles}=await import('/src/browser/files.ts');const trash=BrowserFiles.prototype.storageTrash,w=window as any;
  BrowserFiles.prototype.storageTrash=async function(input){await new Promise<void>(resolve=>{w.releaseTrash=resolve;});return trash.call(this,input);};
 });
 await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();await page.getByRole('button',{name:'Open slow.txt',exact:true}).click();
 const opener=page.getByRole('button',{name:'File actions',exact:true}),actions=page.getByRole('dialog',{name:'File actions',exact:true});
 await opener.click();await actions.getByRole('button',{name:'Delete file',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseTrash)).toBe('function');
 // A second tap while the delete is still running opens a menu that belongs to this preview.
 await opener.click();await expect(actions).toBeVisible();
 await page.evaluate(()=>(window as any).releaseTrash());
 await expect(page.getByRole('button',{name:'Open slow.txt',exact:true})).toHaveCount(0);
 await expect(actions).toHaveCount(0);
 await page.getByRole('button',{name:'Files options',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Sort and more',exact:true}).getByRole('button',{name:'New folder',exact:true})).toBeVisible();
});
