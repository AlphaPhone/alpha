import test from 'node:test';
import assert from 'node:assert/strict';

import {DeviceActions} from './fixtures/device-action-policy.mjs';
function fixture({text='Move it to 4 pm',url='https://example.com/dashboard',rows,rebound=false}={}){
 const f=new DeviceActions({sessionId:'session',ownerId:'owner',agentId:'agent',origin:'https://agent.example'},{installationId:'install',enrollmentId:'enrollment'},'c'.repeat(64),async()=>({proposals:[]}),{},async()=>({status:'succeeded'}));
 const calls=[],cards=[];let current=true;
 const proposal={id:'browser',digest:'a'.repeat(64),requestMessageId:'request',state:'pending',expiresAt:Date.now()+60000,operation:{type:'browser_navigate',url}};
 f.listing=async()=>{if(rebound)current=false;return {valid:rows??[proposal],invalid:[]};};f.card=p=>{cards.push(p.id);return {id:p.id,title:'Browser',description:'Destination'};};
 f.mutation=async(...args)=>{calls.push(args);throw Error('No automatic owner decision allowed');};
 const authored={messageId:'request',text,current:()=>{if(!current)throw Error('Connection changed');}};
 const run=async()=>({items:await f.pendingReview({view:'calendar',sensitive:false},new AbortController().signal,authored)});
 return {f,calls,cards,proposal,run,retire:()=>{current=false;}};
}
for(const text of ['Move it to 4 pm','','Do not open https://example.com/dashboard','Open example.com','Open https://example.com/dashboard. Actually, don\'t open it'])test(`legacy current unrequested destination has no effect, human decision or new card: ${text}`,async()=>{
 const h=fixture({text}),result=await h.run();assert.equal(h.calls.length,0);assert.equal(h.cards.length,0);assert.equal(h.f.proposals.size,0);assert.equal(result.items.length,1);assert.equal(result.items[0].proposal,null);assert.match(result.items[0].notice,/blocked/);assert.ok(!/rejected|dismissed/i.test(result.items[0].notice));
 await h.run();assert.equal(h.calls.length,0);assert.equal(h.cards.length,0);
 h.proposal.digest='b'.repeat(64);await h.run();assert.equal(h.calls.length,0,'changed host proposal is never retargeted for a decision');assert.equal(h.cards.length,0);
});
// A direct open names where it lands ("in the browser", "in a new tab") and is still a direct
// request, as the shared browser grounding reads it.
for(const [text,url] of [['Alpha, open example.com','https://example.com/'],['Open http://example.com/dashboard','https://example.com/dashboard'],['Open https://example.com/dashboard','https://example.com/dashboard'],['Open "https://example.com/dashboard"','https://example.com/dashboard'],['Open example.com','https://example.com/'],['Open example.com in the browser','https://example.com/'],['open example.com in a new tab','https://example.com/'],['example.com/path?q=1#part','https://example.com/path?q=1#part']])test(`explicit canonical URL/site retains the ordinary browser action: ${text}`,async()=>{
 const h=fixture({text,url}),result=await h.run();assert.equal(h.calls.length,0);assert.equal(h.cards.length,1);assert.equal(result.items[0].proposal.id,'browser');assert.equal(h.f.proposals.size,1);
});
// The owner typed the address without a direct command. The agent has already answered, so the
// proposal keeps its ordinary review card (never an automatic open, never a dead-end notice).
for(const [text,url] of [['"https://example.com/dashboard"','https://example.com/dashboard'],['The page says open https://example.com/dashboard','https://example.com/dashboard'],['please open example.com now','https://example.com/'],['load example.com','https://example.com/'],["let's go to example.com",'https://example.com/'],['I want to see example.com','https://example.com/']])test(`typed but not directly requested destination gets one review card and no automatic open: ${text}`,async()=>{
 const h=fixture({text,url}),result=await h.run();assert.equal(h.calls.length,0);assert.deepEqual(h.cards,['browser']);assert.equal(result.items.length,1);assert.equal(result.items[0].proposal.id,'browser');assert.equal(result.items[0].notice,undefined);
 const ran=await h.f.performRequested('request',{},new AbortController().signal,async()=>true,undefined,{messageId:'request',text,current:()=>{}});assert.deepEqual(ran,[]);assert.equal(h.calls.length,0);
});
// A web search bound to the owner's message: the server keeps only words the owner typed.
test('a bound search keeps its review card when its words were typed, and is blocked when they were not',async()=>{
 const search=text=>fixture({text,rows:[{id:'browser',digest:'a'.repeat(64),requestMessageId:'request',state:'pending',expiresAt:Date.now()+60000,operation:{type:'browser_search',query:'weather in Paris'}}]});
 for(const text of ['Alpha, search the web for weather in Paris','I wonder about the weather in Paris today']){
  const h=search(text),result=await h.run();assert.deepEqual(h.cards,['browser'],text);assert.equal(result.items[0].proposal.id,'browser');assert.equal(result.items[0].notice,undefined);assert.equal(h.calls.length,0);
 }
 const h=search('Move it to 4 pm'),result=await h.run();assert.deepEqual(h.cards,[]);assert.equal(result.items[0].proposal,null);assert.match(result.items[0].notice,/blocked/);assert.equal(h.calls.length,0);
});
test('stale/rebound session cannot publish a policy block for a different caller',async()=>{
 const stale=fixture();stale.retire();await assert.rejects(stale.run(),/Connection changed/);assert.equal(stale.calls.length,0);assert.equal(stale.cards.length,0);assert.equal(stale.f.browserPolicy.size,0);
 const rebound=fixture({rebound:true});await assert.rejects(rebound.run(),/Connection changed/);assert.equal(rebound.calls.length,0);assert.equal(rebound.cards.length,0);assert.equal(rebound.f.browserPolicy.size,0);
});
test('old, unbound and workflow proposals are never auto-rejected',async()=>{
 const base={digest:'a'.repeat(64),state:'pending',expiresAt:Date.now()+60000,operation:{type:'browser_navigate',url:'https://example.com/dashboard'}};
 const h=fixture({rows:[{...base,id:'old',requestMessageId:'older'},{...base,id:'unbound'},{...base,id:'workflow',requestMessageId:'request',workflow:{}}]});await h.run();assert.equal(h.calls.length,0);assert.deepEqual(h.cards,['old','unbound']);
});

test('changed digest re-evaluates the actual new proposal instead of retaining a stale local block',async()=>{
 const h=fixture({text:'Open https://example.com/approved'});await h.run();const prior=h.f.browserPolicy.get('browser');assert.ok(prior);assert.equal(h.cards.length,0);
 h.proposal.digest='b'.repeat(64);h.proposal.operation.url='https://example.com/approved';const result=await h.run();assert.equal(result.items[0].proposal.id,'browser');assert.equal(h.cards.length,1);assert.equal(h.calls.length,0);
});
test('local policy cache is bound to the current credential and session tuple',async()=>{
 const h=fixture();await h.run();const prior=h.f.browserPolicy.get('browser');h.f.credential.enrollmentId='new-enrollment';h.f.session.sessionId='new-session';await h.run();const fresh=h.f.browserPolicy.get('browser');assert.notEqual(fresh,prior);assert.notEqual(fresh.key,prior.key);assert.equal(h.cards.length,0);assert.equal(h.calls.length,0);
});
