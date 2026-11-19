import test from 'node:test';
import assert from 'node:assert/strict';
import {agentMapsShowable} from '../apps/app/src/maps/agent-present.ts';

const open={live:true,hidden:false,suspended:false,assistantSurface:false,connectionOpen:false,screen:'home',secure:false,shade:false};

// v612 on the owner's Pixel: "directions to Coit Tower" from the chat over Phone replied "Maps could not be
// shown on the phone right now" because Phone (and Camera) were views an agent request never replaced.
test('a chat directions request brings Maps forward over Home, Maps or any open app, Phone and Camera included',()=>{
 for(const view of [undefined,null,'home','maps','browser','notes','inbox','calendar','phone','camera','messages','contacts'])
  assert.equal(agentMapsShowable({...open,view}),true,String(view));
});

test('a ringing call, and locked, hidden or sensitive screens, keep the screen',()=>{
 for(const view of ['phone','browser'])assert.equal(agentMapsShowable({...open,view,incomingCall:true}),false,view);
 for(const change of [{live:false},{hidden:true},{suspended:true},{assistantSurface:true},{connectionOpen:true},{screen:'lock'},{secure:true},{shade:true},{view:7}])
  assert.equal(agentMapsShowable({...open,view:'browser',...change}),false,JSON.stringify(change));
 assert.equal(agentMapsShowable(undefined),false);
});
