import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({stdin:{contents:"export {AssistantDraftController} from './apps/app/src/prototype/assistant-draft-controller.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const {AssistantDraftController}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
for(const savedText of ['', 'Other unsent words'])test(`opening with typed text and ${savedText?'nonempty':'empty'} saved copy`,async()=>{
 let text='My current words',saved={version:1,binding:'one',revision:'1',text:savedText};
 const store={read:async()=>saved,save:async(expected,next)=>{assert.deepEqual(expected,saved);return saved={...saved,revision:'2',text:next};}};
 const controller=new AssistantDraftController(async()=>store,()=>text,value=>{text=value;},()=>{});
 await controller.open('one');await tick();
 assert.equal(text,'My current words');
 assert.equal(controller.state.conflict,!!savedText);
 assert.equal(saved.text,savedText||text);
});
test('an empty unsettled send is never silently treated as an ordinary draft',async()=>{
 let text='Keep current',saved={version:1,binding:'one',revision:'1',text:'',sending:true};
 const controller=new AssistantDraftController(async()=>({read:async()=>saved,save:async()=>{throw Error('must not write');}}),()=>text,value=>{text=value;},()=>{});
 await controller.open('one');assert.equal(text,'Keep current');assert.equal(controller.state.conflict,true);assert.equal(controller.state.unsettled,true);
});
