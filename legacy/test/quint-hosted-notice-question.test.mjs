import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs,call,captureSources,checkpoint,deferred,root,tick,trace} from '../specs/quint/refinement/application/support.mjs';

const driver=fileURLToPath(import.meta.url);
const implementation='apps/app/src/runtime/hosted-notice-question.ts';
const snapshot={kind:'ready',question:true,token:'fixture-tap',result:{runId:'fixture-run',output:'The reviewed task is complete.'}};
const inputs={
 valid:snapshot,ordinary:{...snapshot,question:false},
 summary:{...snapshot,result:{...snapshot.result,output:{}}},
 private:{...snapshot,result:{...snapshot.result,output:'Your verification code is 123456.'}},
};
const replies={exact:snapshot,ordinary:inputs.ordinary,missing:{kind:'none'},
 token:{...snapshot,token:'replacement-tap'},body:{...snapshot,result:{...snapshot.result,output:'A changed fixture result.'}}};

async function load(){
 const built=await build({absWorkingDir:root,entryPoints:[implementation],bundle:true,format:'esm',
  platform:'node',write:false,metafile:true,plugins:[{name:'closed-owner-context',setup(builder){
   builder.onResolve({filter:/^\.\/alpha-client$/},args=>({path:args.path,namespace:'fixture'}));
   builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const alphaClient={getState:()=>({context:{sensitive:globalThis.__quintHostedQuestion.sensitive}})};'}));
  }}],
 });
 const sources=Object.keys(built.metafile.inputs).filter(path=>!path.startsWith('fixture:')&&!path.startsWith('node_modules/'));
 captureSources([driver,implementation,...sources]);
 return {actual:await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')),sources};
}

async function scenario(actual,name,drive){
 const window=new EventTarget(),state={owner:true,sensitive:false,composer:true},signal=new AbortController();
 const globals={window,__quintHostedQuestion:state};
 const previous=Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]);
 for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const resolveTap=actual.hostedTapResolver();
 let close,admission,recheck,consumption,resolver,interrupted=false;
 let closes=0,rechecks=0,consumeCalls=0,consumed=0,composed=0,reports=0,fallback=0,resolveCalls=0,resolveFailures=0;
 const observe=()=>({'s.owner':state.owner,'s.sensitive':state.sensitive,'s.composer':state.composer,
  's.phase':recheck?'recheck':consumption?'consume':closes?'done':admission?'queued':fallback?'fallback':'idle',
  's.interrupted':interrupted,'s.closes':closes,'s.rechecks':rechecks,'s.consumeCalls':consumeCalls,
  's.consumed':consumed,'s.composed':composed,'s.reports':reports,'s.fallback':fallback,
  's.resolving':!!resolver,'s.resolveCalls':resolveCalls,'s.resolveFailures':resolveFailures});
 const recorded=trace(name,observe());
 const record=(label,action,...args)=>checkpoint(recorded,label,call(action,...args),observe());
 try{
  await drive({
   async open(kind='valid'){
    close=actual.reviewHostedNoticeQuestion({
     signal:signal.signal,result:inputs[kind],current:()=>state.owner,
     recheck(){rechecks++;recheck=deferred();return recheck.promise;},
     canCompose:()=>state.composer,
     async consume(){consumeCalls++;consumption=deferred();await consumption.promise;consumed++;},
     async attach(selection){
      const file=await selection.read(selection.current);
      if(!file||!selection.current())return false;
      assert.equal(file.name,'Saved result.txt');
      assert.equal(await file.text(),snapshot.result.output);
      assert.equal(selection.prompt,'Help me understand this saved result.');
      admission=deferred();
      if(!await admission.promise||!selection.current()||!await selection.commit(selection.current)||!selection.current())return false;
      composed++;return true;
     },
     report(message){assert.match(message,/Nothing was added to your conversation/);reports++;},
     unreviewable(){fallback++;},
     closed(){closes++;},
    });
    await tick();
    record('The exact source begins local staging or falls back to its ordinary notice','open',kind);
   },
   owner(value){state.owner=value;record('The source owner changes','owner',value);},
   sensitive(value){state.sensitive=value;record('The current view changes sensitivity','sensitive',value);},
   composer(value){state.composer=value;record('The conversation availability changes','composerAllowed',value);},
   async admit(accepted=true){
    const held=admission;assert.ok(held);
    admission=undefined;held.resolve(accepted);await tick();
    record('The composer accepts or declines the attachment bytes','admit',accepted);
   },
   async interrupt(event){
    interrupted=true;
    if(event==='signal')signal.abort();else window.dispatchEvent(new Event(event));
    admission?.resolve(false);admission=undefined;await tick();
    record('The lifecycle retires the exact staging operation','interrupt');
   },
   async recheck(reply){
    const held=recheck;assert.ok(held);recheck=undefined;held.resolve(replies[reply]);await tick();
    record('The retained token and source content are rechecked','recheck',reply);
   },
   async consume(ok){
    const held=consumption;assert.ok(held);consumption=undefined;
    if(ok)held.resolve();else held.reject(Error('Synthetic consume refused'));await tick();
    record('The closed native consume settles','settleConsume',ok);
   },
   async resolveTap(){
    const held=deferred();let started=false;
    held.completion=resolveTap(()=>{started=true;resolveCalls++;return held.promise;}).catch(()=>{resolveFailures++;});
    if(started)resolver=held;else await held.completion;
    record('The exact tap resolver refuses overlap','resolveTap');
   },
   async finishResolve(ok){
    const held=resolver;assert.ok(held);
    if(ok)held.resolve();else held.reject(Error('Synthetic resolution refused'));
    await held.completion;resolver=undefined;
    record('The resolution slot is released','finishResolve',ok);
   },
  });
  assert.equal(admission??recheck??consumption??resolver,undefined);
  return recorded;
 }finally{
  close?.();admission?.resolve(false);await tick();
  for(const [key,descriptor] of previous){
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
 }
}

