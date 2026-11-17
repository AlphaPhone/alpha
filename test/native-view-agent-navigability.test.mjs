import test from 'node:test';
import assert from 'node:assert/strict';
import {imageNativeViewDeclarationsJson,nativeViewDeclarationsJson} from '../scripts/native-view-policy.ts';
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
// Upstream keeps a native counterpart only beside an OWNER-gated plugin view. The pinned Inbox
// and Maps plugin views carry no role gate, so they replace Alpha's fallback with a hosted view
// that has no bundle on the phone. Remove an id from this list once the pin carries the fix; the
// todo then becomes an ordinary test.
const PENDING_UPSTREAM_PIN=['inbox','maps'];
for(const [name,policy] of [['stock',nativeViewDeclarationsJson],['image',imageNativeViewDeclarationsJson]])for(const declared of JSON.parse(policy)){
 const pending=PENDING_UPSTREAM_PIN.includes(declared.id);
 test(`${name} policy: the agent can open ${declared.id} by id, label and alias with its plugin loaded and no hosted bundle`,pending?{todo:'needs the upstream pin to keep the native counterpart of an ungated plugin view'}:{},async()=>{
  for(const pluginsFirst of [false,true]){
   const views=await destinations(policy,pluginsFirst);
   for(const spoken of [declared.id,declared.label,...declared.aliases??[]])
    assert.deepEqual(api.resolveViewNavigationTargets(views,spoken).map(match=>match.view.id),[declared.id],`"${spoken}", plugins first=${pluginsFirst}`);
  }
 });
}
