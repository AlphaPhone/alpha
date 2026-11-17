import test from 'node:test';
import assert from 'node:assert/strict';
import {imageNativeViewDeclarationsJson,nativeViewDeclarationsJson} from '../scripts/native-view-policy.ts';
import {build} from 'esbuild';
import {upstreamPlugin,upstreamViews as api} from './fixtures/upstream-view-registry.mjs';

// The resident's own registry decides what "open maps" can reach. On the phone no hosted view
// bundle is packaged, so a destination is reachable only through Alpha's native declaration.
// These are the view plugins the resident loads on every platform (upstream core-plugins.ts).
const plugins=await Promise.all(['plugin-inbox','plugin-notes','plugin-maps','plugin-calendar'].map(upstreamPlugin));
async function destinations(policy,pluginsFirst){
 process.env[api.NATIVE_VIEW_DECLARATIONS_ENV]=policy;
 const runtime={reportError(){},logger:console};
 if(!pluginsFirst)api.registerBuiltinViews(runtime);
 for(const plugin of plugins)await api.registerPluginViews(runtime,plugin,{pluginDir:'/no-packaged-view-bundle'});
 if(pluginsFirst)api.registerBuiltinViews(runtime);
 return api.listViews(runtime,{viewType:'gui'}).filter(view=>api.viewNavigationAvailable(view,true));
}
// Upstream keeps a native counterpart only beside an OWNER-gated plugin view, which every
// pinned view plugin Alpha declares a fallback for now is.
for(const [name,policy] of [['stock',nativeViewDeclarationsJson],['image',imageNativeViewDeclarationsJson]])for(const declared of JSON.parse(policy)){
 test(`${name} policy: the agent can open ${declared.id} by id, label and alias with its plugin loaded and no hosted bundle`,async()=>{
  for(const pluginsFirst of [false,true]){
   const views=await destinations(policy,pluginsFirst);
   for(const spoken of [declared.id,declared.label,...declared.aliases??[]])
    assert.deepEqual(api.resolveViewNavigationTargets(views,spoken).map(match=>match.view.id),[declared.id],`"${spoken}", plugins first=${pluginsFirst}`);
  }
 });
}

// The phone's half: the view profile it enrols (device-view-profile.ts over the pinned
// DEVICE_VIEWS) and the renderer its navigation lands on, loaded fresh for each install. The
// verified image is the Android bridge with the image-only telephony plugin (runtime/aosp-image.ts).
async function phone(image){
 const saved=[globalThis.Capacitor,globalThis.androidBridge];
 if(image)Object.assign(globalThis,{androidBridge:{},Capacitor:{PluginHeaders:[{name:'AlphaTelephony',methods:[{name:'imageCapability'}]}]}});
 try{
  const result=await build({stdin:{contents:`export {negotiateEnabledViews} from './apps/app/src/runtime/device-view-profile.ts';export {admitImageContacts} from './apps/app/src/prototype/mvp-features.ts';export {alphaViewKey,alphaViewPaths} from './apps/app/src/product/alpha-product.ts';export {DEVICE_VIEWS} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/contract.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',
   // An import of identical text would return the other install's module instance.
   banner:{js:`// image=${image}`}});
  return await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 }finally{[globalThis.Capacitor,globalThis.androidBridge]=saved;}
}
async function enrolled(app){
 let views;
 await app.negotiateEnabledViews(1,async(_path,body)=>body?(views=body.views,{version:1,profile:{version:1,revision:'11111111-1111-4111-8111-111111111111',views}}):{version:1,profile:null,supportedViews:[...app.DEVICE_VIEWS]},new AbortController().signal);
 return views;
}
const EVERYWHERE=['inbox','calendar','browser','camera','photos','maps','notes','files','workflows','settings'],IMAGE_ONLY=['phone','messages','contacts'];
for(const [name,policy,image] of [['a standalone install',nativeViewDeclarationsJson,false],['the verified image',imageNativeViewDeclarationsJson,true]])
 test(`on ${name} the enrolled view profile lets chat open exactly the destinations this phone draws`,async()=>{
  const app=await phone(image);
  // What the agent resolves for a spoken destination under the profile, and where Alpha lands it.
  const opened=async spoken=>{
   const profile=await enrolled(app),views=(await destinations(policy,true)).filter(view=>api.viewEnabledByProfile(view,profile));
   const matches=api.resolveViewNavigationTargets(views,spoken);
   return matches.length===1&&app.alphaViewPaths(matches[0].view.id).includes(matches[0].view.path)?app.alphaViewKey(matches[0].view.id):undefined;
  };
  for(const view of EVERYWHERE)assert.equal(await opened(view),view);
  // Contacts joins the profile only once the image admits its adapter.
  for(const view of IMAGE_ONLY)assert.equal(await opened(view),image&&view!=='contacts'?view:undefined,view);
  if(!image)return;
  app.admitImageContacts(true);
  assert.equal(await opened('contacts'),'contacts');
 });
