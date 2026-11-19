import test from 'node:test';
import assert from 'node:assert/strict';
import {agentMapsShowable} from '../apps/app/src/maps/agent-present.ts';

const open={live:true,hidden:false,suspended:false,assistantSurface:false,connectionOpen:false,screen:'home',secure:false,shade:false};

test('a chat directions request brings Maps forward over Home, Maps or an open app such as Browser',()=>{
 for(const view of [undefined,null,'home','maps','browser','notes','inbox','calendar'])
  assert.equal(agentMapsShowable({...open,view}),true,String(view));
});

test('camera and dialer views, and locked, hidden or sensitive screens, keep the screen',()=>{
 for(const view of ['camera','phone'])assert.equal(agentMapsShowable({...open,view}),false,view);
 for(const change of [{live:false},{hidden:true},{suspended:true},{assistantSurface:true},{connectionOpen:true},{screen:'lock'},{secure:true},{shade:true},{view:7}])
  assert.equal(agentMapsShowable({...open,view:'browser',...change}),false,JSON.stringify(change));
 assert.equal(agentMapsShowable(undefined),false);
});
