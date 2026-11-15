// Private local SMS/MMS shelf and the adapter's save-before-close / read-back-only restore boundary.
module NativeMessageDraft {
 type State={visible:bool,draft:int,disk:int,revision:int,writing:bool,want:int,wantPending:int,expected:int,epoch:int,token:int,pending:int,diskPending:int,restored:bool,sends:int,refused:bool}
 var s:State
 action init=s'={visible:true,draft:1,disk:0,revision:0,writing:false,want:0,wantPending:0,expected:0,epoch:0,token:0,pending:0,diskPending:0,restored:false,sends:0,refused:false}
 action assignReview=all{s.visible,not(s.writing),not(s.restored),s'={...s,pending:1}}
 action startBack=all{s.visible,not(s.writing),s.revision<3,s'={...s,writing:true,want:s.draft,wantPending:s.pending,expected:s.revision,token:s.epoch,refused:false}}
 action saved=all{s.writing,s.expected==s.revision,s'={...s,disk:s.want,revision:s.revision+1,diskPending:s.wantPending,writing:false,visible:if(s.token==s.epoch and s.want==s.draft)false else s.visible}}
 action storageRefused=all{s.writing,s'={...s,writing:false,refused:true}}
 action successor=all{s.epoch<2,s'={...s,draft:2,epoch:s.epoch+1,visible:true,pending:0,restored:false}}
 action competingWrite=all{s.writing,s.revision<3,s'={...s,revision:s.revision+1,disk:2}}
 action conflict=all{s.writing,s.expected!=s.revision,s'={...s,writing:false,refused:true}}
 action restore=all{not(s.writing),s.disk>0,s'={...s,visible:true,draft:s.disk,pending:s.diskPending,restored:true}}
 action checkStatus=all{s.visible,s.restored,s'={...s}}
 action step=any{assignReview,startBack,saved,storageRefused,successor,competingWrite,conflict,restore,checkStatus}
 val NoAutomaticSend=s.sends==0
 val NewerComposerStaysVisible=s.token<s.epoch and s.writing implies s.visible
 val safety=NoAutomaticSend and NewerComposerStaysVisible and s.revision<=3
 temporal CallbacksFair=saved.weakFair(s) and storageRefused.weakFair(s) and conflict.weakFair(s)
 temporal Settles=CallbacksFair implies always(s.writing implies eventually(not(s.writing)))
 run refusedBackTest=init.then(startBack).then(storageRefused).expect(s.visible and s.draft==1 and s.disk==0 and safety)
 run savedBackTest=init.then(startBack).then(saved).expect(not(s.visible) and s.disk==1 and safety)
 run restoredReviewTest=init.then(assignReview).then(startBack).then(saved).then(restore).then(checkStatus).expect(s.restored and s.pending==1 and s.diskPending==1 and safety)
 run lateWriteTest=init.then(startBack).then(successor).then(saved).expect(s.visible and s.draft==2 and s.disk==1 and safety)
 run competingWriterTest=init.then(startBack).then(competingWrite).then(conflict).expect(s.disk==2 and s.visible and safety)
 run storageRefusalTest=init.then(successor).then(startBack).then(saved).then(restore).then(startBack).then(storageRefused).expect(s.disk==2 and s.visible and s.refused and safety)
}
