import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {test,expect,type Page} from '@playwright/test';
import {returnToApps} from './app-navigation';

test.use({timezoneId:'UTC'});
const LABEL='Journey alarm';
const actions=(page:Page)=>page.evaluate(async()=>(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))) as any);
const alarms=(page:Page)=>page.evaluate(async()=>{const raw=await (await import('/src/browser/reminder-store.ts')).reminderDocument.readRaw();return raw?JSON.parse(raw).reminders.filter((r:any)=>r.id.startsWith('alarm_')).map((r:any)=>({title:r.title,at:r.at,status:r.status})):[];});
const clock=(page:Page)=>page.getByRole('dialog',{name:'Clock alarms',exact:true});
async function openClock(page:Page){await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.getByRole('button',{name:'Clock alarms',exact:true}).click();await expect(clock(page)).toBeVisible();return clock(page);}
async function queue(page:Page,operation:object){
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 const dialog=page.getByRole('dialog',{name:'Development connections'});
 await dialog.getByText('Development device actions',{exact:true}).click();
 await dialog.getByRole('textbox',{name:'Action JSON'}).fill(JSON.stringify(operation));
 await dialog.getByRole('button',{name:'Queue action for review'}).click();
 await expect(dialog.getByText('Action queued. Send a chat message to review it on the current screen.',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close connection settings'}).click();
 await returnToApps(page);
}
const approve=(page:Page)=>page.getByRole('button',{name:/^clock handoff /});

test('journey C: agent-proposed alarm is reviewed, saved once, survives reload, rings, snoozes, rings again and is dismissed',async({page})=>{
 test.setTimeout(240_000);
 await page.clock.setFixedTime(new Date('2027-06-01T06:00:00Z'));
 await page.goto('/?mode=dev');
 const ask=page.getByRole('textbox',{name:'Ask Alpha',exact:true}),conversation=page.locator('[data-alpha-layer="conversation"]');

 let dialog=await openClock(page);
 await expect(dialog.getByText('No alarms',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Back',exact:true}).click();await expect(dialog).toHaveCount(0);
 await returnToApps(page);

 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await expect(page.getByRole('dialog',{name:'Development connections'})).toHaveCount(0);
 await returnToApps(page);
 await queue(page,{type:'clock_handoff',action:'set',hour:7,minute:15,label:LABEL,timeZone:'UTC'});
 await ask.fill('Set an alarm for 07:15');await ask.press('Enter');

 await expect(conversation.getByText('Ask Clock to set 07:15 in UTC named “Journey alarm”. Review the alarm in Clock; Alpha cannot confirm creation or ringing.',{exact:true}).first()).toBeVisible();
 await expect(approve(page)).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Decline Keep things as they are.',exact:true})).toHaveCount(1);
 expect(await alarms(page)).toEqual([]);
 let state=await actions(page);
 expect(state.proposals.map((p:any)=>p.state)).toEqual(['pending']);expect(state.journal).toEqual([]);

 await approve(page).click();
 await expect(conversation.getByText('Alarm saved.',{exact:true})).toHaveCount(1);
 await expect(approve(page)).toHaveCount(0);
 state=await actions(page);
 expect(state.proposals).toHaveLength(1);
 expect(state.proposals[0].state).toBe('completed');
 expect(state.proposals[0].receipt.outcome).toBe('applied');
 expect(state.proposals[0].receipt.result).toEqual({kind:'clock-handoff',action:'set',status:'opened'});
 expect(state.journal).toHaveLength(1);
 expect(state.journal[0]).toMatchObject({phase:'terminal',status:'succeeded',summary:'Alarm saved.',result:{clockResult:{kind:'clock-handoff',action:'set',status:'opened'}}});
 const at=Date.parse('2027-06-01T07:15:00Z');
 expect(await alarms(page)).toEqual([{title:LABEL,at,status:'scheduled'}]);
 await expect(conversation).not.toContainText(/will ring|has rung|alarm (is|was) confirmed|confirmed (the|your) alarm/i);

 await returnToApps(page);
 await queue(page,{type:'clock_handoff',action:'show'});
 await ask.fill('Show my alarms');await ask.press('Enter');
 await expect(approve(page)).toHaveCount(1);
 await expect(clock(page)).toHaveCount(0);
 await approve(page).click();
 dialog=clock(page);await expect(dialog).toBeVisible();
 await expect(dialog.getByText(LABEL,{exact:true})).toHaveCount(1);
 await expect(dialog.getByRole('button',{name:'Delete '+LABEL,exact:true})).toHaveCount(1);
 await expect(dialog.getByText('Ringing',{exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Back',exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect.poll(async()=>(await actions(page)).proposals.map((p:any)=>[p.payload.operation.action,p.state,p.receipt?.result?.status])).toEqual([['set','completed','opened'],['show','completed','opened']]);
 expect(await alarms(page)).toEqual([{title:LABEL,at,status:'scheduled'}]);

 await page.reload();
 dialog=await openClock(page);
 await expect(dialog.getByText(LABEL,{exact:true})).toHaveCount(1);
 await expect(dialog.getByText('Ringing',{exact:true})).toHaveCount(0);
 expect(await alarms(page)).toEqual([{title:LABEL,at,status:'scheduled'}]);
 await dialog.getByRole('button',{name:'Back',exact:true}).click();await expect(dialog).toHaveCount(0);

 await page.clock.setFixedTime(new Date('2027-06-01T07:15:02Z'));
 dialog=clock(page);
 await expect(dialog.getByText('Ringing',{exact:true})).toBeVisible();
 await expect(dialog.getByText(LABEL,{exact:true})).toHaveCount(1);
 await dialog.getByLabel('Snooze minutes',{exact:true}).fill('2');
 await dialog.getByRole('button',{name:'Snooze '+LABEL,exact:true}).click();
 await expect(dialog.getByText('Ringing',{exact:true})).toHaveCount(0);
 await expect(dialog.getByText(LABEL,{exact:true})).toHaveCount(1);
 expect(await alarms(page)).toEqual([{title:LABEL,at:Date.parse('2027-06-01T07:17:02Z'),status:'scheduled'}]);
 await page.clock.setFixedTime(new Date('2027-06-01T07:17:03Z'));
 await expect(dialog.getByText('Ringing',{exact:true})).toBeVisible();
 await expect(dialog.getByText(LABEL,{exact:true})).toHaveCount(1);
 await dialog.getByRole('button',{name:'Dismiss '+LABEL,exact:true}).click();
 await expect(dialog.getByText('No alarms',{exact:true})).toBeVisible();

 await page.reload();
 await expect(page.getByRole('region',{name:'Home'})).toBeVisible();
 const after=await alarms(page);
 expect(after).toHaveLength(1);expect(after[0].title).toBe(LABEL);expect(['scheduled','posted']).not.toContain(after[0].status);
 dialog=await openClock(page);
 await expect(dialog.getByText('No alarms',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Ringing',{exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Back',exact:true}).click();
 await returnToApps(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 const connection=page.getByRole('dialog',{name:'Development connections'});
 await connection.getByText('Development device actions',{exact:true}).click();
 await connection.getByRole('button',{name:'Check with agent'}).click();
 await expect(connection.getByText('completed',{exact:true})).toHaveCount(2);
 state=await actions(page);
 expect(state.proposals.map((p:any)=>[p.payload.operation.action,p.state,p.receipt.result.status])).toEqual([['set','completed','opened'],['show','completed','opened']]);
 expect(state.journal.map((j:any)=>[j.status,j.result.clockResult.status])).toEqual([['succeeded','opened'],['succeeded','opened']]);
});

test('journey C: a declined alarm proposal hands nothing to Clock, before or after a reload',async({page})=>{
 test.setTimeout(120_000);
 await page.clock.setFixedTime(new Date('2027-06-01T06:00:00Z'));
 await page.goto('/?mode=dev');
 const ask=page.getByRole('textbox',{name:'Ask Alpha',exact:true}),conversation=page.locator('[data-alpha-layer="conversation"]');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await expect(page.getByRole('dialog',{name:'Development connections'})).toHaveCount(0);
 await returnToApps(page);
 await queue(page,{type:'clock_handoff',action:'set',hour:7,minute:15,label:LABEL,timeZone:'UTC'});
 await ask.fill('Set an alarm for 07:15');await ask.press('Enter');
 await expect(conversation.getByText('Ask Clock to set 07:15 in UTC named “Journey alarm”. Review the alarm in Clock; Alpha cannot confirm creation or ringing.',{exact:true}).first()).toBeVisible();
 const decline=page.getByRole('button',{name:'Decline Keep things as they are.',exact:true});
 await expect(approve(page)).toHaveCount(1);
 await decline.dblclick();
 await expect(conversation.getByText('Declined. No phone action was performed.',{exact:true})).toHaveCount(1);
 await expect(approve(page)).toHaveCount(0);
 await expect(decline).toHaveCount(0);
 expect(await alarms(page)).toEqual([]);
 let state=await actions(page);
 expect(state.proposals.map((p:any)=>[p.payload.operation.action,p.state,p.receipt??null])).toEqual([['set','rejected',null]]);
 expect(state.journal).toEqual([]);
 await expect(conversation).not.toContainText(/Alarm saved|Clock request sent|will ring/);
 await returnToApps(page);
 let dialog=await openClock(page);
 await expect(dialog.getByText('No alarms',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Back',exact:true}).click();

 await page.clock.setFixedTime(new Date('2027-06-01T07:15:02Z'));
 await page.reload();
 await expect(page.getByRole('region',{name:'Home'})).toBeVisible();
 await expect(clock(page)).toHaveCount(0);
 expect(await alarms(page)).toEqual([]);
 const replies=page.getByRole('button',{name:/^Message actions: Development reply/,includeHidden:true});
 await expect(page.getByRole('button',{name:'Message actions: Set an alarm for 07:15',exact:true,includeHidden:true})).toHaveCount(1);
 await expect(replies).toHaveCount(1);
 await ask.fill('Anything pending?');await ask.press('Enter');
 await expect(page.getByRole('button',{name:'Message actions: Anything pending?',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:/^Message actions: Development reply/})).toHaveCount(2);
 await expect(approve(page)).toHaveCount(0);
 state=await actions(page);
 expect(state.proposals.map((p:any)=>p.state)).toEqual(['rejected']);
 expect(state.journal).toEqual([]);
});
