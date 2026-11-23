import {test,expect,type Page} from '@playwright/test';
import {setup,utterance,voice} from './owned-voice-navigation-fixture';
// Review (nav-lease): with ask-before-actions off, a spoken "open the phone dialer" runs the keypad
// (or a filtered Contacts list, or a draft in another Messages conversation) inside the voice turn's
// own request. That view step ran on a timer once the request settled and changed the view with a
// plain openView: the voice conversation read it as the owner leaving (chatCurrent), tore itself
// down and the reply was neither kept nor spoken. A voice turn now runs its held view steps itself,
// after the reply, through the session's navigation hold, as a spoken VIEWS move does.
// The step is registered here the way the installed telephony executor registers it (agent-adapter
// viewStep), from inside the request. Its view change is the one phone-adapter's keypad step and
// contacts-adapter's list step make; those adapters install only on Android, so this browser page
// makes the same openView call. The agent, media and Cloud ports are the fixture's closed
// boundaries. No model, SIM or radio is involved.
async function directStep(page:Page,view:'phone'|'contacts'){
 await page.evaluate(async view=>{
  const f=(window as any).ownedVoiceNavigation,{alphaClient}=await import('/src/runtime/alpha-client.ts');
  f.answer=view==='phone'?'Opening the keypad.':'Here are your contacts named Ada.';f.prompt=view==='phone'?'Open the phone dialer.':'Show my contacts named Ada.';
  const transport=(alphaClient as any).transport,send=transport.send;
  transport.send=async(input:any)=>{
   const reply=await send(input);
   // As performRequested does: the step is handed over while the request still carries the reply.
   const expected=alphaClient.getState().context,shell=f.shell;
   const step=(detent?:string)=>{const chat=shell.S().chat;shell.openView(view,view==='phone'?{tab:'keypad'}:undefined,detent??(chat==='sheet'||chat==='full'?chat:undefined));};
   f.stepRegistered=true;
   alphaClient.afterRequestSettles({view,current:()=>{if(!alphaClient.followsTurnContext(expected))throw Error('Phone context changed');},show:step});
   return reply;
  };
 },view);
}
const observed=(page:Page)=>page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {chat:f.shell.S().chat,toast:f.shell.S().toast,spoken:f.spoken??[],last:f.shell.S().msgs.filter((m:any)=>m.from==='agent').at(-1)?.text,error:f.error?.message??null};});
for(const [view,answer] of [['phone','Opening the keypad.'],['contacts','Here are your contacts named Ada.']] as const)
 test(`a spoken request that opens ${view} directly keeps the conversation and speaks the reply`,async({page})=>{
  await setup(page,'sheet',true);
  await directStep(page,view);
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view',view);
  // The conversation followed to the new view: the reply was kept and is being spoken.
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  expect(await observed(page)).toMatchObject({chat:'sheet',toast:'',spoken:[answer],last:answer,error:null});
  expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.stepRegistered)).toBe(true);
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
  await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
  await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-active-view',view);
 });
