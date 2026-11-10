import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const settle=async()=>{for(let n=0;n<4;n++)await new Promise(resolve=>setImmediate(resolve));};
let instance=0;
/** Bundles one source with the named imports replaced by fixtures; every call is a fresh module instance. */
async function load(entry,ports={}){
 const names=Object.keys(ports);
 const plugins=names.length?[{name:'ports',setup(b){
  b.onResolve({filter:new RegExp('/('+names.join('|')+')$')},args=>({path:args.path.split('/').at(-1),namespace:'port'}));
  b.onLoad({filter:/.*/,namespace:'port'},args=>({loader:'js',contents:ports[args.path]}));}}]:[];
 const out=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,plugins});
 return import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text+'\n//'+(++instance)).toString('base64'));
}

const capabilities={providerId:'eliza-cloud',connectionId:'conn_0123456789abcdef',revision:'r1',attribution:'© OpenStreetMap contributors',
 regions:[{id:'eu',name:'Europe',bounds:[-10,35,30,60]}],capabilities:{search:true,placeDetails:true,traffic:'none',transit:'none',modes:['drive','walk']}};
const unavailable=()=>Object.assign(new Error('Service unavailable'),{name:'CloudProtocolError',code:'http',status:503,data:{}});
/** Cloud Maps as it runs at launch, with a recorded Cloud client, provider installs and a controllable page. */
async function cloudMaps(t,{hidden=false,fail=false}={}){
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1_000_000_000});
 const f={fail,requests:0,installs:[],subscribers:[]};
 f.client={sessionId:'s1',credentialId:'c1',client:{mapsRequest:async route=>{assert.equal(route,'capabilities');f.requests++;if(f.fail)throw unavailable();return structuredClone(capabilities);}}};
 const page=Object.assign(new EventTarget(),{hidden}),view=new EventTarget();
 const before={window:globalThis.window,document:globalThis.document};
 Object.assign(globalThis,{window:view,document:page,cloudMapsFixture:f});
 t.after(()=>{for(const key of ['window','document'])if(before[key]===undefined)delete globalThis[key];else globalThis[key]=before[key];delete globalThis.cloudMapsFixture;});
 const maps=await load('apps/app/src/maps/cloud-maps.ts',{
  'connection-ui':'export const connectionController={getCloudClient:()=>globalThis.cloudMapsFixture.client,subscribe:listener=>{globalThis.cloudMapsFixture.subscribers.push(listener);return()=>{};}};',
  runtime:'export const configureMapsProvider=config=>{globalThis.cloudMapsFixture.installs.push(config.status);};'});
 await settle();
 return {f,maps,
  online:async()=>{view.dispatchEvent(new Event('online'));await settle();},
  show:async visible=>{page.hidden=!visible;page.dispatchEvent(new Event('visibilitychange'));await settle();},
  pass:async ms=>{t.mock.timers.tick(ms);await settle();}};
}

test('the network returning leaves a working Maps connection, and its guidance, installed',async t=>{
 const {f,maps,online}=await cloudMaps(t);
 assert.deepEqual(f.installs,['configured']);assert.equal(f.requests,1);
 await online();await online();
 assert.deepEqual(f.installs,['configured'],'the installed provider is neither removed nor replaced');
 assert.equal(f.requests,1);
 assert.deepEqual(maps.cloudMapsDiagnostics(),{configured:true,error:'',message:''});
});

test('the network returning reconnects a failed Maps connection at once',async t=>{
 const {f,maps,online}=await cloudMaps(t,{fail:true});
 assert.equal(maps.cloudMapsDiagnostics().error,'unavailable');assert.deepEqual(f.installs,[]);
 f.fail=false;await online();
 assert.equal(f.requests,2);assert.deepEqual(f.installs,['configured']);assert.equal(maps.cloudMapsDiagnostics().error,'');
});

test('a connection that failed behind another app is retried after a quick return to the front',async t=>{
 const {f,maps,show,pass}=await cloudMaps(t,{hidden:true,fail:true});
 assert.equal(f.requests,1);
 assert.match(maps.cloudMapsDiagnostics().message,/Trying again automatically\.$/);
 f.fail=false;
 await pass(10_000);await show(true);
 assert.equal(f.requests,1,'a return within a minute does not connect at once');
 await pass(30_000);
 assert.equal(f.requests,2,'the retry timer was put back');
 assert.deepEqual(maps.cloudMapsDiagnostics(),{configured:true,error:'',message:''});
 assert.deepEqual(f.installs,['configured']);
});

