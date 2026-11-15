// attachment-picker.ts: local selection, opaque grants and owner/conversation epochs.
// One ticket abstracts the serial byte reads of one captured selection. Native callbacks
// may finish after cancellation and after a new picker opens. No model/provider send exists.
module ChatAttachmentPicker {
  type State = {phase:str,scope:int,heldScope:int,epoch:int,selected:Set[int],ticketCount:int,
    selecting:Set[int],reading:Set[int],ticketEpochs:(int -> int),ticketScopes:(int -> int),
    admitted:Set[int],queuedCount:int,queuedTicket:int,queuedEpoch:int,queuedScope:int}
  var s:State
  action init = s'={phase:"closed",scope:0,heldScope:-1,epoch:0,selected:Set(),ticketCount:0,
    selecting:Set(),reading:Set(),ticketEpochs:0.to(3).mapBy(_=>-1),ticketScopes:0.to(3).mapBy(_=>-1),
    admitted:Set(),queuedCount:0,queuedTicket:0,queuedEpoch:-1,queuedScope:-1}
  action open = all {s.phase=="closed",s.epoch<6,
    s'={...s,phase:"browsing",heldScope:s.scope,epoch:s.epoch+1,selected:Set(),queuedCount:0,queuedTicket:0,queuedEpoch:-1,queuedScope:-1}}
  action browseFiles = s'=s
  action toggle(id:int):bool = all {s.phase=="browsing",Set(0,1).contains(id),
    s'={...s,selected:if(s.selected.contains(id))s.selected.exclude(Set(id)) else s.selected.union(Set(id))}}
  action attach = all {s.phase=="browsing",s.selected.size()>0,s.ticketCount<3,
    val ticket=s.ticketCount+1
    s'={...s,phase:"reading",ticketCount:ticket,selecting:s.selecting.union(Set(ticket)),
      ticketEpochs:s.ticketEpochs.set(ticket,s.epoch),ticketScopes:s.ticketScopes.set(ticket,s.scope)}}
  pure def current(v:State,ticket:int):bool = v.phase=="reading" and v.ticketEpochs.get(ticket)==v.epoch and v.ticketScopes.get(ticket)==v.scope and v.heldScope==v.scope
  action selectionReply(ticket:int):bool = all {s.selecting.contains(ticket),
    s'={...s,selecting:s.selecting.exclude(Set(ticket)),
      reading:if(current(s,ticket))s.reading.union(Set(ticket)) else s.reading,
      admitted:if(current(s,ticket))s.admitted.union(Set(ticket)) else s.admitted}}
  action readReply(ticket:int,success:bool):bool = all {s.reading.contains(ticket),
    s'=if(current(s,ticket))
      if(success){...s,reading:s.reading.exclude(Set(ticket)),phase:"closed",epoch:s.epoch+1,selected:Set(),
        queuedCount:s.selected.size(),queuedTicket:ticket,queuedEpoch:s.epoch,queuedScope:s.scope}
      else {...s,reading:s.reading.exclude(Set(ticket)),phase:"browsing"}
      else {...s,reading:s.reading.exclude(Set(ticket))}}
  action cancel = s'=if(s.phase=="closed")s else {...s,phase:"closed",epoch:s.epoch+1,selected:Set()}
  action switchScope = s'=if(s.phase=="closed"){...s,scope:1-s.scope}
    else {...s,scope:1-s.scope,phase:"closed",epoch:s.epoch+1,selected:Set()}
  action step = any {open,browseFiles,toggle(0),toggle(1),attach,cancel,switchScope,
    selectionReply(1),selectionReply(2),selectionReply(3),
    readReply(1,true),readReply(1,false),readReply(2,true),readReply(2,false),readReply(3,true),readReply(3,false)}
  val SelectionBound = s.selected.size()<=2 and s.queuedCount<=2
  val NativeReadWasAdmitted = s.reading.subseteq(s.admitted)
  val NoDuplicateLease = s.selecting.intersect(s.reading)==Set()
  val QueuedOnlyForCapturedScope = s.queuedCount>0 implies s.queuedEpoch==s.ticketEpochs.get(s.queuedTicket) and s.queuedScope==s.ticketScopes.get(s.queuedTicket) and s.admitted.contains(s.queuedTicket)
  val safety = SelectionBound and NativeReadWasAdmitted and NoDuplicateLease and QueuedOnlyForCapturedScope
  // Fairness is only the eventual return of already requested native callbacks.
  temporal CallbacksFair = selectionReply(1).weakFair(s) and selectionReply(2).weakFair(s) and selectionReply(3).weakFair(s)
    and readReply(1,true).weakFair(s) and readReply(2,true).weakFair(s) and readReply(3,true).weakFair(s)
  temporal Releases = CallbacksFair implies always(
    (s.selecting.contains(1) or s.reading.contains(1) implies eventually(not(s.selecting.contains(1)) and not(s.reading.contains(1))))
    and (s.selecting.contains(2) or s.reading.contains(2) implies eventually(not(s.selecting.contains(2)) and not(s.reading.contains(2))))
    and (s.selecting.contains(3) or s.reading.contains(3) implies eventually(not(s.selecting.contains(3)) and not(s.reading.contains(3)))))
  run selectedOnlyTest = init.then(open).then(toggle(0)).then(attach).then(selectionReply(1)).then(readReply(1,true)).expect(s.queuedCount==1 and safety)
  run cancellationReleasesTest = init.then(open).then(toggle(0)).then(attach).then(selectionReply(1)).then(cancel).then(readReply(1,true)).expect(s.queuedCount==0 and s.reading==Set() and safety)
  run retiredSelectionTest = init.then(open).then(toggle(0)).then(attach).then(cancel).then(open).then(selectionReply(1)).expect(s.phase=="browsing" and s.admitted==Set() and safety)
  run oldReplyKeepsNewResultTest = init.then(open).then(toggle(0)).then(attach).then(selectionReply(1)).then(cancel).then(open).then(toggle(0)).then(attach).then(selectionReply(2)).then(readReply(2,true)).then(readReply(1,true)).expect(s.queuedTicket==2 and s.queuedCount==1 and safety)
  run failedReadCanRetryTest = init.then(open).then(toggle(0)).then(attach).then(selectionReply(1)).then(readReply(1,false)).then(attach).then(selectionReply(2)).then(readReply(2,true)).expect(s.queuedCount==1 and safety)
}
