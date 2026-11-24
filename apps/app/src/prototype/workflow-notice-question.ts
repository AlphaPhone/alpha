import {noticeExcerpt,noticeReviewable} from './context-selection';
import {noticeQuestionFile,stageNoticeQuestion,type AttachNoticeQuestion} from './own-notice-question';
import type {resolveWorkflowTap} from '../runtime/workflow-device-contract';
type Result=Awaited<ReturnType<typeof resolveWorkflowTap>>;
/** An Android Ask action has only an opaque route; authenticated resolution supplies its own live excerpt. */
export function reviewWorkflowNoticeQuestion(options:{result:Extract<Result,{kind:'ready'}>;current:()=>boolean;recheck:()=>Promise<Result>;consume:()=>Promise<void>;attach:AttachNoticeQuestion;report:(message:string)=>void;closed:(attached:boolean)=>void}):(()=>void)|undefined{
 const {result}=options,notice=result.notice?{...result.notice}:undefined;
 const file=result.question&&notice&&noticeReviewable(notice)&&noticeQuestionFile('Alpha Phone notification.txt',noticeExcerpt(notice));
 if(!file){options.report('Gone');return;}
 return stageNoticeQuestion({
  file,prompt:'Help me with this notification.',current:options.current,attach:options.attach,closed:options.closed,
  prepare:async current=>{
   const fresh=await options.recheck();
   if(!current()||fresh.kind!=='ready'||!fresh.question||fresh.token!==result.token||JSON.stringify(fresh.notice)!==JSON.stringify(notice))return false;
   await options.consume();
   return true;
  },
  failed:()=>options.report('Changed'),
 });
}
