import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// The agent answers GET /api/client-devices/view-profile with
// deviceViewsForCapabilities(<the X-Eliza-Device-Capabilities of that request>). Phone, Messages
// and Contacts are offered only to a request that carries views.telephony.v1. On v609 the phone
// negotiated with its bootstrap header ("calendar.local-event.v1,notes.local-record.v1"), so the
// image enrolled no telephony view and chat refused "open messages / the phone app / contacts".

async function image(){
 const saved=[globalThis.Capacitor,globalThis.androidBridge];
 Object.assign(globalThis,{androidBridge:{},Capacitor:{PluginHeaders:[{name:'AlphaTelephony',methods:[{name:'imageCapability'}]}]}});
 try{
  const result=await build({stdin:{contents:`export {negotiateEnabledViews} from './apps/app/src/runtime/device-view-profile.ts';export {selectDeviceCapabilities} from './apps/app/src/runtime/phone-context.ts';export {deviceViewsForCapabilities,DEVICE_VIEWS} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/contract.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',banner:{js:'// image view header'}});
  return await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 }finally{[globalThis.Capacitor,globalThis.androidBridge]=saved;}
}
/** The pinned agent route, answering from the header the request carries. */
async function enrol(app,header){
 let views;
 await app.negotiateEnabledViews(1,async(_path,body)=>body?(views=body.views,{version:1,profile:{version:1,revision:'11111111-1111-4111-8111-111111111111',views}}):{version:1,profile:null,supportedViews:[...app.deviceViewsForCapabilities(header.split(','))]},new AbortController().signal);
 return views;
}

test('on the verified image the full header enrols Phone and Messages; the bootstrap header enrols neither',async()=>{
 const app=await image();
 const full=app.selectDeviceCapabilities(['views.telephony.v1','phone.call.v1','sms.compose.v1'],{android:true,native:true,camera:false,foregroundReview:true,clockRepeatDays:false,aospImage:true});
 assert.ok(full.includes('views.telephony.v1'));
 const enrolled=await enrol(app,full.join(','));
 for(const view of ['phone','messages'])assert.ok(enrolled.includes(view),view);
 const bootstrap=await enrol(app,'calendar.local-event.v1,notes.local-record.v1');
 for(const view of ['phone','messages','contacts'])assert.ok(!bootstrap.includes(view),view);
});
