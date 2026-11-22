// Network location (Wi-Fi/cell through BeaconDB) for when GPS has no fix. Host checks of the query
// builder (JVM) and the renderer's cache, reader fallback and Maps fallback. Nothing here runs on
// Android or reaches the service.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSource,fixture,runJvm} from './fixtures/jvm-tools.mjs';
import {loadBrowserModule} from './fixtures/browser-source.mjs';

const [{NetworkLocationClient,NETWORK_FIX_REUSE_MS,NETWORK_FIX_UNCHANGED_MS,NETWORK_FIX_RETRY_MS},{PhoneLocationReader}]=await loadBrowserModule(['apps/app/src/runtime/network-location.ts','apps/app/src/runtime/phone-location.ts']);

test('the query sends only allowed identifiers and never asks for an IP guess',()=>{
 assert.match(runJvm([nativeSource('NetworkLocationQuery.java'),fixture('NetworkLocationQueryTest.java')],'ai.alphacompute.alphaphone.NetworkLocationQueryTest'),/^PASS network location query/);
});

function bridge(clock){
 const calls=[];let answer={latitude:37.7764,longitude:-122.4258,accuracy:40,timestamp:0,fingerprint:'abc'};let fail=false;
 return {calls,set answer(value){answer=value;},set fail(value){fail=value;},locate:async options=>{calls.push(options);if(fail)throw Object.assign(Error('no'),{code:'not-found'});return typeof answer==='function'?answer():{...answer,timestamp:answer.timestamp||clock.now};}};
}

test('one shared lookup, reused for a while, then confirmed cheaply while the networks are unchanged',async()=>{
 const clock={now:1_800_000_000_000},b=bridge(clock),client=new NetworkLocationClient({available:()=>true,bridge:b,now:()=>clock.now});
 assert.equal(client.cached(),undefined,'nothing is looked up just to read the cache');
 const [first,second]=await Promise.all([client.locate(),client.locate()]);
 assert.deepEqual(first,{latitude:37.7764,longitude:-122.4258,accuracyMeters:40,timestamp:clock.now});
 assert.equal(second,first);assert.equal(b.calls.length,1,'concurrent callers share one request');
 clock.now+=NETWORK_FIX_REUSE_MS-1;await client.locate();assert.equal(b.calls.length,1,'a recent answer is reused');
 clock.now+=2;b.answer=()=>({unchanged:true,fingerprint:'abc'});
 const confirmed=await client.locate();
 assert.deepEqual(b.calls[1],{unchangedFrom:'abc'},'a later lookup says what it already knows');
 assert.equal(confirmed.timestamp,clock.now,'an unchanged place keeps its answer, freshly confirmed');
 clock.now=first.timestamp+NETWORK_FIX_UNCHANGED_MS+1;
 assert.equal(client.cached(),undefined,'a confirmation cannot extend the original lookup beyond one hour');
 b.answer={latitude:38,longitude:-123,accuracy:40,fingerprint:'def'};
 assert.equal((await client.locate()).latitude,38);
 assert.deepEqual(b.calls[2],{},'an expired fix requests a new position');
});

test('a failed lookup backs off, and an unavailable plugin is never called',async()=>{
 const clock={now:1_800_000_000_000},b=bridge(clock);b.fail=true;
 const client=new NetworkLocationClient({available:()=>true,bridge:b,now:()=>clock.now});
 assert.equal(await client.locate(),undefined);await client.locate();assert.equal(b.calls.length,1,'no retry inside the back-off');
 clock.now+=NETWORK_FIX_RETRY_MS+1;b.fail=false;assert.ok(await client.locate());assert.equal(b.calls.length,2);
 const off=bridge(clock),none=new NetworkLocationClient({available:()=>false,bridge:off,now:()=>clock.now});
 assert.equal(await none.locate(),undefined);assert.equal(off.calls.length,0);
});

