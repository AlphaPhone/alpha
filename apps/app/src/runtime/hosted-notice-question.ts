import {noticeReviewable} from '../prototype/context-selection';
import {noticeQuestionFile,stageNoticeQuestion,type AttachNoticeQuestion} from '../prototype/own-notice-question';
import {alphaClient} from './alpha-client';
import {digestSummaryText} from './hosted-digests';
import type {resolveHostedResultTap} from './hosted-result-notices';
type Result=Awaited<ReturnType<typeof resolveHostedResultTap>>;
/** The opaque Android action supplies a retained result from the same owner and agent.
 * An unreviewable result is opened like an ordinary tap. */
export function reviewHostedNoticeQuestion(options:{signal?:AbortSignal;result:Extract<Result,{kind:'ready'}>;current:()=>boolean;recheck:()=>Promise<Result>;canCompose:()=>boolean;consume:()=>Promise<void>;attach:AttachNoticeQuestion;report:(message:string)=>void;unreviewable:()=>void;closed:(attached:boolean)=>void}):(()=>void)|undefined {
 const {result}=options,text=digestSummaryText(result.result),snapshot=JSON.stringify(result.result);
 const current=()=>!options.signal?.aborted&&options.current()&&!alphaClient.getState().context.sensitive;
 const file=text!=='No readable summary was returned. Open execution details to inspect this result.'&&result.question&&current()&&
  noticeReviewable({source:'own',id:result.result.runId,revision:result.token,title:'Scheduled result',text})&&noticeQuestionFile('Saved result.txt',text);
 if(!file){options.unreviewable();return;}
 return stageNoticeQuestion({
  file,prompt:'Help me understand this saved result.',current,signal:options.signal,attach:options.attach,closed:options.closed,
  prepare:async admitted=>{
   const fresh=await options.recheck();
   if(!admitted()||fresh.kind!=='ready'||!fresh.question||fresh.token!==result.token||JSON.stringify(fresh.result)!==snapshot||!options.canCompose())return false;
   await options.consume();
   return true;
  },
  failed:()=>options.report('The result or account changed. Nothing was added to your conversation.'),
 });
}

/** Reserve before asynchronous native resolution so overlapping resume/poll events cannot open two reviews. */
export function hostedTapResolver() {
 let resolving=false;
 return async (resolve:()=>Promise<void>)=>{
  if(resolving)return;
  resolving=true;
  try{await resolve();}finally{resolving=false;}
 };
}
