import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';

// CHAT-07: New chat and Chat history are in the chat's own actions menu, not only in Settings.
const imports=new Map([
 ['../runtime/connection-ui','export const connectionController=__ports.connection;'],
 ['../runtime/inline-modal','export const createInlineModal=()=>({ref(){}});'],
 ['@capacitor/core','export const Capacitor={isNativePlatform:()=>__ports.native};'],
 ['../build-flags','export const testMocksEnabled=__ports.testMocks;'],
]);
const compiled=await build({
 entryPoints:['apps/app/src/prototype/chat-tools-adapter.ts'],bundle:true,platform:'node',format:'cjs',write:false,
 plugins:[{name:'chat-tools-ports',setup(builder){
  builder.onResolve({filter:/.*/},args=>imports.has(args.path)?{path:args.path,namespace:'ports'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'ports'},args=>({contents:imports.get(args.path),loader:'js'}));
 }}],
});

function fixture({native=true,testMocks=false,session={sessionId:'s'},busy=false,attachments=[],msgs}={}){
 const calls=[];
 const connection={
  getSnapshot:()=>({session,busy}),getCloudEnvironment:()=>null,getCloudClient:()=>null,getSelectedConversationId:()=>'c',
  newConversation:async()=>{calls.push('new');},open:()=>{calls.push('panel');},searchMessages:async()=>[],restoreHistory:async()=>{},
 };
 const ports={connection,native,testMocks};
 globalThis.__ports=ports;globalThis.document={hidden:false,querySelector:()=>null};
 const module={exports:{}};
 new Function('module','exports','require','__ports',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url),ports);
 class Component{renderVals(){return msgs?{msgs}:{};}}
 module.exports.installChatTools(Component);
 const shell=Object.assign(new Component(),{live:true,fileAttachments:attachments,S:()=>({}),setState(){},toast:text=>calls.push(['toast',text]),openView:(view,patch)=>calls.push(['view',view,patch])});
 return {shell,calls,menu:()=>shell.renderVals().chatTools};
}

test('on the phone, Chat history opens Agent activity and New chat starts a conversation',()=>{
 const {menu,calls}=fixture();
 const tools=menu();
 assert.equal(tools.canNewChat,true);assert.equal(tools.hasHistory,true);
 tools.history();tools.newChat();
 assert.deepEqual(calls,[['view','settings',{page:'agent-activity'}],'new']);
});

test('test builds open the agent connection panel for history',()=>{
 const {menu,calls}=fixture({native:false,testMocks:true});
 menu().history();
 assert.deepEqual(calls,['panel']);
});

test('without an agent, while it is busy, or where no history surface exists, the entries are not offered',()=>{
 assert.equal(fixture({session:null}).menu().canNewChat,false);
 assert.equal(fixture({session:null}).menu().hasHistory,false);
 assert.equal(fixture({busy:true}).menu().canNewChat,false);
 assert.equal(fixture({native:false,testMocks:false}).menu().hasHistory,false);
});

test('New chat keeps a pending attachment instead of starting over',()=>{
 const {menu,calls}=fixture({attachments:[{id:'f'}]});
 menu().newChat();
 assert.deepEqual(calls,[['toast','Send or remove the attachment before starting a new chat.']]);
});

test('a reply or review card that says to check history links to it, and nothing else does',()=>{
 const msgs=[
  {id:'a',isAgent:true,displayText:'The screen opened, but the conversation response was interrupted. Check history before sending again.'},
  {id:'b',isAgent:true,displayText:'',c:{sub:'This request is no longer available to review. Check action history before trying again.'}},
  {id:'c',isAgent:true,displayText:'More than one Notes review was returned. Use action history.'},
  {id:'d',isAgent:true,displayText:'You can check your browser history in its settings.'},
  {id:'f',isAgent:true,displayText:'Response interrupted. Outcome unknown; check history before retrying.'},
  {id:'e',isUser:true,displayText:'Check history before sending again.'},
 ];
 const {shell,calls}=fixture({msgs});
 const shown=shell.renderVals().msgs;
 assert.deepEqual(shown.map(message=>typeof message.historyLink==='function'),[true,true,true,false,true,false]);
 shown[0].historyLink();
 assert.deepEqual(calls,[['view','settings',{page:'agent-activity'}]]);
 // Where no history surface exists the reply stays plain text.
 assert.equal(fixture({msgs,native:false,testMocks:false}).shell.renderVals().msgs.some(message=>message.historyLink),false);
 assert.equal(fixture({msgs,session:null}).shell.renderVals().msgs.some(message=>message.historyLink),false);
});