test('a retry that comes due behind another app waits for the front',async t=>{
 const {f,maps,show,pass}=await cloudMaps(t,{fail:true});
 assert.equal(f.requests,1);
 await show(false);await pass(30_000);
 assert.equal(f.requests,1,'nothing connects while hidden');
 f.fail=false;await show(true);
 assert.equal(f.requests,1,'under a minute since the last attempt');
 await pass(60_000);
 assert.equal(f.requests,2);assert.equal(maps.cloudMapsDiagnostics().error,'');
});

test('a healthy connection is one that is configured without an error',async()=>{
 const {cloudMapsHealthy}=await load('apps/app/src/maps/cloud-provider.ts');
 assert.equal(cloudMapsHealthy({configured:true,error:''}),true);
 assert.equal(cloudMapsHealthy({configured:true,error:'unavailable'}),false);
 assert.equal(cloudMapsHealthy({configured:false,error:''}),false);
});

test('a location watch that cannot start ends guidance through the same error path',async()=>{
 const {watchNavigationFixes}=await import('../apps/app/src/maps/navigation-fix.ts');
 const refused=new Error('A location permission or start request is still settling.'),errors=[],fixes=[];
 watchNavigationFixes({start:async(oneShot,onFix)=>{assert.equal(oneShot,false);onFix({timestamp:1});throw refused;}},fix=>fixes.push(fix),error=>errors.push(error));
 await settle();
 assert.deepEqual(errors,[refused]);assert.equal(fixes.length,1);
 const late=new Error('watch lost'),heard=[];
 watchNavigationFixes({start:async(_oneShot,_onFix,onError)=>{onError(late);}},()=>{},error=>heard.push(error));
 await settle();
 assert.deepEqual(heard,[late],'a watch that reports its own failure is not reported twice');
 // Guidance starts its watch only this way, so a refused start cannot leave it waiting for a fix.
 const adapter=fs.readFileSync('apps/app/src/prototype/maps-adapter.ts','utf8');
 assert.match(adapter,/watchNavigationFixes\(navigationLocation,onNavFix,error=>\{if\(session!==navSession\)return;message=failure\(error\)\.message;void stopGuidance\(\)/);
 assert.doesNotMatch(adapter,/navigationLocation\.start\(/);
});

function bridge(){
 const calls=[],listeners=[];
 return {calls,listeners,
  async navigationAvailability(){return {background:true};},
  async startNavigation(input){calls.push(['start',input.sessionId]);},
  async updateNavigation(input){calls.push(['update',input.title,input.text]);return {active:true};},
  async stopNavigation(input){calls.push(['stop',input.sessionId]);return {stopped:true};},
  async addListener(name,listener){const entry={name,listener};listeners.push(entry);return {remove:async()=>{listeners.splice(listeners.indexOf(entry),1);}};}};
}

test('an instruction that arrives while the native session is starting is sent once it has started',async()=>{
 const {BackgroundNavigation}=await import('../apps/app/src/maps/background-navigation.ts');
 const native=bridge(),heard=[],session=new BackgroundNavigation(native,()=>true);
 let started;
 native.startNavigation=input=>{native.calls.push(['start',input.sessionId]);return new Promise(resolve=>{started=resolve;});};
 // The native service answers an update for a session it has not started with "not active".
 native.updateNavigation=async input=>{native.calls.push(['update',input.title,input.text]);return {active:!!native.running};};
 const running=session.start('Route to Port','Waiting for location',reason=>heard.push(reason));
 await settle();
 session.update('300 m · Turn left','4 min · 1.2 km remaining');
 session.update('250 m · Turn left','4 min · 1.1 km remaining');
 await settle();
 assert.deepEqual(native.calls.filter(([kind])=>kind==='update'),[],'nothing is sent before the service knows the session');
 assert.equal(session.active(),true);assert.deepEqual(heard,[]);
 native.running=true;started();
 assert.equal(await running,true);await settle();
 assert.deepEqual(native.calls.filter(([kind])=>kind==='update'),[['update','250 m · Turn left','4 min · 1.1 km remaining']],'only the latest instruction is sent');
 assert.equal(session.active(),true);assert.deepEqual(heard,[]);
 session.update('250 m · Turn left','4 min · 1.1 km remaining');
 session.update('200 m · Turn left','3 min · 1.0 km remaining');
 assert.equal(native.calls.filter(([kind])=>kind==='update').length,2,'later instructions are sent as they change');
 await session.stop();

 const quiet=bridge(),unchanged=new BackgroundNavigation(quiet,()=>true);
 assert.equal(await unchanged.start('Route','Waiting',()=>{}),true);await settle();
 assert.deepEqual(quiet.calls.filter(([kind])=>kind==='update'),[],'a start with no newer instruction sends no update');
 await unchanged.stop();
});

const at=(latitude,longitude)=>({latitude,longitude});
const step=(instruction,coordinate)=>({instruction,coordinate,distanceMeters:1});
// North for about 222 m, then east for about 333 m.
const corner={durationSeconds:120,geometry:[at(0,0),at(0.002,0),at(0.002,0.003)],
 steps:[step('Head north',at(0,0)),step('Turn right',at(0.002,0)),step('Arrive',at(0.002,0.003))]};

test('a maneuver the device never came near is passed after two fixes clear beyond it',async()=>{
 const {advanceStep,clearedMeters,atStep}=await import('../apps/app/src/maps/guidance.ts');
 const {routeProgress}=await import('../apps/app/src/maps/route-distance.ts');
 const feed=(hold,point,accuracyMeters=10,onRoute=true,route=corner)=>advanceStep(hold,route,routeProgress(point,route),{coordinate:point,accuracyMeters},onRoute);
 // Coming near the turn passes it at once, as before.
 assert.deepEqual(feed({index:1,cleared:0},at(0.0019,0)),{index:2,cleared:0});
 assert.deepEqual(feed({index:0,cleared:0},at(0.0001,0)),{index:1,cleared:0});
 // About 111 m beyond a turn no fix came near: held for one fix, passed on the second.
 const beyond=at(0.002,0.001);
 const first=feed({index:1,cleared:0},beyond);
 assert.deepEqual(first,{index:1,cleared:1});
 assert.equal(atStep(routeProgress(beyond,corner),corner.steps,first.index).next.step.instruction,'Turn right','one fix past the turn still announces it');
 assert.deepEqual(feed(first,beyond),{index:2,cleared:0});
 // A single jumping fix followed by one before the turn skips nothing.
 assert.deepEqual(feed(first,at(0.001,0)),{index:1,cleared:0});
 // Off-route fixes and fixes within the accuracy margin do not count.
 assert.deepEqual(feed(first,beyond,10,false),{index:1,cleared:0});
 assert.deepEqual(feed(first,at(0.002,0.0007),45),{index:1,cleared:0},'78 m is inside twice a 45 m accuracy');
 assert.deepEqual(feed(first,at(0.002,0.0004)),{index:1,cleared:0},'44 m is inside the 60 m margin');
 // Guidance started partway along the route leaves the first step behind.
 const partway=at(0.0012,0);
 assert.deepEqual(feed(feed({index:0,cleared:0},partway),partway),{index:1,cleared:0});
 // The last step is never passed.
 assert.deepEqual(feed({index:2,cleared:1},at(0.002,0.003)),{index:2,cleared:0});
 // Where the route doubles back, a position on the shared line is never clear of the earlier leg,
 // whichever leg the route position was matched to.
 const back={durationSeconds:120,geometry:[at(0,0),at(0.003,0),at(0,0)],steps:[step('Head north',at(0,0)),step('Make a U-turn',at(0.003,0)),step('Arrive',at(0,0))]};
 const matchedLate={alongMeters:555,maneuverAlongMeters:[0,333.6,667.2]},shared=at(0.001,0);
 assert.equal(clearedMeters(shared,back,matchedLate,1)<1,true);
 let hold={index:1,cleared:0};
 for(let n=0;n<5;n++)hold=advanceStep(hold,back,matchedLate,{coordinate:shared,accuracyMeters:10},true);
 assert.deepEqual(hold,{index:1,cleared:0});
 assert.equal(clearedMeters(beyond,corner,{alongMeters:100,maneuverAlongMeters:[0,222,555]},1),0,'not past the maneuver');
 assert.equal(Math.round(clearedMeters(beyond,corner,routeProgress(beyond,corner),1)),111);
 const adapter=fs.readFileSync('apps/app/src/prototype/maps-adapter.ts','utf8');
 assert.match(adapter,/\(\{index:navStep,cleared:navCleared\}=advanceStep\(\{index:navStep,cleared:navCleared\},current,progress,fix,!offRoute\)\)/);
});

test('a chat message is parsed once and its parse reused until its text changes',async()=>{
 const {createMapsChatParses}=await load('apps/app/src/runtime/maps-chat-markup.ts');
 const parses=createMapsChatParses(),share='Share?\n[CHOICE:maps-share id=maps-share-m1]\nYes, share (confirmed).=Share location\nNo.=Don\'t share\n[/CHOICE]';
 const first=parses.parse('a1',share);
 assert.equal(first.choice.id,'maps-share-m1');
 assert.equal(parses.parse('a1',share),first,'unchanged text returns the same parse');
 const edited=parses.parse('a1','Plain reply.');
 assert.notEqual(edited,first);assert.equal(edited.displayText,'Plain reply.');assert.equal(edited.choice,null);
 assert.equal(parses.parse('a1','Plain reply.'),edited);
 const other=parses.parse('a2',share);
 assert.notEqual(other,first);assert.deepEqual(other,first);
 assert.equal(parses.size,2);
 parses.retain(['a2']);
 assert.equal(parses.size,1);
 assert.equal(parses.parse('a2',share),other);
 assert.notEqual(parses.parse('a1','Plain reply.'),edited,'a forgotten message is parsed again');
});

test('rendering the conversation again parses only new or changed agent messages',async t=>{
 const {installMapsChatAdapter}=await load('apps/app/src/prototype/maps-chat-adapter.ts',{
  'connection-ui':'export const connectionController={getSnapshot:()=>({open:false,busy:false})};',
  'agent-navigation':'export const mapsAgentResultsPort={current:null};'});
 const share=id=>`Share?\n[CHOICE:maps-share id=maps-share-${id}]\nYes, share (confirmed).=Share location\nNo.=Don't share\n[/CHOICE]`;
 const msgs=[{id:'u0',from:'user',text:'hello'},{id:'a1',from:'agent',text:'Plain reply.'},{id:'a2',from:'agent',text:share('m2')}];
 class Shell{live=true;st={msgs,draft:'',typing:false};S(){return this.st;}renderVals(){return {msgs:this.st.msgs.map(m=>({...m,isAgent:m.from==='agent',displayText:m.text,hasCalendarText:true}))};}setState(){}toast(){}async send(){}}
 installMapsChatAdapter(Shell);
 const shell=new Shell(),replace=String.prototype.replace;
 // Every parse runs the share-answer pattern over the message text exactly once.
 let parsed=0;
 String.prototype.replace=function(pattern,...rest){if(pattern instanceof RegExp&&pattern.source.includes('CHOICE:maps-share'))parsed++;return replace.call(this,pattern,...rest);};
 t.after(()=>{String.prototype.replace=replace;});
 let view=shell.renderVals();
 assert.equal(parsed,2,'both agent messages are parsed the first time');
 assert.equal(view.msgs[2].hasMapsChoice,true);assert.equal(view.msgs[1].mapsCards,undefined);
 for(let n=0;n<10;n++)view=shell.renderVals();
 assert.equal(parsed,2,'unchanged messages are not parsed again');
 assert.equal(view.msgs[2].hasMapsChoice,true);assert.deepEqual(view.msgs[2].mapsChoices.map(choice=>choice.label),['Share location',"Don't share"]);
 shell.st.msgs=[...msgs,{id:'a3',from:'agent',text:share('m3')}];
 view=shell.renderVals();
 assert.equal(parsed,3,'only the new message is parsed');
 assert.equal(view.msgs[2].hasMapsChoice,false);assert.equal(view.msgs[3].hasMapsChoice,true);
 shell.st.msgs=shell.st.msgs.map(message=>message.id==='a1'?{...message,text:'Edited reply.'}:message);
 shell.renderVals();
 assert.equal(parsed,4,'an edited message is parsed again');
});
