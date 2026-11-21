import {test,expect} from '@playwright/test';

// Exercise the real message action and playback ownership with a closed speaker port.
for(const route of ['cloud','direct'] as const)test(`message Read aloud follows selected ${route} route`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.route('https://**/*',request=>request.abort());
 await page.route('**/src/runtime/voice-selection.ts*',request=>request.fulfill({contentType:'application/javascript',body:`
 export const speechRoute=()=>${JSON.stringify(route)};
 export const selectVoiceRoute=()=> 'cloud';
 export const voicePreferenceKeys=()=>({route:'test',event:'test'});
 export const voiceSendPolicy=()=> 'auto-send';
 export const clefEndpointStage=()=>({enabled:false,client:null});
 export const noteNetworkSpeechFailure=()=>false;
 export const clearNetworkSpeechHold=()=>{};
 export const cloudSpeechLimited=()=>false;
 export const setVoiceSendPolicyForTests=()=>false;
 `}));
 // Both development transports can exist; the selected account must decide the route.
 await page.route('**/src/runtime/development-cartesia-flag.ts*',request=>request.fulfill({contentType:'application/javascript',body:'export const developmentCartesiaVoiceEnabled=true;'}));
 await page.route('**/src/runtime/development-cloud-voice.ts*',request=>request.fulfill({contentType:'application/javascript',body:'export const developmentCloudVoiceEnabled=true;export const developmentCloudRealtimeVoiceEnabled=false;'}));
 await page.route('**/src/runtime/cloud-voice.ts*',request=>request.fulfill({contentType:'application/javascript',body:`
 export const cloudVoiceFailure=()=>null;
 export const cloudVoiceServiceLimit=()=>null;
 export const readNativeCloudStreamTiming=async()=>null;
 export const nativeCloudStreamingAvailable=()=>false;
 export const createCloudStreamingSpeech=()=>null;
 export const speakCloudText=async()=>{};
 export function createCloudVoice(route='cloud'){return {speak:async(text,signal,started)=>{window.readAloudProof={route,text};started();await new Promise(resolve=>{window.finishReadAloud=resolve;signal.addEventListener('abort',resolve,{once:true});});}};}
 `}));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {Component}=await import('/src/prototype/model.js'),{connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const render=Component.prototype.renderVals;Component.prototype.renderVals=function(){(window as any).readAloudShell=this;return render.call(this);};c.close();
 });
 await expect.poll(()=>page.evaluate(()=>!!(window as any).readAloudShell)).toBe(true);
 await page.evaluate(()=>{const s=(window as any).readAloudShell;s.setState({chat:'full',msgs:[{id:'read-me',from:'agent',text:'Here is the message to read.'}]});});
 await page.locator('[data-alpha-message-text]').click();
 await page.getByRole('menuitem',{name:'Read aloud',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).readAloudProof)).toEqual({route,text:'Here is the message to read.'});
 await page.getByRole('menuitem',{name:'Stop reading',exact:true}).click();
 await expect(page.getByRole('menuitem',{name:'Read aloud',exact:true})).toBeVisible();
});
