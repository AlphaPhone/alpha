import {expect,test,type Page} from '@playwright/test';
import {fenceNetwork,flagOffAndroid,residentHome} from './flag-off-android';

// The shipped renderer, ProviderKeys and real connection controller run together.
// Only the native boundary is synthetic. Status publishes the edited revision
// before Agent.start resolves, reproducing the reconnect race; no provider/device use.
async function fixture(page:Page){
 await fenceNetwork(page);await flagOffAndroid(page);
 await page.addInitScript(()=>{
  const w=window as any,base=w.Capacitor.nativePromise;
  let revision='own-start',voice=true;const leases=new Set<string>();
  const f=w.keyReconnect={hold:false,starting:false,release:null as null|(()=>void),cancels:0,edits:0,removes:0};
  const status=()=>({mode:'own',provider:'cerebras',configured:true,selected:true,model:'qwen-3.8-27b',voiceConfigured:voice,revision,persistence:'native-secure-store',keys:{text:{configured:true},voice:{configured:voice}}});
  const agent=w.Capacitor.PluginHeaders.find((p:any)=>p.name==='Agent');
  for(const name of ['prepareProviderConfiguration','cancelProviderConfiguration','editProviderKeys','removeProviderKey','cancelStart'])if(!agent.methods.some((m:any)=>m.name===name))agent.methods.push({name,rtype:'promise'});
  if(!w.Capacitor.PluginHeaders.some((p:any)=>p.name==='AlphaHostedResults'))w.Capacitor.PluginHeaders.push({name:'AlphaHostedResults',methods:[{name:'disableBackground',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'callback'}]});
  w.Capacitor.nativePromise=async(plugin:string,method:string,input:any)=>{
   if(plugin==='AlphaHostedResults'&&method==='disableBackground')return {};
   if(plugin!=='Agent')return base(plugin,method,input);
   if(method==='providerStatus')return status();
   if(method==='prepareProviderConfiguration'){const requestId=crypto.randomUUID();leases.add(requestId);return {requestId};}
   if(method==='cancelProviderConfiguration'){leases.delete(input.requestId);return {};}
   if(method==='editProviderKeys'||method==='removeProviderKey'){
    if(!leases.delete(input.requestId)||input.expectedRevision!==revision)throw Error('Stale key request');
    if(method==='editProviderKeys'){if(typeof input.voiceKey!=='string'||input.textKey!==undefined)throw Error('Wrong independent edit');f.edits++;}
    else{if(input.key!=='voice')throw Error('Wrong key removal');voice=false;f.removes++;}
    revision=crypto.randomUUID();return status();
   }
   if(method==='start'&&f.hold){f.starting=true;await new Promise<void>(resolve=>f.release=resolve);f.starting=false;}
   if(method==='cancelStart'){f.cancels++;return {};}
   return base(plugin,method,input);
  };
 });
}
test('Voice key replacement survives status publication during reconnect',async({page})=>{
 await fixture(page);await residentHome(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Account',exact:true}).click();
 await page.getByRole('button',{name:/^AI (Cloud|Own keys)$/}).click();
 const panel=page.getByRole('dialog',{name:'AI connection',exact:true});await expect(panel).toBeVisible();
 await panel.getByRole('button',{name:'Direct',exact:true}).click();
 const voice=panel.getByLabel('Voice key',{exact:true});
 await page.evaluate(()=>{(window as any).keyReconnect.hold=true;});
 await voice.fill('synthetic-new-voice-key');
 await panel.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).keyReconnect.starting)).toBe(true);
 await expect(voice).toHaveValue('');
 expect(await page.evaluate(()=>(window as any).keyReconnect.cancels)).toBe(0);
 await page.evaluate(()=>{const f=(window as any).keyReconnect;f.hold=false;f.release();});
 await expect(panel.getByRole('button',{name:'Save',exact:true})).toBeEnabled();
 await expect(voice).toHaveValue('');
 await panel.getByRole('button',{name:'Close Account',exact:true}).click();
 await expect(panel).not.toBeVisible();
 expect(await page.evaluate(()=>(window as any).keyReconnect.edits)).toBe(1);
 expect(await page.evaluate(()=>(window as any).keyReconnect.removes)).toBe(0);
 expect(await page.evaluate(()=>(window as any).keyReconnect.cancels)).toBe(0);
 await expect(page.locator('body')).not.toContainText('synthetic-new-voice-key');
});
test('A saved voice key can be removed after an explicit second step, and the panel opens on the provider in use',async({page})=>{
 await fixture(page);await residentHome(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Account',exact:true}).click();
 await page.getByRole('button',{name:/^AI (Cloud|Own keys)$/}).click();
 const panel=page.getByRole('dialog',{name:'AI connection',exact:true});await expect(panel).toBeVisible();
 // Direct is in use, so its tab is shown without the owner choosing it.
 await expect(panel.getByRole('button',{name:'Direct',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(panel.getByRole('button',{name:'Switch to Cloud',exact:true})).toHaveCount(0);
 await panel.getByRole('button',{name:'Remove saved voice key',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).keyReconnect.removes)).toBe(0);
 const confirm=panel.getByRole('group',{name:'Remove voice key?',exact:true});
 await confirm.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).keyReconnect.removes)).toBe(0);
 await panel.getByRole('button',{name:'Remove saved voice key',exact:true}).click();
 await confirm.getByRole('button',{name:'Remove voice key',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).keyReconnect.removes)).toBe(1);
 await expect(panel.getByRole('button',{name:'Remove saved voice key',exact:true})).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Remove saved text key',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).keyReconnect.edits)).toBe(0);
});
