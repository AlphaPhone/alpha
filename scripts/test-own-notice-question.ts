import assert from 'node:assert/strict';
import {noticeQuestionFile,reviewOwnNoticeQuestion} from '../apps/app/src/prototype/own-notice-question.ts';

const window = new EventTarget();
Object.defineProperty(globalThis,'window',{value:window,configurable:true});
const tick = () => new Promise(resolve=>setImmediate(resolve));

const longNotice='Public meeting agenda. '.repeat(120);
assert.equal((await noticeQuestionFile('Notice.txt',longNotice)?.text())?.length,2_000);
assert.equal(noticeQuestionFile('Notice.txt',longNotice+'Verification code 123456'),undefined);

function fixture(){
 let current=true,accepted=true,recheck=true,reads=0,consumed=0,closed=0;
 const drafts: {name:string;text:string;prompt?:string}[]=[];
 const reports: string[]=[];
 const options: Parameters<typeof reviewOwnNoticeQuestion>[0]={
  notice:{source:'own',id:'reminder',revision:'a'.repeat(64),title:'Owned reminder',text:'Prepare the meeting',appLabel:'Alpha Phone'},
  current:()=>current,recheck:async()=>{reads++;return recheck;},consume:async()=>{consumed++;},
  async attach(selection){
   const file=await selection.read(selection.current);
   if(!file||!accepted||!selection.current()||!await selection.commit?.(selection.current))return false;
   drafts.push({name:file.name,text:await file.text(),prompt:selection.prompt});
   return true;
  },
  report:text=>{reports.push(text);},closed:()=>{closed++;},
 };
 return {options,ask:()=>reviewOwnNoticeQuestion(options),state:()=>({reads,consumed,closed,drafts,reports}),
  change:()=>{current=false;},stale:()=>{recheck=false;},admit:(value:boolean)=>{accepted=value;}};
}
{
 const f=fixture();f.admit(false);f.ask();await tick();
 assert.deepEqual(f.state(),{reads:0,consumed:0,closed:1,drafts:[],reports:[]});
 f.admit(true);f.ask();await tick();assert.equal(f.state().consumed,1);
 assert.deepEqual(f.state().drafts,[{name:'Alpha Phone notification.txt',text:'Owned reminder\nPrepare the meeting',prompt:'Help me with this notification.'}]);
 assert.equal(f.state().closed,2);
}
{
 const f=fixture();f.options.notice.text='Verification code 123456';assert.equal(f.ask(),undefined);
 assert.deepEqual(f.state(),{reads:0,consumed:0,closed:0,drafts:[],reports:['Unavailable']});
}
{
 const f=fixture();f.stale();f.ask();await tick();assert.equal(f.state().consumed,0);
 assert.deepEqual(f.state().drafts,[]);assert.deepEqual(f.state().reports,['This notification changed.']);
}
{
 const f=fixture();const check=Promise.withResolvers<boolean>();f.options.recheck=()=>check.promise;
 f.ask();await tick();window.dispatchEvent(new Event('launcher-home'));check.resolve(true);await tick();
 assert.equal(f.state().consumed,0);assert.deepEqual(f.state().drafts,[]);assert.equal(f.state().closed,1);
}
{
 const f=fixture();const consumption=Promise.withResolvers<void>();let calls=0;
 f.options.consume=()=>{calls++;return consumption.promise;};
 const close=f.ask();assert.ok(close);await tick();close();consumption.resolve();await tick();
 assert.equal(calls,1);assert.deepEqual(f.state().drafts,[]);assert.deepEqual(f.state().reports,[]);assert.equal(f.state().closed,1);
}
{
 const f=fixture();const consumption=Promise.withResolvers<void>();f.options.consume=()=>consumption.promise;
 f.ask();await tick();f.change();consumption.resolve();await tick();
 assert.deepEqual(f.state().drafts,[]);assert.deepEqual(f.state().reports,['Couldn’t keep']);
}
{
 const f=fixture();f.options.notice.source='third-party';assert.equal(f.ask(),undefined);
 assert.deepEqual(f.state().reports,['Unavailable']);
}
console.log('PASS own-notice attachment admission, cancellation, source and owner fences');
