import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {captureInputs,checkTraces,qset,qmap} from '../check-traces.mjs';
import {attachmentPickerFixture,attachmentPickerSources} from '../../../../test/fixtures/attachment-picker.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const action=(name,...args)=>({name,args});
function observation(f){
 const value=f.modelState(),out={};
 for(const [key,item] of Object.entries(value))out['s.'+key]=['selected','selecting','reading','admitted'].includes(key)?qset(item):['ticketEpochs','ticketScopes'].includes(key)?qmap(item):item;
 return out;
}
export async function checkAttachmentPicker(extraSources=[]){
 const sources=[...attachmentPickerSources,fileURLToPath(import.meta.url),join(root,'apps/app/src/prototype/chat-tools-adapter.ts'),join(root,'apps/app/src/browser/file-picker.ts'),join(root,'android/app/src/main/java/ai/elizaresearch/alphaphone/AlphaFilesPlugin.java'),join(root,'specs/quint/refinement/application/index.mjs'),...extraSources];
 const driverHashes=captureInputs(sources),traces=[];
 async function scenario(name,options,drive){
  const f=attachmentPickerFixture(options),trace={name,expect:observation(f),steps:[]};
  const advance=async(label,actions,transition)=>{await transition();trace.steps.push({label,action:actions,expect:observation(f)});};
  await advance('Open owned local picker',action('open'),f.open);await advance('Browse actual Files port',action('browseFiles'),f.files);await advance('Select one displayed file',action('toggle',0),f.select);
  await drive(f,advance);traces.push(trace);
 }
 const start=(f,a,ticket=1)=>a('Native selection returns its opaque grant',[action('attach'),action('selectionReply',ticket)],f.attach);
 await scenario('owned selection queues only on successful byte read',{holdRead:true},async(f,a)=>{await start(f,a);await a('Fair native reply releases grant and returns exact selected bytes',action('readReply',1,true),f.releaseRead);});
 for(const kind of ['cancel','switchOwner','switchConversation','hide'])await scenario('read retired by '+kind,{holdRead:true},async(f,a)=>{
  await start(f,a);await a('Retire the owner-bound picker',action(kind.startsWith('switch')?'switchScope':'cancel'),f[kind]);await a('Late native reply cannot queue bytes',action('readReply',1,true),f.releaseRead);
 });
 await scenario('old selection cannot start a read in a new picker',{holdSelect:true},async(f,a)=>{
  await a('Hold native selection completion',action('attach'),f.attach);await a('Cancel old picker',action('cancel'),f.cancel);await a('Reopen with a new epoch',action('open'),f.open);await a('Browse in new epoch',action('browseFiles'),f.files);await a('Old grant is released without reading',action('selectionReply',1),f.releaseSelect);await a('Close new empty picker',action('cancel'),f.cancel);
 });
 await scenario('old read cannot erase a newer successful selection',{holdRead:true},async(f,a)=>{
  await start(f,a);await a('Cancel old picker',action('cancel'),f.cancel);await a('Open successor',action('open'),f.open);await a('Browse successor',action('browseFiles'),f.files);await a('Choose successor file',action('toggle',0),f.select);await start(f,a,2);await a('New reply completes first',action('readReply',2,true),()=>f.releaseRead(true,1));await a('Old reply releases only its own grant',action('readReply',1,true),f.releaseRead);
 });
 await scenario('failed read can retry without retaining its old grant',{holdRead:true},async(f,a)=>{
  await start(f,a);await a('Native read fails',action('readReply',1,false),()=>f.releaseRead(false));await start(f,a,2);await a('Explicit retry completes',action('readReply',2,true),f.releaseRead);
 });
 return checkTraces({model:'ChatAttachmentPicker',sources,driverHashes,traces,scope:'bounded-component',assumptions:[
  'The actual picker class executes through closed metadata, opaque-selection and byte-read ports. No transport/model/provider send is supplied.',
  'Two binding classes, two selected-file slots, three tickets and six picker epochs. Traces use one file per ticket; the ticket abstracts serial materialization of a captured multi-file selection.',
  'Native callbacks eventually return under explicit weak fairness. Cancel does not claim to stop an already executing platform read; its returned bytes are discarded and grant released.',
  'Native authorization, byte/MIME/count limits, directory/search presentation, actual Android permissions and final composer binding remain separate shared/browser/device obligations.',
 ]});
}
