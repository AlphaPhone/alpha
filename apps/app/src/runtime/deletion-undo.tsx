import {useMemo} from 'react';
import {forgetNoteOrigin,savedNoteOrigin} from '../prototype/note-origin-adapter';
import {connectionController} from './connection-ui';
import {DeferredDeletionNotice} from '../ui/components/composites/deferred-deletion-notice';
import {createDeletionNoticePolicy,deletions,refreshDeletionViews} from './deletions';
import {browserScreenLocked} from '../browser/screen-locked';
import {agentSessionKey} from '../lib/session-key.ts';
import './deletion-undo.css';
/** Owner/session identity: a change clears every row before the new owner's are read. */
const identity={
 read(){const session=connectionController.getSnapshot().session;return session?agentSessionKey(session):'';},
 subscribe:(listener:()=>void)=>connectionController.subscribe(listener),
};
const refreshEvents=['alpha:deletions-changed','alpha:device-state'];
/** Alpha's binding of the shared reviewed-deletion Undo notice. */
export function DeletionUndo(){
 const notice=useMemo(()=>createDeletionNoticePolicy(deletions,identity),[]);
 return <DeferredDeletionNotice bridge={notice.bridge} identity={notice.identity} concealed={browserScreenLocked} refreshEvents={refreshEvents} onChanged={refreshDeletionViews} className="alpha-deletion-undo"
  onDeletedOrigins={async origins=>{for(const origin of origins){if(savedNoteOrigin(origin.kind,origin.id))await forgetNoteOrigin(origin.kind,origin.id);}}}/>;
}
