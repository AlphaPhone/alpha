import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({entryPoints:['apps/app/src/runtime/automations-protocol.ts'],bundle:true,write:false,format:'esm',platform:'neutral',logLevel:'silent'});
const {automationWhen,AutomationsProtocol}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const at='2026-10-29T18:00:00Z';

test('automationWhen renders a short month, no seconds, in the named zone, and ignores a zone it cannot use',()=>{
 assert.equal(automationWhen(at,'UTC','en-US'),'Oct 29, 2026, 6:00 PM');
 assert.equal(automationWhen(at,'America/New_York','en-US'),'Oct 29, 2026, 2:00 PM');
 assert.equal(automationWhen(at,'Asia/Tokyo','en-US'),'Oct 30, 2026, 3:00 AM');
 assert.equal(automationWhen(Date.parse(at),'UTC','en-US'),'Oct 29, 2026, 6:00 PM');
 assert.equal(automationWhen(at,'Not/AZone','en-US'),automationWhen(at,undefined,'en-US'));
 assert.match(automationWhen(at,'Not/AZone','en-US'),/^[A-Z][a-z]{2} \d{1,2}, 2026, \d{1,2}:\d{2} [AP]M$/);
 assert.equal(automationWhen('not a date'),'');
 assert.equal(automationWhen(Number.NaN),'');
});

test('once prompts and agent reminders share the human instant format in their own zone',async()=>{
 const once={id:'trigger:once',type:'coordinator_text',title:'Call mom',description:'',enabled:true,status:'active',triggerId:'once',schedules:[{triggerType:'once',scheduledAtIso:at,timezone:'Asia/Tokyo'}]};
 const reminder={definition:{id:'draft',title:'Check the draft',status:'active',timezone:'America/New_York',cadence:{kind:'once',dueAt:'2030-01-01T12:00:00Z'}},occurrence:{id:'occurrence',state:'pending',dueAt:'2030-01-01T12:00:00Z'},latestAttempt:null};
 const client=new AutomationsProtocol(async path=>path==='/api/automations'?{automations:[once]}:path==='/api/lifeops/reminders'?{reminders:[reminder]}:{tasks:[]});
 const rows=(await client.list(new AbortController().signal)).rows;
 assert.equal(rows.find(row=>row.kind==='prompt').schedule,automationWhen(at,'Asia/Tokyo'));
 assert.equal(rows.find(row=>row.kind==='reminder').schedule,automationWhen('2030-01-01T12:00:00Z','America/New_York'));
 for(const row of rows)assert.doesNotMatch(row.schedule,/:\d{2}:\d{2}/,row.kind);
});
