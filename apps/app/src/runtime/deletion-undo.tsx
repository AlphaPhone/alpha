import {forgetNoteOrigin,savedNoteOrigin} from '../prototype/note-origin-adapter';
import {connectionController} from './connection-ui';
import {useEffect,useRef,useState} from 'react';
import {deletions,refreshDeletionViews,type DeletionEntry} from './deletions';
import {browserScreenLocked} from '../browser/screen-locked';
import {UNDO_TOO_LATE,undoConfirmed} from './deletion-window';
import './deletion-undo.css';
export const DELETION_POLL_ACTIVE=500,DELETION_POLL_IDLE=5000;
/** Delay before the next unprompted status read, or undefined when none is scheduled.
 * A pending deletion (or a read that just failed, until three in a row) is followed
 * closely because its Undo window and, in the browser, its dispatch depend on this read.
 * With nothing pending, 'alpha:deletions-changed' announces new work and the slow read is
 * only a fallback. A hidden page schedules nothing; becoming visible reads again. */
export function deletionPollDelay(state:{hidden:boolean;pending:boolean;failures:number}):number|undefined{
 if(state.hidden)return undefined;
 return state.pending||state.failures>0&&state.failures<3?DELETION_POLL_ACTIVE:DELETION_POLL_IDLE;
}
export function DeletionUndo(){
 const [entries,setEntries]=useState<DeletionEntry[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');const signature=useRef(''),knownPending=useRef(false);
 useEffect(()=>{let retired=false,inflight=false,again=false,identityEpoch=0,failures=0,timer:ReturnType<typeof setTimeout>|undefined;
  const arm=()=>{clearTimeout(timer);timer=undefined;if(retired)return;const delay=deletionPollDelay({hidden:document.hidden,pending:knownPending.current,failures});if(delay!==undefined)timer=setTimeout(()=>void refresh(),delay);};
  // A change announced while a read is in flight may be newer than what that read saw: read once more after it.
  const refresh=async()=>{if(retired)return;if(inflight){again=true;return;}if(document.hidden||browserScreenLocked()){setEntries([]);arm();return;}inflight=true;const admittedEpoch=identityEpoch;
   try{const result=await deletions.pending();if(retired||admittedEpoch!==identityEpoch||document.hidden||browserScreenLocked())return;
    for(const origin of result.deletedOrigins||[]){if(savedNoteOrigin(origin.kind,origin.id))await forgetNoteOrigin(origin.kind,origin.id);}
    if(retired||admittedEpoch!==identityEpoch||document.hidden||browserScreenLocked())return;
    const next=result.deletions.map(e=>[e.kind,e.id,e.phase]).join('|');if(signature.current&&next!==signature.current)refreshDeletionViews();signature.current=next;
    const pending=result.deletions.filter(e=>['queued','paused','unknown','dispatching'].includes(e.phase));
    failures=0;knownPending.current=pending.length>0;setEntries(pending);setError('');
   }catch{if(!retired&&admittedEpoch===identityEpoch&&!document.hidden&&!browserScreenLocked()&&++failures>=3&&knownPending.current)setError('Pending deletion status is unavailable. Refresh before making another change.');}finally{inflight=false;if(again&&!retired){again=false;void refresh();}else arm();}
  };
  const identity=()=>{const session=connectionController.getSnapshot().session;return session?JSON.stringify([session.origin,session.ownerId,session.agentId,session.sessionId]):'';};let previousIdentity=identity();
  const unsubscribe=connectionController.subscribe(()=>{const next=identity();if(next===previousIdentity)return;previousIdentity=next;identityEpoch++;failures=0;signature.current='';knownPending.current=false;setEntries([]);setError('');void refresh();});
  void refresh();window.addEventListener('alpha:deletions-changed',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('alpha:device-state',refresh);
  return()=>{retired=true;unsubscribe();clearTimeout(timer);window.removeEventListener('alpha:deletions-changed',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('alpha:device-state',refresh);};
 },[]);
 if(!entries.length&&!error)return null;
 return <aside className="alpha-deletion-undo" aria-label="Pending deletions">{error&&<p role="status">{error}</p>}{entries.map(entry=>{
  const uncertain=entry.phase==='unknown'||entry.phase==='dispatching';
  const paused=entry.phase==='paused'||entry.window==='clock-changed',canUndo=paused||entry.phase==='queued'&&entry.window==='open';
  return <div key={entry.kind+entry.id}><p>{entry.target.row?.title||entry.target.fields?.title||entry.original?.title||'Selected '+entry.kind}<br/><small>{paused?'Deletion paused. Undo to keep it, then review again if you still want to delete.':canUndo?'Deletion queued for 10 seconds.':entry.phase==='unknown'||entry.phase==='dispatching'?'Deletion outcome needs review. It will not be repeated.':'Deletion is being verified.'}</small></p>{canUndo&&<button disabled={!!busy} onClick={async()=>{setBusy(entry.id);try{const result=await deletions.undo({kind:entry.kind,id:entry.id});if(!undoConfirmed(result)){setError(UNDO_TOO_LATE);refreshDeletionViews();return;}refreshDeletionViews();}catch{setError('Undo could not be confirmed. The deletion may already have gone ahead; refresh and inspect the saved item.');refreshDeletionViews();}finally{setBusy('');}}}>Undo</button>}{uncertain&&<><button disabled={!!busy} onClick={()=>{setError('Refreshing the saved receipt. This does not repeat the deletion or prove the item was restored.');refreshDeletionViews();}}>Refresh receipt</button><button disabled={!!busy} onClick={async()=>{setBusy(entry.id);try{await deletions.dismiss({kind:entry.kind,id:entry.id});setEntries(current=>{const remaining=current.filter(row=>row.id!==entry.id||row.kind!==entry.kind);knownPending.current=remaining.length>0;return remaining;});setError('Outcome dismissed. The receipt is retained; nothing was restored or repeated.');refreshDeletionViews();}catch{setError('The outcome could not be dismissed. Refresh the receipt and try again.');}finally{setBusy('');}}}>Dismiss outcome</button></>}</div>;
 })}</aside>;
}
