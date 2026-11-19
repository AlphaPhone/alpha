import test from 'node:test';
import assert from 'node:assert/strict';
import {withResidentMapsNavigation} from '../apps/app/src/maps/resident-relay.ts';
import {residentMapsNavigationPort} from '../apps/app/src/maps/agent-navigation.ts';
import {DeviceNavigationFailure} from '../apps/app/src/maps/device-navigation.ts';

/** v612 on the Pixel: chat directions over the Phone keypad replied "Maps could not be shown on the
 * phone right now". The phone knew why ("Open Maps on the phone to continue.") but its relay sent the
 * refusal code alone, so the agent could only say what the code means. The phone's one line now
 * travels with the code. */

const start = {kind:'start',request:{destination:{name:'Coit Tower',latitude:37.8024,longitude:-122.4058},travelMode:'walk'}};

/** One resident turn whose agent asks the phone for `operation` once; returns the phone's result body. */
async function refusal(error) {
 const navigation={select(){throw error;},start(){throw error;},reroute(){throw error;},stop(){throw error;}};
 residentMapsNavigationPort.register(navigation);
 let asked=false,answered;
 const settled=new Promise(resolve=>{answered=resolve;});
 const request=async (path,body,signal)=>{
  assert.equal(path,'/api/client-devices/maps-navigation');
  if(body.phase==='open')return {protocol:1,request:null};
  if(body.phase==='retire')return {};
  if(body.phase==='result'){answered(body);return {};}
  if(!asked){asked=true;return {protocol:1,request:{id:crypto.randomUUID(),expiresAt:Date.now()+10_000,operation:start}};}
  return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));
 };
 try {
  return await withResidentMapsNavigation(request,'conversation-1',new AbortController().signal,()=>settled);
 } finally {
  residentMapsNavigationPort.register(null);
 }
}

test('a refusal carries the phone\'s own reason with its code',async()=>{
 const result=await refusal(new DeviceNavigationFailure('MAPS_DEVICE_UNAVAILABLE','Open Maps on the phone to continue. Nothing was changed on the map.'));
 assert.deepEqual(result.failed,{code:'MAPS_DEVICE_UNAVAILABLE',message:'Open Maps on the phone to continue. Nothing was changed on the map.'});
});

test('an unexpected error sends the phone\'s plain line, never the raw error',async()=>{
 const result=await refusal(new Error('TypeError: cannot read properties of undefined (internal detail)'));
 assert.equal(result.failed.code,'MAPS_DEVICE_UNAVAILABLE');
 assert.equal(result.failed.message,'The phone could not complete this Maps request.');
 assert.doesNotMatch(JSON.stringify(result),/internal detail/);
});
