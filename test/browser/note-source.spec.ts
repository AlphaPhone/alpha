import {createHash} from 'node:crypto';
import {test,expect,type Page} from '@playwright/test';
import {openLegacyNotes} from './helpers/legacy-notes';

const file={name:'source.txt',mimeType:'text/plain',buffer:Buffer.from('Original source bytes.\nA fact for the summary.')};
const linkedNote={id:'retained-source-note',kind:'text' as const,title:'Source-linked summary',body:'Reviewed summary text.',
 documentSource:{version:1 as const,name:file.name,mimeType:file.mimeType,sha256:createHash('sha256').update(file.buffer).digest('hex'),size:file.buffer.length}};

async function chooseSource(page:Page,selected=file){
 const picker=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Attachment',exact:true}).click();
 await (await picker).setFiles(selected);
}
async function saved(page:Page){
 return page.evaluate(async()=>{
  const raw=await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw();
  return JSON.parse(raw!).records.find((n:any)=>n.id==='retained-source-note');
 });
}

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
});

for(const theme of ['light','dark'])test(`a legacy linked note opens only matching bytes directly in ${theme}`,async({page},info)=>{
 await page.setViewportSize({width:360,height:640});await page.goto('/?theme='+theme);
 await openLegacyNotes(page,[linkedNote]);
 await page.reload();await openLegacyNotes(page);
 await page.getByRole('button',{name:'Open Source-linked summary',exact:true}).click();
 const preview=page.getByRole('dialog',{name:'Reviewed attachment'});
 const record=await saved(page);
 await chooseSource(page,{...file,buffer:Buffer.from('Changed source')});
 await expect(page.getByText('That file doesn’t match this attachment.',{exact:true})).toBeVisible();
 await expect(preview).toHaveCount(0);
 await chooseSource(page,{...file,name:'renamed-source.txt'});
 await expect(preview.getByRole('heading')).toHaveText('renamed-source.txt');
 await expect(preview).toContainText(file.buffer.toString());
 await expect(preview).toHaveCSS('color-scheme',theme);
 await expect(page.getByRole('dialog',{name:'Note source document'})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('attachment-preview.png')});
 await preview.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.getByRole('button',{name:'Attachment',exact:true})).toBeFocused();
 expect(await saved(page)).toEqual(record);
});

test('leaving a note while the matching source is being read prevents a late preview',async({page})=>{
 await page.goto('/');
 await openLegacyNotes(page,[linkedNote]);
 await page.getByRole('button',{name:'Open Source-linked summary',exact:true}).click();
 const before=await saved(page);
 await page.evaluate(()=>{
  const read=File.prototype.arrayBuffer;
  File.prototype.arrayBuffer=async function(){
   if(this.name==='source.txt')await new Promise<void>(resolve=>{(window as any).finishSourceRead=resolve;});
   return read.call(this);
  };
 });
 await chooseSource(page);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).finishSourceRead)).toBe('function');
 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open Source-linked summary',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as any).finishSourceRead());
 await expect(page.getByRole('dialog',{name:'Reviewed attachment'})).toHaveCount(0);
 expect(await saved(page)).toEqual(before);
});