test('hosted result attachments refine owner checks and native custody',{timeout:scaledTimeout(120000)},async()=>{
 const {actual,sources}=await load();
 const run=(name,drive)=>scenario(actual,name,drive);
 const admitted=async f=>{await f.open();await f.admit();};
 const traces=[await run('exact-source-draft-and-acknowledgement',async f=>{await admitted(f);await f.recheck('exact');await f.consume(true);})];
 for(const reply of ['token','body','ordinary','missing'])
  traces.push(await run('recheck-refuses-'+reply,async f=>{await admitted(f);await f.recheck(reply);}));
 for(const event of ['signal','pagehide','blur','launcher-home'])
  traces.push(await run('retirement-'+event,async f=>{await f.open();await f.interrupt(event);}));
 for(const kind of ['summary','ordinary','private'])traces.push(await run('unreviewable-'+kind,f=>f.open(kind)));
 traces.push(
  await run('sensitive-context-falls-back',async f=>{f.sensitive(true);await f.open();}),
  await run('byte-limit-keeps-the-native-tap',async f=>{await f.open();await f.admit(false);}),
  await run('stale-owner-refuses-before-readback',async f=>{await f.open();f.owner(false);await f.admit();}),
  await run('owner-lost-before-consume',async f=>{await admitted(f);f.owner(false);await f.recheck('exact');}),
  await run('chooser-refusal-keeps-the-native-tap',async f=>{await admitted(f);f.composer(false);await f.recheck('exact');}),
  await run('home-retires-held-recheck',async f=>{await admitted(f);await f.interrupt('launcher-home');await f.recheck('exact');}),
  await run('owner-loss-after-consume-dispatch',async f=>{await admitted(f);await f.recheck('exact');f.owner(false);await f.consume(true);}),
  await run('blur-retires-held-consume',async f=>{await admitted(f);await f.recheck('exact');await f.interrupt('blur');await f.consume(true);}),
  await run('native-consume-refusal',async f=>{await admitted(f);await f.recheck('exact');await f.consume(false);}),
  await run('resolver-refuses-overlap-and-releases-on-error',async f=>{
   await f.resolveTap();await f.resolveTap();await f.finishResolve(false);await f.resolveTap();await f.finishResolve(true);
  }),
 );
 const receipt=await checkTraces(boundInputs({model:'HostedNoticeQuestion',traces,sources:[driver,...sources],
  scope:'bounded-orchestration',assumptions:[
   'The production hosted question, shared attachment lifecycle and digest eligibility run against isolated owner, composer and native acknowledgement ports.',
   'One native tap and staged attachment. Attachment byte admission is controlled by the composer port, and exact content stays local.',
  ]}));
 assert.equal(receipt.traces,22);
 assert.equal(receipt.observedFields.length,15);
 assert.ok(receipt.passed&&receipt.inputsUnchanged&&receipt.driverInputsBound);
});
