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

// Review (nav-lease): the Browser step gated itself on getState().pending, which is also true during
// an automatic workflow generation. afterRequestSettles runs the step at once then, so it saw
// pending, returned and was never retried: an approved Browser open never came to the front.
// requestHoldsViews names only the chat request a view change would cancel.
test('during an automatic workflow generation a step that checks requestHoldsViews shows',async()=>{
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(view('workflows'));
 const started=agent.started(),generation=client.generateWorkflowText('Summarise','input text',new AbortController().signal,true);await started;
 assert.equal(client.getState().pending,true);
 assert.equal(client.requestHoldsViews(),false);
 const shown=[];
 client.afterRequestSettles(()=>{if(client.requestHoldsViews())return;shown.push('browser');});
 assert.deepEqual(shown,['browser']);
 agent.finish('A summary.');
 assert.equal(await generation,'A summary.');
});
test('a chat request in flight holds views; a settled one does not',async()=>{
 const {client,agent,reply}=await turn(view('settings'));
 assert.equal(client.requestHoldsViews(),true);
 agent.finish('Done.');await reply;
 assert.equal(client.requestHoldsViews(),false);
});

// Review (nav-lease): a step held only until the request settled raced the turn's own delivery
// (its VIEWS navigation, a voice turn's spoken reply). A turn that holds its view steps runs them
// itself once its reply and navigation are delivered, and a step still runs after the turn's own
// screen change, but not after any other change.
const keypadStep=(client,shown,expected)=>({view:'phone',current:()=>{if(!client.followsTurnContext(expected))throw Error('Phone context changed');},show:detent=>{shown.push(['phone',detent]);client.setViewContext(view('phone'));}});
test('a held turn runs its view step only at release, through the turn\'s runner',async()=>{
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(view('home'));
 const hold=client.holdTurnViewSteps(),started=agent.started(),reply=client.send('open the dialer');await started;
 const shown=[],expected=client.getState().context;
 client.afterRequestSettles(keypadStep(client,shown,expected));
 agent.finish('Opening the keypad.');
 assert.equal((await reply).text,'Opening the keypad.');
 await tick();await tick();
 // The request settled, but the turn has not delivered yet: nothing changed the view.
 assert.deepEqual(shown,[]);
 const ran=[];
 await hold.release(async step=>{ran.push(step.view);step.current();step.show('sheet');});
 assert.deepEqual(ran,['phone']);
 assert.deepEqual(shown,[['phone','sheet']]);
 // Released once: a later release does nothing.
 await hold.release(()=>{throw Error('released twice');});
});
test('a held step still runs after the turn\'s own navigation, and not after another change',async()=>{
 for(const own of [true,false]){
  const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(view('home'));
  const hold=client.holdTurnViewSteps(),started=agent.started(),reply=client.send('open phone and the keypad');await started;
  const shown=[],expected=client.getState().context;
  client.afterRequestSettles(keypadStep(client,shown,expected));
  agent.finish('Opening Phone.');await reply;
  // The turn delivers its VIEWS navigation (or something else moves the screen).
  const before=client.getState().context;client.setViewContext(view(own?'phone':'contacts'));
  if(own)hold.moved(before);
  await hold.release();
  assert.deepEqual(shown,own?[['phone',undefined]]:[]);
  // Outside the release the move no longer counts.
  assert.equal(client.followsTurnContext(expected),false);
 }
});
test('a released hold with no runner waits for a request still in flight',async()=>{
 const client=new AlphaClient(),agent=held();client.attachVerifiedTransport(agent.value);client.setViewContext(view('home'));
 const hold=client.holdTurnViewSteps(),shown=[];
 const started=agent.started(),reply=client.send('open the dialer');await started;
 client.afterRequestSettles(()=>shown.push('phone'));
 await hold.release();
 assert.deepEqual(shown,[]);
 agent.finish('Opening.');await reply;await tick();
 assert.deepEqual(shown,['phone']);
});
