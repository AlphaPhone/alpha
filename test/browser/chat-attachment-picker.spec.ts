import {expect,test,type Page} from '@playwright/test';

async function setup(page:Page) {
 const outbound:string[]=[];
 await page.route('https://**/*',route=>{outbound.push(route.request().url());return route.abort();});
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/?mode=dev');
 await expect.poll(()=>page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  const state=connectionController.getSnapshot();return state.startupResolved&&!state.busy;
 })).toBe(true);
 await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  const {LocalAgentProtocol}=await import('/src/runtime/local-agent.ts');
  const {BrowserFiles}=await import('/src/browser/files.ts');
  const files=new BrowserFiles(),name='Reviewed notes.txt';
  const save=async(text:string)=>{
   const selection=await files.importFile(new File([text],name,{type:'text/plain'}));
   await files.forgetSelected({selectionId:selection.selectionId});
  };
  await save('first bytes');
  const {browserPhotoLibrary,importBrowserPhoto}=await import('/src/prototype/browser-camera.ts');
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  const graphics=canvas.getContext('2d')!;graphics.fillStyle='#452a38';graphics.fillRect(0,0,16,16);
  const photo=canvas.toDataURL('image/jpeg');
  await importBrowserPhoto({original:new File([],'Photo.jpg',{type:'image/jpeg'}),image:photo,width:16,height:16},new AbortController().signal);
  const fixture={name,files,save,photo,reads:0,photoReads:0,sends:[] as unknown[],rows:[] as unknown[],room:crypto.randomUUID()};
  const readPhoto=browserPhotoLibrary.read;
  browserPhotoLibrary.read=async input=>{fixture.photoReads++;return readPhoto(input);};
  const read=BrowserFiles.prototype.storageReadAttachment;
  BrowserFiles.prototype.storageReadAttachment=async function(input){fixture.reads++;return read.call(this,input);};
  await connectionController.startDevelopment('local');
  LocalAgentProtocol.prototype.listConversations=async()=>fixture.sends.length?[{id:fixture.room,title:'Attachment history'}]:[];
  LocalAgentProtocol.prototype.createConversation=async()=>({id:fixture.room,title:'Attachment history'});
  LocalAgentProtocol.prototype.send=async(id,text,options)=>{
   if(id!==fixture.room||!options?.clientMessageId)throw Error('Attachment lost its recorded message identity');
   fixture.sends.push({text,images:options.images});
   const userMessageId=crypto.randomUUID(),messageId=crypto.randomUUID();
   fixture.rows=[{id:userMessageId,clientMessageId:options.clientMessageId,role:'user',text:'Please review the attached file.'},
    {id:messageId,role:'assistant',text:'Attachment received'}];
   return {userMessageId,messageId,text:'Attachment received',agentName:'Alpha'};
  };
  LocalAgentProtocol.prototype.messages=async()=>({messages:structuredClone(fixture.rows)}) as never;
  (window as any).attachmentFixture=fixture;
 });
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await page.getByRole('button',{name:'Chat actions',exact:true}).click();
 await page.getByRole('dialog',{name:'Chat actions',exact:true}).getByRole('button',{name:'Attach media',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Attach files',exact:true});
 await expect(picker).toBeVisible();
 await picker.getByRole('button',{name:'Files',exact:true}).click();
 await picker.getByRole('button',{name:'Reviewed notes.txt',exact:true}).click();
 await expect(picker.getByRole('status')).toHaveText('1 selected');
 return {picker,outbound};
}

test('reviewed Files and Photos send exact bytes only on explicit attachment-only Send',async({page})=>{
 const {picker,outbound}=await setup(page);
 const effects=()=>page.evaluate(()=>{const {reads,photoReads,sends}=(window as any).attachmentFixture;return {reads,photoReads,sends};});
 await picker.getByRole('button',{name:'Photos',exact:true}).click();
 await picker.getByRole('button',{name:'Photo.jpg',exact:true}).click();
 await expect(picker.getByRole('status')).toHaveText('2 selected');
 expect(await effects()).toEqual({reads:0,photoReads:0,sends:[]});
 await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
 await expect(picker).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove Reviewed notes.txt',exact:true})).toBeVisible();
 expect(await effects()).toEqual({reads:1,photoReads:1,sends:[]});
 await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 const photo=await page.evaluate(()=>(window as any).attachmentFixture.photo as string);
 await expect.poll(effects).toEqual({reads:1,photoReads:1,sends:[{text:'',images:[
  {name:'Reviewed notes.txt',mimeType:'text/plain',data:Buffer.from('first bytes').toString('base64')},
  {name:'Photo.jpg',mimeType:'image/jpeg',data:photo.split(',')[1]},
 ]}]});
 await expect(page.getByText('Attachment received',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Remove Reviewed notes.txt',exact:true})).toHaveCount(0);
 await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  await connectionController.restoreHistory((window as any).attachmentFixture.room);
 });
 await expect(page.getByText('Reviewed notes.txt',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Preview sent Photo.jpg',exact:true}).getByRole('img')).toHaveAttribute('src',photo);
 expect(outbound).toEqual([]);
});

test('a same-name replacement cannot borrow the reviewed file identity',async({page})=>{
 const {picker,outbound}=await setup(page);
 await page.evaluate(async()=>{
  const {files,name,save}=(window as any).attachmentFixture;
  const prior=(await files.list({id:'root'})).entries.find((row:{name:string})=>row.name===name);
  await files.delete({id:prior.id,expectedRevision:prior.revision,confirmPermanent:true});
  await save('other bytes');
 });
 await picker.getByRole('button',{name:'Attach selected files',exact:true}).click();
 await expect(picker.getByRole('alert')).toHaveText('This file changed. Select it again.');
 await picker.getByRole('button',{name:'Close attachments',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove Reviewed notes.txt',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>{const {reads,sends}=(window as any).attachmentFixture;return {reads,sends};})).toEqual({reads:1,sends:[]});
 expect(outbound).toEqual([]);
});

test('Search chat opens the selected historical message without sending or reading attachments',async({page})=>{
 const {picker,outbound}=await setup(page);
 await picker.getByRole('button',{name:'Close attachments',exact:true}).click();
 const target=await page.evaluate(async()=>{
  const {LocalAgentProtocol}=await import('/src/runtime/local-agent.ts');
  const f=(window as any).attachmentFixture,messageId=crypto.randomUUID();
  f.searches=[];f.around=[];
  LocalAgentProtocol.prototype.listConversations=async()=>[{id:f.room,title:'History search fixture'}];
  LocalAgentProtocol.prototype.searchMessages=async(query,_signal,offset)=>{
   f.searches.push({query,offset});
   return [{messageId,conversationId:f.room,roomId:f.room,role:'assistant' as const,text:'A historical needle message',snippet:'A historical needle message',createdAt:1,score:1}];
  };
  LocalAgentProtocol.prototype.messagesAround=async(id,message)=>{
   if(id!==f.room||message!==messageId)throw Error('Wrong historical message');
   f.around.push({id,message});
   return {messages:[{id:messageId,role:'assistant',text:'A historical needle message',createdAt:1}]};
  };
  return {messageId,room:f.room};
 });
 await page.getByRole('button',{name:'Chat actions',exact:true}).click();
 await page.getByRole('button',{name:'Search chat',exact:true}).click();
 const search=page.getByRole('dialog',{name:'Search chats',exact:true});
 await search.getByRole('textbox',{name:'Search messages',exact:true}).fill('needle');
 await search.getByRole('button',{name:/A historical needle message/}).click();
 await expect(search).toHaveCount(0);
 await expect(page.locator(`[data-alpha-layer="conversation"] [data-alpha-message-id="${target.messageId}"]`)).toContainText('A historical needle message');
 const result=await page.evaluate(()=>{const f=(window as any).attachmentFixture;return {reads:f.reads,sends:f.sends,searches:f.searches,around:f.around};});
 expect(result).toEqual({reads:0,sends:[],searches:[{query:'needle',offset:0}],around:[{id:target.room,message:target.messageId}]});
 expect(outbound).toEqual([]);
});
