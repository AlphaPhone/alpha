import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureInputs,checkTraces} from '../check-traces.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const entry='apps/app/src/prototype/chat-tools-adapter.ts';
export async function checkChatSearch(){
 const built=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,format:'iife',globalName:'actual',platform:'browser',metafile:true,
  plugins:[{name:'search-host-ports',setup(b){b.onResolve({filter:/^\.\.\/runtime\/(connection-ui|inline-modal)$/},a=>({path:a.path,namespace:'port'}));b.onLoad({filter:/.*/,namespace:'port'},()=>({contents:'module.exports=globalThis.ports;',loader:'js'}));}}]});
 const sources=[...Object.keys(built.metafile.inputs).filter(p=>!p.startsWith('port:')).map(p=>resolve(root,p)),fileURLToPath(import.meta.url),resolve(root,'test/quint-chat-search.test.mjs')];
 const driverHashes=captureInputs(sources),traces=[];
 for(const [name,steps] of [['current',['openSearch','query','reply']],['retired',['openSearch','query','retire','reply']],['cancelled',['openSearch','query','closeSearch','reply']]]){
  let owner=0,held=0,timer,complete;
  const document={hidden:false};
  const connectionController={getSnapshot:()=>({session:owner}),getCloudEnvironment:()=> 'closed',getCloudClient:()=>({sessionId:String(owner),credentialId:String(owner)}),getSelectedConversationId:()=> 'conversation',searchMessages:()=>new Promise(r=>{held=owner;complete=r;})};
  const ctx=vm.createContext({ports:{connectionController,createInlineModal:()=>({ref(){}})},document,AbortController,setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){}});
  vm.runInContext(built.outputFiles[0].text,ctx);
  class Shell {live=true;state={};S(){return this.state;}renderVals(){return {attachFiles(){}};}setState(){this.output=this.renderVals();}}
  ctx.actual.installChatTools(Shell);const shell=new Shell();shell.setState();
  const observe=()=>({'s.owner':owner,'s.held':held,'s.open':!!shell.chatSearchOpen,'s.pending':!!shell.chatSearchBusy,'s.results':!!shell.chatSearchResults?.length});
  const actions={openSearch(){shell.output.chatTools.search();},query(){shell.output.chatSearch.change({target:{value:'needle'}});timer();},async reply(){complete([{messageId:'message',text:'needle',createdAt:0}]);await new Promise(setImmediate);},closeSearch(){shell.output.chatSearch.close();},retire(){owner++;shell.setState();}};
  const trace={name,expect:observe(),steps:[]};
  for(const step of steps){await actions[step]();trace.steps.push({action:{name:step,args:[]},expect:observe()});}
  if(name!=='current')assert.equal(shell.chatSearchResults.length,0);
  traces.push(trace);
 }
 return checkTraces({model:'ChatSearch',sources,driverHashes,traces,scope:'bounded-component',assumptions:['The whole production chat-tools module runs with controlled shell, search transport, timer and modal ports.','One query and three owner generations. Storage and carrier effects are absent. DOM rendering, history restoration and native authorization need separate browser and device checks.']});
}
