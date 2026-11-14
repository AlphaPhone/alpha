import {expect,test} from '@playwright/test';
import {choosePhotoAction,openOwnedPhotoViewer} from './helpers/owned-photo';

test('the first sent photo stays with its recorded message when history is reopened',async({page})=>{
 const outbound:string[]=[];
 await page.route('https://**/*',route=>{outbound.push(route.request().url());return route.abort();});
 await openOwnedPhotoViewer(page,'light','dev');
 const starting=await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  await connectionController.initialize();
  await connectionController.startDevelopment('local');
  const {LocalAgentProtocol}=await import('/src/runtime/local-agent.ts');
  const room=crypto.randomUUID();
  const fixture={rows:[] as Record<string,unknown>[],requestId:'',recordedId:'',image:'',sendCalls:0};
  LocalAgentProtocol.prototype.listConversations=async()=>fixture.sendCalls?[{id:room,title:'First photo'}]:[];
  LocalAgentProtocol.prototype.createConversation=async()=>({id:room,title:'First photo'});
  LocalAgentProtocol.prototype.send=async(id,text,options)=>{
   if(id!==room||!options?.clientMessageId)throw Error('Missing first conversation or client message identity');
   fixture.sendCalls++;
   fixture.requestId=options.clientMessageId;
   fixture.recordedId=crypto.randomUUID();
   fixture.image=options.images?.[0]?.data??'';
   const replyId=crypto.randomUUID();
   fixture.rows=[{id:fixture.recordedId,clientMessageId:fixture.requestId,role:'user',text,userTextFormat:options.metadata?.userTextFormat},
    {id:replyId,role:'assistant',text:'Photo received'}];
   return {text:'Photo received',agentName:'Alpha',userMessageId:fixture.recordedId,messageId:replyId};
  };
  LocalAgentProtocol.prototype.messages=async()=>({messages:structuredClone(fixture.rows)});
  (window as any).photoHistory={room,fixture};
  return {hasSession:!!connectionController.getSnapshot().session,history:connectionController.getSnapshot().history??null,selected:connectionController.getSelectedConversationId()??null};
 });
 expect(starting).toEqual({hasSession:true,history:null,selected:null});
 await choosePhotoAction(page,'Ask Alpha');
 const draft=page.getByRole('button',{name:'Preview attached photo',exact:true}).getByRole('img');
 const pixels=await draft.getAttribute('src');
 expect(pixels).toMatch(/^data:image\/jpeg;base64,/);
 const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true});
 await composer.fill('What is in this photo?');
 await composer.press('Enter');
 await expect(page.getByText('Photo received',{exact:true})).toBeVisible();
 const sent=page.getByRole('button',{name:'Preview sent photo',exact:true}).getByRole('img');
 await expect(sent).toHaveAttribute('src',pixels!);
 const receipt=await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  const {room,fixture}=(window as any).photoHistory;
  await connectionController.restoreHistory(room);
  return {sendCalls:fixture.sendCalls,image:fixture.image,idsDiffer:fixture.requestId!==fixture.recordedId};
 });
 expect(receipt).toEqual({sendCalls:1,image:pixels!.split(',')[1],idsDiffer:true});
 await expect(page.getByText('What is in this photo?',{exact:true})).toBeVisible();
 await expect(sent).toHaveAttribute('src',pixels!);

 // Legacy history without a client ID still reads the recorded ID. An explicit
 // mismatched client ID cannot resolve the photo through an alternate key.
 await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  const {room,fixture}=(window as any).photoHistory;
  fixture.rows[0].clientMessageId=crypto.randomUUID();
  await connectionController.restoreHistory(room);
 });
 await expect(sent).toHaveCount(0);
 await page.evaluate(async()=>{
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  const {room,fixture}=(window as any).photoHistory;
  delete fixture.rows[0].clientMessageId;
  await connectionController.restoreHistory(room);
 });
 await expect(sent).toHaveAttribute('src',pixels!);
 expect(outbound).toEqual([]);
});
