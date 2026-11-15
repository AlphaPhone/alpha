// Owned Camera capture -> React return commit -> the same unsent Messages draft.
// Existing Camera models own sensor/encoding/gallery failures; this boundary owns destination fencing.
module MessageCameraReturn {
  type State={view:str,scope:int,epoch:int,heldScope:int,heldEpoch:int,visible:bool,
    pending:bool,writing:bool,committing:bool,shutters:int,saved:int,attachment:int,attachmentScope:int,attachmentEpoch:int,sourceEpoch:int,sends:int}
  var s:State
  action init=s'={view:"messages",scope:0,epoch:0,heldScope:-1,heldEpoch:-1,visible:true,
    pending:false,writing:false,committing:false,shutters:0,saved:0,attachment:0,attachmentScope:-1,attachmentEpoch:-1,sourceEpoch:-1,sends:0}
  pure def current(v:State):bool=v.pending and v.visible and v.scope==v.heldScope and v.epoch==v.heldEpoch
  action openCamera=all{s.view=="messages",s.visible,not(s.pending),not(s.writing),not(s.committing),
    s'={...s,view:"camera",pending:true,heldScope:s.scope,heldEpoch:s.epoch}}
  action shutter=all{current(s),s.view=="camera",not(s.writing),s.shutters<2,
    s'={...s,writing:true,shutters:s.shutters+1}}
  action writeReply=all{s.writing,
    s'={...s,writing:false,saved:s.saved+1,committing:current(s) and s.view=="camera",
      view:if(current(s) and s.view=="camera")"messages" else s.view,
      pending:current(s) and s.view=="camera"}}
  action captureFailed=all{s.writing,s'={...s,writing:false}}
  action commitReply=all{s.committing,
    s'={...s,committing:false,pending:false,
      attachment:if(current(s) and s.view=="messages")1 else s.attachment,
      attachmentScope:if(current(s) and s.view=="messages")s.scope else s.attachmentScope,
      attachmentEpoch:if(current(s) and s.view=="messages")s.epoch else s.attachmentEpoch,
      sourceEpoch:if(current(s) and s.view=="messages")s.heldEpoch else s.sourceEpoch}}
  action cancel=all{s.view=="camera",s.epoch<4,
    s'={...s,view:"messages",pending:false,committing:false,epoch:s.epoch+1}}
  action goHome=all{s.epoch<4,s'={...s,view:"home",pending:false,epoch:s.epoch+1,attachment:0,attachmentScope:-1}}
  action switchThread=all{s.epoch<4,s'={...s,view:"messages",scope:1-s.scope,epoch:s.epoch+1,pending:false,attachment:0,attachmentScope:-1}}
  action pickNewerFile=all{s.view=="messages",s.visible,not(s.pending),s'={...s,attachment:2,attachmentScope:s.scope}}
  action hide=all{s.epoch<4,s'={...s,visible:false,pending:false,committing:false,epoch:s.epoch+1,attachment:0,attachmentScope:-1}}
  action stay=s'=s
  action step=any{stay,openCamera,shutter,writeReply,captureFailed,commitReply,cancel,goHome,switchThread,pickNewerFile,hide}
  val NoAutomaticSend=s.sends==0
  val SavedOnlyAfterShutter=s.saved<=s.shutters and s.shutters<=2
  val AttachmentOwner=s.attachment>0 implies Set("messages","camera").contains(s.view) and s.attachmentScope==s.scope
  val CaptureQueuedOnlyForHeldDraft=s.attachment==1 implies s.sourceEpoch==s.attachmentEpoch and s.attachmentScope==s.scope and s.saved>0
  val safety=NoAutomaticSend and SavedOnlyAfterShutter and AttachmentOwner and CaptureQueuedOnlyForHeldDraft
  temporal CallbacksFair=writeReply.weakFair(s) and captureFailed.weakFair(s) and commitReply.weakFair(s)
  temporal Settles=CallbacksFair implies always((s.writing or s.committing) implies eventually(not(s.writing) and not(s.committing)))
  run returnToDraftTest=init.then(openCamera).then(shutter).then(writeReply).then(commitReply).expect(s.attachment==1 and s.saved==1 and safety)
  run cancelBeforeShutterTest=init.then(openCamera).then(cancel).expect(s.saved==0 and s.attachment==0 and safety)
  run lateWriteKeepsGalleryTest=init.then(openCamera).then(shutter).then(goHome).then(switchThread).then(writeReply).expect(s.saved==1 and s.attachment==0 and safety)
  run lateCommitKeepsSuccessorTest=init.then(openCamera).then(shutter).then(writeReply).then(goHome).then(switchThread).then(pickNewerFile).then(commitReply).expect(s.attachment==2 and s.saved==1 and safety)
  run returnedIdentityDoesNotReviveTest=init.then(openCamera).then(shutter).then(writeReply).then(goHome).then(switchThread).then(switchThread).then(commitReply).expect(s.scope==0 and s.attachment==0 and safety)
  run explicitKnownFailureRetryTest=init.then(openCamera).then(shutter).then(captureFailed).then(shutter).then(writeReply).then(commitReply).expect(s.shutters==2 and s.saved==1 and s.attachment==1 and safety)
}
