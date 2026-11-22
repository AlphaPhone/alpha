// v612: the agent's own Maps navigation request (MAPS_NAVIGATION_START, "directions to Coit Tower")
// opened Maps over the view the owner asked from, and that view change cancelled the reply as if
// the owner had left: the phone's answer never reached the agent. The real AlphaClient admits only
// the move onto the view the request brings forward; every other change still cancels, as Stop does.
// Synthetic in-memory transport held open by the test; no model is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {AlphaClient,AlphaClientError}=await tsImport('../apps/app/src/runtime/alpha-client.ts',import.meta.url);
const view=(name,extra={})=>({view:name,timeZone:'UTC',...extra});

function held(){
 let finish,ready;
 const started=new Promise(resolve=>{ready=resolve;});
 const value={
  session:{ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session',origin:'https://agent.example.invalid'},
  send({signal}){ready();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});finish=text=>resolve({text,proposals:[]});});},
  async execute(){throw Error('No action may execute');},
 };
 return {value,started,finish:text=>finish(text)};
}
async function turn(context){
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(context);
 const reply=client.send('directions to Coit Tower');await agent.started;
 return {client,agent,reply};
}
const cancelled=error=>error instanceof AlphaClientError&&error.code==='cancelled';

for(const from of ['home','phone','browser'])test(`the reply's own Maps request opens Maps over ${from} and the reply completes`,async()=>{
 const {client,agent,reply}=await turn(view(from));
 const release=client.admitOwnViewOpen('maps');
 client.setViewContext(view('maps'));
 // The route sheet selects the destination inside Maps while the request runs.
 client.setViewContext(view('maps',{selectedObject:{kind:'map-place',id:'N3001',revision:'1'}}));
 assert.equal(client.getState().pending,true);
 release();
 agent.finish('Confirm on the phone to start navigation to Coit Tower.');
 assert.equal((await reply).text,'Confirm on the phone to start navigation to Coit Tower.');
});

test('without the admission, opening Maps still cancels the reply',async()=>{
 const {client,reply}=await turn(view('phone'));
 client.setViewContext(view('maps'));
 await assert.rejects(reply,cancelled);
});

for(const [name,next] of [
 ['another view than Maps',view('browser')],
 ['a paused, sensitive screen in Maps',view('maps',{sensitive:true})],
])test(`while Maps is admitted, ${name} still cancels the reply`,async()=>{
 const {client,reply}=await turn(view('home'));
 client.admitOwnViewOpen('maps');
 client.setViewContext(next);
 await assert.rejects(reply,cancelled);
});

test('after the release, or once the request ends, a move to Maps cancels again',async()=>{
 const first=await turn(view('home'));
 first.client.admitOwnViewOpen('maps')();
 first.client.setViewContext(view('maps'));
 await assert.rejects(first.reply,cancelled);
 const second=await turn(view('home'));
 second.client.admitOwnViewOpen('maps');
 second.agent.finish('Done.');await second.reply;
 const next=held();second.client.attachVerifiedTransport(next.value);second.client.setViewContext(view('home'));
 const later=second.client.send('Something else');await next.started;
 second.client.setViewContext(view('maps'));
 await assert.rejects(later,cancelled);
 // Nothing is admitted while no request is in flight.
 const idle=new AlphaClient();idle.setViewContext(view('home'));idle.admitOwnViewOpen('maps');
 assert.equal(idle.getState().pending,false);
});

test('the owner\'s Stop still cancels a reply whose own request opened Maps',async()=>{
 const {client,reply}=await turn(view('phone'));
 client.admitOwnViewOpen('maps');
 client.setViewContext(view('maps'));
 client.cancel();
 await assert.rejects(reply,cancelled);
});
