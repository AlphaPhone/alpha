import {noticeReviewable} from '../prototype/context-selection';
import {noticeQuestionFile,stageNoticeQuestion,type AttachNoticeQuestion} from '../prototype/own-notice-question';
import {alphaClient} from './alpha-client';
import type {HostedNativeSelection} from './hosted-digests';
export interface SourceRenewalTap {token:string;question:boolean;selection:HostedNativeSelection;expiresAt:number}
export function renewalMatches(tap:SourceRenewalTap,selection:HostedNativeSelection,expiresAt:string){return tap.expiresAt===Date.parse(expiresAt)&&['provider','ownerId','agentId','installationId','enrollmentId','sourceId','revision'].every(field=>tap.selection[field as keyof HostedNativeSelection]===selection[field as keyof HostedNativeSelection]);}
export function reviewSourceRenewalQuestion(o:{tap:SourceRenewalTap;signal:AbortSignal;current:()=>boolean;recheck:()=>Promise<Partial<SourceRenewalTap>>;consume:()=>Promise<void>;canCompose:()=>boolean;attach:AttachNoticeQuestion;report:(text:string)=>void;closed:(attached:boolean)=>void}){
 const text='Access for your daily brief expires soon. Renew it to keep your brief updated.';
 const current=()=>!o.signal.aborted&&o.current()&&!alphaClient.getState().context.sensitive;
 const file=o.tap.question&&current()&&noticeReviewable({source:'own',id:o.tap.selection.sourceId,revision:o.tap.selection.revision,title:'Scheduled source renewal',text})&&noticeQuestionFile('Source renewal.txt',text);
 if(!file)return;
 return stageNoticeQuestion({
  file,prompt:'Help me understand this source renewal.',current,signal:o.signal,attach:o.attach,closed:o.closed,
  prepare:async admitted=>{
   const next=await o.recheck();
   if(!admitted()||next.token!==o.tap.token||!next.question||!next.selection||
    !renewalMatches(next as SourceRenewalTap,o.tap.selection,new Date(o.tap.expiresAt).toISOString())||!o.canCompose())return false;
   await o.consume();
   return true;
  },
  failed:()=>o.report('The source or account changed. Nothing was added to your conversation.'),
 });
}
