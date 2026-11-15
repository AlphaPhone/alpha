import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {captureInputs,checkTraces} from '../check-traces.mjs';
import {stripTypeScriptTypes} from '../../../../test/support/strip-types.mjs';
import {attachmentPickerFixture,attachmentPickerSources} from '../../../../test/fixtures/attachment-picker.mjs';
const source=fileURLToPath(new URL('../../../../apps/app/src/prototype/chat-tools-adapter.ts',import.meta.url));
const sources=[...new Set([source,...attachmentPickerSources,fileURLToPath(import.meta.url)])];
function fixture(){
 let generation=0,held=0,completeSearch,timer;
 const files=attachmentPickerFixture({holdRead:true});
 const connectionController={getSnapshot:()=>({session:{ownerId:generation}}),getSelectedConversationId:()=> 'chat',searchMessages:()=>{held=generation;return new Promise(resolve=>{completeSearch=resolve;});}};
 const code=stripTypeScriptTypes(readFileSync(source,'utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),{mode:'strip'});
 class Component {constructor(){this.live=true;this.state={msgs:[]};}renderVals(){return {};}setState(next){Object.assign(this.state,typeof next==='function'?next(this.state):next);this.output=this.renderVals();}S(){return this.state;}}
 new Function('connectionController','createInlineModal','runFilePicker','ChatAttachmentPicker','intakeAttachmentFiles','CHAT_UPLOAD_ACCEPT','MAX_CHAT_IMAGES','clearTimeout','setTimeout',code+';return installChatTools;')(connectionController,()=>({ref(){}}),choose=>choose(new AbortController().signal),function Picker(changed){return files.createPicker(changed);},async files=>({attachments:await Promise.all(files.map(async file=>({name:file.name,mimeType:file.type,data:Buffer.from(await file.arrayBuffer()).toString('base64')}))),droppedTooLarge:[],droppedOverCount:[]}), 'text/plain',4,()=>{},fn=>{timer=fn;return 1;})(Component);
 const shell=new Component();shell.setState({});
 const observe=()=>({'s.generation':generation,'s.held':held,'s.picker':!!shell.chatFileBusy,'s.search':!!shell.chatSearchOpen,'s.pending':!!shell.chatSearchBusy,'s.results':!!shell.chatSearchResults?.length,'s.attached':!!shell.fileAttachments?.length});
 const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
 return {observe,async chooseFile(){held=generation;shell.output.chatTools.upload();await files.files();files.select(0);await files.attach();},async finishPicker(ok){if(!ok)await files.cancel();await files.releaseRead(ok);await settle();assert.equal(files.leases.size,0,'the completed native read releases its selection grant');},async openSearch(){shell.output.chatTools.search();},async query(){shell.output.chatSearch.change({target:{value:'needle'}});timer();},async reply(){completeSearch([{messageId:'one',text:'needle',createdAt:0}]);await settle();},async closeSearch(){shell.output.chatSearch.close();},async retire(){generation++;shell.setState({});await settle();}};
}
export async function checkChatTools(){
 const driverHashes=captureInputs(sources),traces=[];
 for(const [name,steps] of [['current file chooser',['chooseFile','finishPicker']],['current search',['openSearch','query','reply']],['retired search',['openSearch','query','retire','reply']],['cancelled search',['openSearch','query','closeSearch']],['retired file chooser',['chooseFile','retire','finishPicker']]]){
  const f=fixture(),trace={name,expect:f.observe(),steps:[]};
  for(const step of steps){await f[step](true);trace.steps.push({action:{name:step,args:step==='finishPicker'?[true]:[]},expect:f.observe()});}
  if(name.startsWith('retired'))assert(!f.observe()['s.results']&&!f.observe()['s.attached']);
  traces.push(trace);
 }
 return checkTraces({model:'ChatTools',sources,driverHashes,traces,scope:'bounded-component',assumptions:['The actual composer adapter and shared picker run with controlled storage bytes, intake formatting, search and shell ports.','One pending operation and two owner generations. Browser rendering, native chooser and provider processing have separate live checks.']});
}
