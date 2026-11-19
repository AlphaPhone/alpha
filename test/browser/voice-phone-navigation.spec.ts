import {test,expect,type Page} from '@playwright/test';
import {setup,utterance,voice} from './owned-voice-navigation-fixture';
// Phone, Messages and Contacts rest the chat on their bar and have no pill (docs/agentic-comms.md D2).
// A voice conversation that the agent moves there keeps going: one held by the sheet keeps its sheet,
// and one held by the Home pill continues in the sheet, since the bar cannot hold a conversation.
const observed=(page:Page)=>page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {chat:f.shell.S().chat,toast:f.shell.S().toast,inputs:f.inputs.length,acks:f.acks,ack:f.requests.filter((request:any)=>request.path.endsWith('interact-result')).at(-1)?.body,speech:c.syntheses,pill:!!document.querySelector('[data-alpha-pill-voice]'),error:f.error??null};});
// Talk from the Home pill once a refused Cloud request has held this account on on-device speech:
// the conversation stays in the pill (voice-owned-navigation.spec.ts restartVoice opens its sheet).
async function pillVoice(page:Page){
 await setup(page,'sheet',true);await page.evaluate(()=>(window as any).cloudNotesVoice.billing=true);await utterance(page);
 await expect(voice(page)).toHaveAttribute('data-voice-state','error');
 await page.evaluate(()=>(window as any).cloudNotesVoice.billing=false);
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.setState({chat:'hidden'}));
 expect(await page.evaluate(async()=>(await import('/src/runtime/voice-selection.ts')).speechRoute())).toBe('device');
 await page.getByRole('button',{name:'Talk',exact:true}).click({timeout:5000});
 await expect(page.locator('[data-alpha-pill-voice]')).toHaveCount(1);
 await expect.poll(()=>page.evaluate(()=>(window as any).cloudNotesVoice.active!==null)).toBe(true);
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.S().chat)).toBe('hidden');
}
for(const target of ['phone','messages','contacts'])test(`spoken ${target} navigation keeps the voice sheet through speech and rearm`,async({page})=>{
 await setup(page,'sheet',true);
 await utterance(page,target);
 await expect(page.locator('html')).toHaveAttribute('data-active-view',target);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await observed(page)).toMatchObject({chat:'sheet',toast:'',inputs:1,acks:1,ack:{success:true,result:{switched:true}},speech:1,error:null});
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);
});
test('spoken Phone navigation from the Home pill continues the conversation in the sheet',async({page})=>{
 await pillVoice(page);
 const before=await observed(page);
 await utterance(page,'phone');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','phone');
 // The conversation was not torn down: the switch is acknowledged, the reply is spoken and voice listens again.
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await observed(page)).toMatchObject({chat:'sheet',toast:'',inputs:before.inputs+1,acks:before.acks+1,ack:{success:true,result:{switched:true}},speech:before.speech+1,pill:false,error:null});
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await expect.poll(()=>page.evaluate(()=>(window as any).cloudNotesVoice.active!==null)).toBe(true);
 // Stopping leaves Phone with its bar, not a pill it does not have.
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','phone');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.S().chat)).not.toBe('hidden');
});
test('spoken Notes navigation from the Home pill keeps the conversation in the pill',async({page})=>{
 await pillVoice(page);
 const before=await observed(page);
 await utterance(page,'notes');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 await expect.poll(async()=>(await observed(page)).speech).toBe(before.speech+1);
 expect(await observed(page)).toMatchObject({chat:'hidden',toast:'',acks:before.acks+1,ack:{success:true,result:{switched:true}},pill:true,error:null});
 await page.locator('[data-alpha-pill-voice]').getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 await expect(page.locator('[data-alpha-pill-voice]')).toHaveCount(0);
});
