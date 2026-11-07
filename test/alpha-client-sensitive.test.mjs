// The real AlphaClient refuses agent turns while a credential surface marks the context sensitive.
// One synthetic in-memory transport records every request; nothing leaves the process.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from 'tsx/esm/api';

const {AlphaClient,AlphaClientError}=await tsImport('../apps/app/src/runtime/alpha-client.ts',import.meta.url);

function transport(){
 const sent=[];
 return {sent,value:{
  session:{ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session',origin:'https://agent.example.test'},
  async send(input){sent.push(input.text);return {text:'Synthetic reply',proposals:[]};},
  async execute(){throw new Error('not used');},
 }};
}

test('send rejects with code sensitive and issues no request while the context is sensitive',async()=>{
 const client=new AlphaClient(),agent=transport();
 client.attachVerifiedTransport(agent.value);
 client.setViewContext({view:'passwords',sensitive:true});
 await assert.rejects(client.send('What is on screen?'),error=>error instanceof AlphaClientError&&error.code==='sensitive');
 assert.deepEqual(agent.sent,[]);
 assert.equal(client.getState().pending,false);
 // Leaving the credential surface lets the same connection send again.
 client.setViewContext({view:'settings'});
 assert.equal((await client.send('Hello')).text,'Synthetic reply');
 assert.deepEqual(agent.sent,['Hello']);
});
