// v610: the agent's own Browser back or reload during its reply moved the page, and the new
// document's context revision cancelled that reply ("The agent stopped this reply."). The real
// AlphaClient admits only that page's own move; every other change still cancels, as Stop does.
// Synthetic in-memory transport held open by the test; no model is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {AlphaClient,AlphaClientError}=await tsImport('../apps/app/src/runtime/alpha-client.ts',import.meta.url);
const tab=(revision,id='session:tab-1')=>({view:'browser',timeZone:'UTC',selectedObject:{kind:'browser-tab',id,revision}});

function held(){
 let finish,ready;
 const started=new Promise(resolve=>{ready=resolve;});
 const value={
  session:{ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session',origin:'https://agent.example.invalid'},
  send({signal,onReplyReady}){ready();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});finish=text=>{onReplyReady?.([]);resolve({text,proposals:[]});};});},
  async execute(){throw Error('No action may execute');},
 };
 return {value,started,finish:text=>finish(text)};
}
async function turn(context){
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(context);
 const ready=[];const reply=client.send('Go back',undefined,undefined,results=>ready.push(results));await agent.started;
 return {client,agent,reply,ready};
}
const cancelled=error=>error instanceof AlphaClientError&&error.code==='cancelled';

test('the reply\'s own page command moves the tab and the reply still completes for the new document',async()=>{
 const {client,agent,reply,ready}=await turn(tab('1'));
 client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 const before=client.getState().context.revision;
 // Loading (no selection while between documents), then the committed earlier page.
 client.setViewContext({view:'browser',timeZone:'UTC'});
 client.setViewContext(tab('2'));
 client.setViewContext(tab('3'));
 assert.equal(client.getState().pending,true);
 assert.equal(client.getState().context.revision,before+3);
 agent.finish('Went back.');
 assert.equal((await reply).text,'Went back.');
 assert.equal(ready.length,1,'the reply-ready results for the moved page are delivered');
 assert.equal(client.getState().pending,false);
 // The admission ends with its request: the next request's page change cancels it again.
 const next=held();client.attachVerifiedTransport(next.value);client.setViewContext(tab('3'));
 const later=client.send('Something else');await next.started;
 client.setViewContext(tab('4'));
 await assert.rejects(later,cancelled);
});

test('without the reply\'s own command, a page change still cancels the reply',async()=>{
 const {client,reply}=await turn(tab('1'));
 client.setViewContext(tab('2'));
 await assert.rejects(reply,cancelled);
 assert.equal(client.getState().pending,false);
});

for(const [name,next] of [
 ['another tab',tab('2','session:tab-2')],
 ['another view',{view:'home',timeZone:'UTC'}],
 ['a paused, sensitive screen',{...tab('2'),sensitive:true}],
 ['another time zone',{...tab('2'),timeZone:'Europe/Paris'}],
])test(`after the reply's own command, ${name} still cancels the reply`,async()=>{
 const {client,reply}=await turn(tab('1'));
 client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 client.setViewContext(next);
 await assert.rejects(reply,cancelled);
});

test('the owner\'s Stop still cancels a reply whose own command moved the page',async()=>{
 const {client,reply}=await turn(tab('1'));
 client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 client.setViewContext(tab('2'));
 client.cancel();
 await assert.rejects(reply,cancelled);
});

test('a command refused before dispatch releases its admission, and a foreign tab is never admitted',async()=>{
 const first=await turn(tab('1'));
 first.client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'})();
 first.client.setViewContext(tab('2'));
 await assert.rejects(first.reply,cancelled);
 const second=await turn(tab('1'));
 second.client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-2'});
 second.client.setViewContext(tab('2'));
 await assert.rejects(second.reply,cancelled);
 // Nothing is admitted while no request is in flight.
 const idle=new AlphaClient();idle.setViewContext(tab('1'));idle.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 assert.equal(idle.getState().pending,false);
});

test('a turn holding its sent context still matches after the reply\'s own page moves, and only then',async()=>{
 const {client,agent,reply}=await turn(tab('1'));
 const sent=client.getState().context;
 assert.equal(client.continuesContext(sent),true);
 client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 client.setViewContext({view:'browser',timeZone:'UTC'});
 client.setViewContext(tab('2'));
 assert.equal(client.continuesContext(sent),true,'the voice turn keeps its sent context across the reply\'s own back');
 agent.finish('Went back.');await reply;
 assert.equal(client.continuesContext(sent),true,'the lineage holds after the reply until something else changes');
 // Any other change ends the lineage, as an exact comparison would.
 client.setViewContext(tab('3','session:tab-2'));
 assert.equal(client.continuesContext(sent),false);
 assert.equal(client.continuesContext(client.getState().context),true);
});

test('without an admitted own change, a page move breaks the sent context',async()=>{
 const {client,reply}=await turn(tab('1'));
 const sent=client.getState().context;
 client.setViewContext(tab('2'));
 await assert.rejects(reply,cancelled);
 assert.equal(client.continuesContext(sent),false);
});

test('a second command refused before dispatch keeps the first command\'s page move admitted',async()=>{
 const {client,agent,reply}=await turn(tab('1'));
 client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 // "Go back twice": the first back is dispatched; the second is refused while that page loads.
 const second=client.admitOwnPageChange({kind:'browser-tab',id:'session:tab-1'});
 second();
 client.setViewContext(tab('2'));
 assert.equal(client.getState().pending,true,'the first back\'s load still belongs to the reply');
 agent.finish('Went back once.');
 assert.equal((await reply).text,'Went back once.');
});
