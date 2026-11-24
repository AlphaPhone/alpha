import {test,expect,type Page} from '@playwright/test';
import {startHostedServer,hostedFixture,hostedResult,hostedDevice as device,hostedPanel as panel,type HostedServer} from './hosted-harness';

test.describe.configure({mode:'serial'});
let server:HostedServer;
test.beforeAll(async()=>{server=await startHostedServer();});
test.afterAll(async()=>{await server?.close();});

const outputs:Record<string,string>={'run-one':'Retained morning briefing','run-evening':'Retained evening briefing'};
const ledger=(page:Page)=>page.evaluate(async()=>{const {hostedResultsDocument}=await import('/src/browser/hosted-results.ts');const raw=await hostedResultsDocument.readRaw(),state=JSON.parse(raw||'{"rows":[]}');return {raw:raw||'',pending:state.pending?.id as string|undefined,rows:(state.rows as any[]).map(row=>({runId:row.runId as string,phase:row.phase as string,at:row.at as number}))};});
const notices=(page:Page)=>page.getByText('Scheduled digest',{exact:true});
const phases=async(page:Page)=>Object.fromEntries((await ledger(page)).rows.map(row=>[row.runId,row.phase]));
async function tapAfterRestart(page:Page,index:number,expectedRemaining:number){
 await page.reload();
 await expect(panel(page)).toHaveCount(0);
 const before=await phases(page);
 const expected=(await ledger(page)).rows.filter(row=>row.phase==='posted').sort((a,b)=>b.at-a.at)[index].runId;
 await device(page,'Notifications');
 await expect(notices(page)).toHaveCount(expectedRemaining+1);
 await notices(page).nth(index).click();
 await expect(panel(page)).toContainText('Opened from notification');
 await expect.poll(async()=>Object.values(await phases(page)).filter(phase=>phase==='opened').length).toBe(Object.values(before).filter(phase=>phase==='opened').length+1);
 const after=await phases(page),opened=Object.keys(after).filter(run=>after[run]==='opened'&&before[run]!=='opened');
 expect(opened).toEqual([expected]);
 return opened[0];
}

test('Journey F (hosted): result notices tapped after a restart each reach exactly their own result, once',async({page})=>{
 test.setTimeout(240_000);
 const {f,cleanup}=await hostedFixture(page,server.origin,{more:[hostedResult(2,'run-evening',outputs['run-evening'])]});
 try{
  expect(f.acked).toBe(2);
  await expect.poll(()=>phases(page)).toEqual({'run-one':'posted','run-evening':'posted'});
  const saved=await ledger(page);
  expect(saved.pending).toBeUndefined();
  for(const text of Object.values(outputs))expect(saved.raw).not.toContain(text);

  const first=await tapAfterRestart(page,0,1);
  const marked=panel(page).locator('article').filter({hasText:'Opened from notification'});
  await expect(marked).toHaveCount(1);
  await expect(marked).toHaveAttribute('id','hosted-result-'+first);
  await expect(marked).toContainText(outputs[first]);
  const other=Object.keys(outputs).find(run=>run!==first)!;
  await expect(marked).not.toContainText(outputs[other]);
  await expect(panel(page).locator('#hosted-result-'+other)).toContainText(outputs[other]);
  expect(await phases(page)).toEqual({[first]:'opened',[other]:'posted'});
  expect((await ledger(page)).pending).toBeUndefined();
  await panel(page).getByRole('button',{name:'Close scheduled digests',exact:true}).click();

  const second=await tapAfterRestart(page,0,0);
  expect(second).toBe(other);
  await expect(marked).toHaveCount(1);
  await expect(marked).toHaveAttribute('id','hosted-result-'+other);
  await expect(marked).toContainText(outputs[other]);
  await expect(marked).not.toContainText(outputs[first]);
  expect(await phases(page)).toEqual({[first]:'opened',[other]:'opened'});
  await panel(page).getByRole('button',{name:'Close scheduled digests',exact:true}).click();

  await page.reload();
  await expect(panel(page)).toHaveCount(0);
  await device(page,'Notifications');
  await expect(notices(page)).toHaveCount(0);
  expect(await phases(page)).toEqual({[first]:'opened',[other]:'opened'});
  expect(f.acked).toBe(2);
  await page.reload();
  await expect(panel(page)).toHaveCount(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('alpha:hosted-digests')));
  for(const text of Object.values(outputs))await expect(panel(page)).toContainText(text);
  await expect(panel(page)).not.toContainText('Opened from notification');
 }finally{await cleanup();}
});
