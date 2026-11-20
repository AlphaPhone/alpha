import {openRetainedNativeNotes} from './helpers/native-notes';
import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {flagOffAndroid,harness,button,fenceNetwork,expectNoDevelopmentSurface,residentHome,type FlagOffDocument} from './flag-off-android';

const contents='Public fact: twelve raised beds.\nA site visit confirmed the count.';
const answer='The report says there are twelve raised beds.';
const garden:FlagOffDocument={name:'garden-report.txt',mimeType:'text/plain',text:contents};
const sha256=createHash('sha256').update(contents).digest('hex');
const savedNotes=(page:Page)=>harness(page,f=>{
 const slot=f.slots['notes-records:v1:device'];
 return slot ? JSON.parse(JSON.parse(slot).currentRaw).records : [];
});

test('J03 on the flag-off Android renderer stages one exact document until Send',async({page})=>{
 const foreign=await fenceNetwork(page);
 await flagOffAndroid(page,{document:garden});await residentHome(page);
 await page.evaluate(text=>{
  const w=window as any;
  w.flagOff.replies.push(text);
  w.fileQuestions=[];
  const bridge=w.Capacitor,send=bridge.nativePromise;
  bridge.nativePromise=function(plugin:string,method:string,input:any){
   if(plugin==='Agent'&&method==='requestStream')w.fileQuestions.push(JSON.parse(input.body));
   return send.call(bridge,plugin,method,input);
  };
 },answer);
 await button(page,'Files').click();await button(page,'Documents').click();await button(page,'Open garden-report.txt').click();
 await expect(page.getByText('A site visit confirmed the count.',{exact:true})).toBeVisible();
 expect(await harness(page,f=>f.documents.picks)).toEqual([{action:'files',path:'Documents/garden-report.txt'}]);
 await button(page,'File actions').click();await button(page,'Ask Alpha').click();
 await expect(button(page,'Remove garden-report.txt')).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('Explain this file');
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).fileQuestions)).toEqual([]);
 await button(page,'Send').click();
 await expect(button(page,'Message actions: '+answer)).toHaveCount(1);
 const requests=await page.evaluate(()=>(window as any).fileQuestions);
 expect(requests).toHaveLength(1);expect(requests[0].text.split('[USER MESSAGE]\n').pop()).toBe('Explain this file');
 expect(requests[0].images).toEqual([{name:garden.name,mimeType:garden.mimeType,data:Buffer.from(contents).toString('base64')}]);
 await expect(page.getByRole('button',{name:/^Review summary note/})).toHaveCount(0);
 expect(await savedNotes(page)).toEqual([]);
 await expectNoDevelopmentSurface(page);
 expect(await harness(page,f=>f.unexpected)).toEqual([]);expect(foreign).toEqual([]);
});

test('a legacy native note reopens its previously verified source after reload',async({page})=>{
 const foreign=await fenceNetwork(page);
 await flagOffAndroid(page,{document:garden});await residentHome(page);
 const reference='b1:6b70327f-819c-447d-a971-2447ea066589';
 const documentSource={version:1,name:garden.name,mimeType:garden.mimeType,size:Buffer.byteLength(contents),sha256,reference};
 const record={id:'j03-native-retained-summary',kind:'text',title:'Garden summary',body:'There are twelve raised beds.',documentSource};
 await page.evaluate(({record,reference,sha256})=>{
  const f=(window as any).flagOff;
  f.documents.references[reference]=sha256;
  const currentRaw=JSON.stringify({version:2,collectionId:crypto.randomUUID(),records:[record],deleted:[]});
  f.slots['notes-records:v1:device']=JSON.stringify({version:1,archive:{v1:null,v2:null,daily:null},currentRaw});
  f.persist();
 },{record,reference,sha256});
 await residentHome(page);await openRetainedNativeNotes(page);
 await button(page,'Open Garden summary').click();await button(page,'Attachment').click();
 await expect.poll(()=>harness(page,f=>f.documents.opened)).toEqual([{reference,sha256,size:documentSource.size,mimeType:garden.mimeType}]);
 await expect(page.getByRole('dialog',{name:'Note source document'})).toHaveCount(0);
 expect(await savedNotes(page)).toEqual([record]);expect(await harness(page,f=>f.streams)).toBe(0);
 await expectNoDevelopmentSurface(page);
 expect(await harness(page,f=>f.unexpected)).toEqual([]);expect(foreign).toEqual([]);
});