test('the agent gets the network position when GPS has none, and only the warm-up looks one up',async()=>{
 const clock={now:1_800_000_000_000};let looked=0,cached;
 const network={cached:()=>cached,locate:async()=>{looked++;cached={latitude:37.7764,longitude:-122.4258,accuracyMeters:35.6,timestamp:clock.now};return cached;}};
 const reader=new PhoneLocationReader({enabled:()=>true,now:()=>clock.now,network,bridge:{checkPermissions:async()=>({location:'granted'}),getCurrentPosition:async()=>{throw Error('no GPS fix');}}});
 const signal=new AbortController().signal;
 assert.equal(await reader.read(signal),undefined);assert.equal(looked,0,'a chat turn never looks up');
 assert.equal(await reader.warm(signal),undefined);await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(looked,1,'the connection warm-up looks up once when GPS has nothing');
 assert.deepEqual(await reader.read(signal),{latitude:37.7764,longitude:-122.4258,accuracyMeters:36,capturedAt:clock.now});
 const off=new PhoneLocationReader({enabled:()=>false,now:()=>clock.now,network,bridge:{checkPermissions:async()=>({location:'granted'}),getCurrentPosition:async()=>{throw Error('x');}}});
 assert.equal(await off.read(signal),undefined,'with Alpha location sharing off the agent gets nothing');
 assert.equal(await off.warm(signal),undefined);assert.equal(looked,1,'and nothing is looked up');

 const cancelled=new AbortController();
 const retired=new PhoneLocationReader({enabled:()=>true,now:()=>clock.now,network,bridge:{checkPermissions:async()=>({location:'granted'}),getCurrentPosition:async()=>{throw Error('no GPS fix');}}});
 retired.read=async()=>{cancelled.abort();return undefined;};
 await assert.rejects(retired.warm(cancelled.signal),{name:'AbortError'});
 assert.equal(looked,1,'a retired connection cannot start a network lookup');
});

const [{NativeMapsLocation}]=await loadBrowserModule(['apps/app/src/maps/native-location.ts']);
function gpsBridge(){
 const listeners={};let cleared=0;
 return {listeners,get cleared(){return cleared;},
  checkPermissions:async()=>({location:'granted',accuracy:'precise'}),requestPermissions:async()=>({location:'granted',accuracy:'precise'}),cancelPermissionRequest:async()=>{},
  addListener:async(name,callback)=>{listeners[name]=callback;return {remove:async()=>{delete listeners[name];}};},
  watchPosition:async()=>({watchId:'w1'}),clearWatch:async()=>{cleared++;}};
}
const platform={isNative:()=>true,available:()=>true};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('Maps uses a network position as approximate only when GPS gives nothing',async()=>{
 let lookups=0;const network={locate:async()=>{lookups++;return {latitude:37.7764,longitude:-122.4258,accuracyMeters:40,timestamp:Date.now()};}};
 const silent=gpsBridge(),fixes=[];
 const maps=new NativeMapsLocation(network,20,silent,platform);
 await maps.start(true,position=>fixes.push(position),error=>assert.fail(error.message));
 await wait(60);
 assert.equal(lookups,1);
 assert.deepEqual(fixes.map(fix=>[fix.coordinate.latitude,fix.precision,fix.accuracyMeters]),[[37.7764,'approximate',40]]);
 assert.equal(silent.cleared,1,'a one-shot request finishes with the network position');

 const live=gpsBridge(),gpsFixes=[];lookups=0;
 const withGps=new NativeMapsLocation(network,20,live,platform);
 await withGps.start(false,position=>gpsFixes.push(position),()=>{});
 live.listeners.locationChange({coords:{latitude:37.79,longitude:-122.39,accuracy:5,timestamp:Date.now()},cached:false});
 await wait(60);
 assert.equal(lookups,0,'a GPS fix inside the grace period means no lookup');
 assert.deepEqual(gpsFixes.map(fix=>fix.precision),['precise']);

 const stopped=gpsBridge();lookups=0;
 const leaving=new NativeMapsLocation(network,20,stopped,platform);
 await leaving.start(false,()=>assert.fail('no fix after stop'),()=>{});
 await leaving.stop();await wait(60);
 assert.equal(lookups,0,'leaving Maps before the grace period cancels the lookup');
});
