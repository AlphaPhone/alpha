import type {SelectedChatFile} from './chat-attachment-files';
import {sensitiveReadingText} from '../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts';
import {noticeExcerpt,noticeReviewable,type Notice} from './context-selection';

export type AttachNoticeQuestion = (selection:SelectedChatFile)=>Promise<boolean>;

export function noticeQuestionFile(name:string,text:string):File|undefined{
 const excerpt=text.slice(0,2_000).trim();
 if(!excerpt||sensitiveReadingText(text))return;
 return new File([excerpt],name,{type:'text/plain'});
}

/** The composer must admit the attachment bytes before any native tap consumption. */
export function stageNoticeQuestion(options:{
 file:File;
 prompt:string;
 current:()=>boolean;
 signal?:AbortSignal;
 prepare:(current:()=>boolean)=>Promise<boolean>;
 attach:AttachNoticeQuestion;
 failed:()=>void;
 closed:(attached:boolean)=>void;
}):()=>void{
 let open=true;
 const events=['launcher-home','blur','pagehide'];
 const current=()=>open&&!options.signal?.aborted&&options.current();
 const finish=(attached:boolean)=>{
  if(!open)return;
  open=false;
  for(const event of events)window.removeEventListener(event,cancel);
  options.signal?.removeEventListener('abort',cancel);
  options.closed(attached);
 };
 const cancel=()=>finish(false);
 for(const event of events)window.addEventListener(event,cancel);
 options.signal?.addEventListener('abort',cancel,{once:true});
 void Promise.resolve().then(()=>{
  if(!current())return false;
  return options.attach({
   current,prompt:options.prompt,
   read:async admitted=>admitted()?options.file:undefined,
   commit:async admitted=>{
    if(!admitted())return false;
    try{
     if(await options.prepare(admitted)&&admitted())return true;
    }catch{/* Keep the pending tap when a fresh read or consumption cannot be confirmed. */}
    if(open)options.failed();
    return false;
   },
  });
 }).then(finish,()=>{
  if(open)options.failed();
  finish(false);
 });
 return cancel;
}

/** The publisher supplies this exact own-notice excerpt with its native custody checks. */
export function reviewOwnNoticeQuestion(options:{
 notice:Notice;
 current:()=>boolean;
 recheck:()=>Promise<boolean>;
 consume:()=>Promise<void>;
 attach:AttachNoticeQuestion;
 report:(message:string)=>void;
 closed:()=>void;
}):(()=>void)|undefined{
 const file=options.current()&&noticeReviewable(options.notice)&&noticeQuestionFile('Alpha Phone notification.txt',noticeExcerpt(options.notice));
 if(!file){options.report('Unavailable');return;}
 let consumed=false;
 return stageNoticeQuestion({
  file,prompt:'Help me with this notification.',current:options.current,attach:options.attach,closed:options.closed,
  prepare:async current=>{
   if(!await options.recheck()||!current())return false;
   await options.consume();consumed=true;
   return true;
  },
  failed:()=>options.report(consumed?'Couldn’t keep':'This notification changed.'),
 });
}
