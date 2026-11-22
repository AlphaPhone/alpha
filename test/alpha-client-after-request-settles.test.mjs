// v619: "open the phone dialer" from Settings opened the keypad and the chat said "Stopped." then
// "May still finish" though nobody pressed Stop. The directly requested keypad runs inside the chat
// request that still carries its reply, and bringing Phone in front changed the view context, which
// cancels that request. AlphaClient.afterRequestSettles holds a view-changing step until no request
// is in flight; the owner's Stop still ends the reply first.
// Synthetic in-memory transport held open by the test; no model is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {AlphaClient,AlphaClientError}=await tsImport('../apps/app/src/runtime/alpha-client.ts',import.meta.url);
const view=(name,extra={})=>({view:name,timeZone:'UTC',...extra});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

function held(){
 const finishers=[];let ready;
 const started=()=>new Promise(resolve=>{ready=resolve;});
 let next=started();
 const value={
  session:{ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session',origin:'https://agent.example.invalid'},
  send({signal}){const done=ready;next=started();done();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});finishers.push(text=>resolve({text,proposals:[]}));});},
  async execute(){throw Error('No action may execute');},
 };
 return {value,started:()=>next,finish:text=>finishers.shift()(text)};
}
async function turn(context){
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(context);
 const started=agent.started(),reply=client.send('open the phone dialer');await started;
 return {client,agent,reply};
}
const cancelled=error=>error instanceof AlphaClientError&&error.code==='cancelled';
const showPhone=(client,shown)=>()=>{shown.push('phone');client.setViewContext(view('phone'));};

test('a view-changing step waits for the reply in flight, and the reply completes',async()=>{
 const {client,agent,reply}=await turn(view('settings'));
 const shown=[];
 client.afterRequestSettles(showPhone(client,shown));
 assert.deepEqual(shown,[]);
 assert.equal(client.getState().pending,true);
 agent.finish('Opening the keypad.');
 assert.equal((await reply).text,'Opening the keypad.');
 await tick();
 assert.deepEqual(shown,['phone']);
 assert.equal(client.getState().context.view,'phone');
});

test('without waiting, showing Phone during the reply cancels it (the v619 stop)',async()=>{
 const {client,reply}=await turn(view('settings'));
 client.setViewContext(view('phone'));
 await assert.rejects(reply,cancelled);
});

test('with no request in flight the step runs at once and its error reaches the caller',()=>{
 const client=new AlphaClient(),shown=[];
 client.afterRequestSettles(()=>shown.push('now'));
 assert.deepEqual(shown,['now']);
 assert.throws(()=>client.afterRequestSettles(()=>{throw Error('retired');}),/retired/);
});

test('the owner\'s Stop still ends the reply while a step waits',async()=>{
 const {client,reply}=await turn(view('settings'));
 let ran=0;
 client.afterRequestSettles(()=>{ran++;throw Error('The review is no longer current');});
 client.cancel();
 await assert.rejects(reply,cancelled);
 // The waiting step then runs once; a step that is no longer current retires quietly.
 await tick();
 assert.equal(ran,1);
});

test('a request that starts before the step runs is waited for too, and is never cancelled by it',async()=>{
 const {client,agent,reply}=await turn(view('settings'));
 const shown=[];
 client.afterRequestSettles(showPhone(client,shown));
 agent.finish('Opening the keypad.');
 await reply;
 // A new request starts in the same task, before the step's deferred run.
 const started=agent.started(),second=client.send('and what time is it');await started;
 await tick();
 assert.deepEqual(shown,[]);
 assert.equal(client.getState().pending,true);
 agent.finish('It is noon.');
 assert.equal((await second).text,'It is noon.');
 await tick();
 assert.deepEqual(shown,['phone']);
});

test('an automatic workflow generation does not hold the step, and the view change leaves it running',async()=>{
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(view('workflows'));
 const started=agent.started(),generation=client.generateWorkflowText('Summarise','input text',new AbortController().signal,true);await started;
 const shown=[];
 client.afterRequestSettles(showPhone(client,shown));
 assert.deepEqual(shown,['phone']);
 agent.finish('A summary.');
 assert.equal(await generation,'A summary.');
});
