import {openLegacyNotes} from './helpers/legacy-notes';
import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';

const contents='Public fact: twelve raised beds.\nA site visit confirmed the count.';

test('a retained browser note keeps its verified source through rename and fails closed after deletion',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 const reference=await page.evaluate(async contents=>{
  const {registerPlugin}=await import('/src/platform-plugins.ts');
  const files=registerPlugin<any>('AlphaFiles'),attachments=registerPlugin<any>('AlphaMailAttachments');
  const selected=await files.importFile(new File([contents],'summary-source.txt',{type:'text/plain'}));
  const file=await attachments.readSelected(selected);
  return (await attachments.retainSourceReference({...selected,sha256:file.sha256})).reference;
 },contents);
 expect(reference).toMatch(/^b1:[a-f0-9-]{36}$/);
 const record={id:'retained-summary',kind:'text' as const,title:'Garden summary',body:'There are twelve raised beds.',
  documentSource:{version:1 as const,name:'summary-source.txt',mimeType:'text/plain',size:Buffer.byteLength(contents),sha256:createHash('sha256').update(contents).digest('hex'),reference}};
 await openLegacyNotes(page,[record]);
 await page.reload();await openLegacyNotes(page);
 await page.getByRole('button',{name:'Open Garden summary',exact:true}).click();
 const source=page.getByRole('button',{name:'Attachment',exact:true});
 const preview=page.getByRole('dialog',{name:'Reviewed attachment'});
 await source.click();await expect(preview).toContainText(contents);await preview.getByRole('button',{name:'Done',exact:true}).click();
 await page.evaluate(async()=>{const{registerPlugin}=await import('/src/platform-plugins.ts');const files=registerPlugin<any>('AlphaFiles'),row=(await files.list({})).entries[0];await files.rename({id:row.id,expectedRevision:row.revision,name:'renamed-source.txt'});});
 await source.click();await expect(preview.getByRole('heading')).toHaveText('renamed-source.txt');await expect(preview).toContainText(contents);await preview.getByRole('button',{name:'Done',exact:true}).click();
 await page.evaluate(async()=>{const{registerPlugin}=await import('/src/platform-plugins.ts');const files=registerPlugin<any>('AlphaFiles'),row=(await files.list({})).entries.find((entry:any)=>entry.name==='renamed-source.txt');await files.delete({id:row.id,expectedRevision:row.revision,confirmPermanent:true});});
 await source.click();await expect(page.getByText('Couldn’t open the linked file.',{exact:true})).toBeVisible();await expect(preview).toHaveCount(0);
 const notes=await page.evaluate(async()=>JSON.parse((await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw())).records);
 expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(record);
});
