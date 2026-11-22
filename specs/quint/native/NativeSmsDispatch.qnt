// Alpha's card-approved SMS dispatch and manifest callback boundary.
// One fixed operation ID, two payloads, two approval cards, two bridge actors and up to four parts.
module NativeSmsDispatch {
  type Record = {
    binding: int, status: str, decision: str, dispatching: bool, submitted: bool, unknown: bool, boot: int,
    sent: Set[int], failed: Set[int], reported: Set[int], delivered: Set[int], deliveryFailed: Set[int], rows: Set[int]
  }
  // phase: none, open (approved and applying, unclaimed) or claimed (admitted one send).
  type Card = {binding: int, phase: str, expired: bool}
  type State = {
    recipients: int, parts: int, reply: str, replyBinding: int, memory: Record, disk: Record, tombstoneBinding: int, claimOwner: int,
    attempts: int, accepted: int, cards: int -> Card, foreground: Set[int], closed: Set[int], listeners: Set[int], events: int -> int,
    image: bool, send: bool, phone: bool, read: bool, locked: bool, role: bool, sim: int,
    process: int, boot: int, old: bool, candidate: str, providerStatus: str, refuseOutbox: bool,
    outbox: Set[int], sentRows: Set[int], failedRows: Set[int]
  }
  var s: State
  val actors = Set(1, 2)
  val cardSlots = Set(1, 2)
  val noCard = {binding:0,phase:"none",expired:false}
  val noRecord = {binding:0,status:"none",decision:"none",dispatching:false,submitted:false,unknown:false,boot:0,
    sent:Set(),failed:Set(),reported:Set(),delivered:Set(),deliveryFailed:Set(),rows:Set()}

  action initWith(recipients: int, parts: int, role: bool): bool = all {
    recipients.in(1.to(2)), parts.in(1.to(2)),
    s' = {recipients:recipients,parts:parts,reply:"none",replyBinding:0,memory:noRecord,disk:noRecord,tombstoneBinding:0,claimOwner:0,attempts:0,accepted:0,
      cards:cardSlots.mapBy(_=>noCard),foreground:actors,closed:Set(),listeners:actors,events:actors.mapBy(_=>0),
      image:true,send:true,phone:true,read:true,locked:false,role:role,sim:1,process:1,boot:1,old:false,
      candidate:"none",providerStatus:"none",refuseOutbox:false,outbox:Set(),sentRows:Set(),failedRows:Set()}
  }
  action init = {
    nondet recipients=1.to(2).oneOf()
    nondet parts=1.to(2).oneOf()
    nondet role=Bool.oneOf()
    initWith(recipients,parts,role)
  }

  pure def response(state: State, reply: str, binding: int): State = { ...state,reply:reply,replyBinding:binding }
  pure def current(state: State, actor: int): bool =
    state.image and not(state.locked) and state.foreground.contains(actor) and not(state.closed.contains(actor))
  pure def permitted(state: State, actor: int): bool = current(state,actor) and state.send and state.phone and state.sim!=0
  pure def project(record: Record, count: int): Record = {
    val status=if (record.binding==0) "none" else if (record.decision!="none") record.decision
      else if (record.failed.size()>0) "failed"
      else if (record.sent.size()==count) (if (record.delivered.size()==count) "delivered" else "sent")
      else if (record.unknown or record.dispatching) "unknown"
      else if (record.submitted) "submitted" else "unknown"
    { ...record,status:status }
  }
  pure def saved(state: State, record: Record): State = {
    val wire=project(record,state.recipients*state.parts)
    { ...state,memory:wire,disk:wire }
  }
  pure def decide(state: State, binding: int, outcome: str): State =
    if (state.memory.binding!=0 or state.tombstoneBinding!=0) response(state,"unavailable",0)
    else response(saved(state,{ ...noRecord,binding:binding,decision:outcome,boot:state.boot }),outcome,binding)
  pure def receipt(state: State): State = response(state,state.memory.status,state.memory.binding)
  pure def retained(state: State, binding: int): State =
    if (state.tombstoneBinding!=0) response(state,if (state.tombstoneBinding==binding) "expired" else "invalid",0)
    else if (state.memory.binding==binding) receipt(state) else response(state,"invalid",0)
  pure def hasRetainedId(state: State): bool = state.memory.binding!=0 or state.tombstoneBinding!=0

  action access(kind: str, allowed: bool): bool = all {
    kind.in(Set("image","send","phone","read","locked","role")),
    s' = if (kind=="image") { ...s,image:allowed } else if (kind=="send") { ...s,send:allowed }
      else if (kind=="phone") { ...s,phone:allowed } else if (kind=="read") { ...s,read:allowed }
      else if (kind=="locked") { ...s,locked:allowed } else { ...s,role:allowed }
  }
  action simAt(value: int): bool = all { value.in(0.to(3)), s' = { ...s,sim:value } }
  action refuseOutbox(value: bool): bool = s' = { ...s,refuseOutbox:value }
  // Time passes beyond the journal's open window. Every approved card has expired by then.
  action age = s' = { ...s,old:s.old or s.memory.binding!=0,
    cards:cardSlots.mapBy(card=>{ ...s.cards.get(card),expired:s.cards.get(card).phase!="none" }) }
  // A successful journal capacity write retires the fixed ID into an exact-binding tombstone.
  action prune = all {
    s.old, s.memory.binding!=0, s.memory.binding==s.disk.binding, not(s.memory.dispatching),
    s' = { ...s,memory:noRecord,disk:noRecord,tombstoneBinding:s.memory.binding }
  }

  pure def admits(card: Card, binding: int): bool = card.phase=="open" and not(card.expired) and card.binding==binding

  // The owner's Approve on an agent's SMS card: its action-journal entry is applying for this
  // operation ID with the exact recipients, text and SIM. Two chat scopes can each hold one.
  action approveCard(card: int, binding: int): bool = all {
    cardSlots.contains(card), binding.in(1.to(2)), s.cards.get(card).phase=="none",
    s' = { ...s,cards:s.cards.set(card,{binding:binding,phase:"open",expired:false}) }
  }

  pure def dispatched(state: State, actor: int, binding: int, request: str, mode: str): State =
    if (mode.in(Set("cancel-queued","pause-queued"))) {
      val cancelled=decide(state,binding,"cancelled")
      if (mode=="pause-queued") { ...cancelled,foreground:cancelled.foreground.exclude(Set(actor)) } else cancelled
    }
    else if (not(permitted(state,actor)) or request.in(Set("divide-refused","empty-parts"))) decide(state,binding,"denied")
    else if (mode=="journal-refused") response(state,"unavailable",0)
    else if (mode=="begin-before") decide(state,binding,"denied")
    else {
      val starting=project({ ...noRecord,binding:binding,dispatching:true,boot:state.boot },state.recipients*state.parts)
      if (mode=="begin-after-and-deny-before") response({ ...state,disk:starting },"unavailable",0)
      else if (state.role and state.refuseOutbox) decide(state,binding,"denied")
      else {
        val attempted=if (mode.in(Set("guard-change","throw-before","throw-after"))) 1 else state.recipients
        val accepted=if (mode=="throw-before") 0 else attempted
        val prepared=if (state.role) Set(1,2).filter(recipient => recipient<=state.recipients) else Set()
        val outbox=prepared.filter(recipient => recipient<=attempted)
        val beforeEnd={ ...starting,rows:prepared }
        val returned=not(mode.in(Set("throw-before","throw-after"))) and (mode!="guard-change" or state.recipients==1)
        val ended=project({ ...beforeEnd,dispatching:false,submitted:returned,unknown:not(returned) },state.recipients*state.parts)
        receipt({ ...state,memory:ended,disk:if (mode=="end-before") beforeEnd else ended,
          attempts:state.attempts+attempted,accepted:state.accepted+accepted,sim:if (mode=="guard-change") 2 else state.sim,outbox:outbox })
      }
    }

  // The agent bridge's sendSms naming card `card` (0: no card). A foreign request names other
  // recipients or another SIM than any card can hold. A retained operation ID answers from the SMS
  // journal before the card is read. Otherwise only an open, unexpired card for exactly this text
  // admits it, and the admission claims the card once, before any dispatch check.
  val requests = Set("complete","long-number","divide-refused","empty-parts","other-sim","other-recipient")
  val sendModes = Set("complete","claim-before","claim-after","guard-change","throw-before","throw-after","begin-before","journal-refused",
    "begin-after-and-deny-before","end-before","end-after","cancel-queued","pause-queued")
  action send(actor: int, card: int, binding: int, request: str, mode: str): bool = all {
    actors.contains(actor), card.in(0.to(2)), binding.in(1.to(2)), requests.contains(request), sendModes.contains(mode),
    val foreign=request.in(Set("other-sim","other-recipient"))
    val approval=if (card==0) noCard else s.cards.get(card)
    if (not(current(s,actor))) s' = response(s,"unavailable",0)
    else if (request=="long-number") s' = response(s,"invalid",0)
    else if (hasRetainedId(s)) s' = retained(s,if (foreign) 0 else binding)
    else if (foreign or s.claimOwner!=0 or not(admits(approval,binding))) s' = response(s,"not-approved",0)
    else if (mode=="claim-before") s' = response(s,"not-approved",0)
    else if (mode=="claim-after") s' = response({ ...s,claimOwner:card },"not-approved",0)
    else s' = dispatched({ ...s,claimOwner:card,cards:s.cards.set(card,{ ...approval,phase:"claimed" }) },actor,binding,request,mode)
  }

  // A cancellation with nothing queued answers and changes nothing.
  action cancel(actor: int, exact: bool): bool = all {
    actors.contains(actor),
    s' = if (not(current(s,actor))) response(s,"unavailable",0) else response(s,"ok",0)
  }
  action lifecycle(actor: int, mode: str): bool = all {
    actors.contains(actor), mode.in(Set("pause","resume","screen","destroy")),
    s' = if (mode=="pause") { ...s,foreground:s.foreground.exclude(Set(actor)) }
      else if (mode=="resume") { ...s,foreground:s.foreground.union(Set(actor)) }
      else if (mode=="destroy") { ...s,closed:s.closed.union(Set(actor)),listeners:s.listeners.exclude(Set(actor)) }
      else s
  }

  action readback(actor: int): bool = all {
    actors.contains(actor),
    s' = if (not(current(s,actor))) response(s,"unavailable",0)
      else if (s.memory.binding==0) response(s,"not-found",0) else receipt(s)
  }

  action provider(kind: str, status: str): bool = all {
    s.memory.binding!=0, kind.in(Set("none","wrong","ambiguous","exact")),
    not(s.memory.rows.contains(1)) or kind.in(Set("none","exact")),
    status.in(Set("none","pending","complete","failed")),
    s' = { ...s,candidate:kind,providerStatus:status }
  }

  pure def partsOf(recipient: int, count: int): Set[int] =
    if (count==1) Set(recipient) else Set(recipient*2-1,recipient*2)

  pure def settleRow(state: State, index: int): State = {
    val recipient=if (state.parts==1) index else (index+1)/2
    val parts=partsOf(recipient,state.parts)
    if (not(state.role and state.outbox.contains(recipient))) state
    else if (parts.intersect(state.memory.failed).size()>0)
      { ...state,outbox:state.outbox.exclude(Set(recipient)),failedRows:state.failedRows.union(Set(recipient)) }
    else if (parts.subseteq(state.memory.sent))
      { ...state,outbox:state.outbox.exclude(Set(recipient)),sentRows:state.sentRows.union(Set(recipient)) }
    else state
  }

  pure def ownedProvider(state: State): bool = Set(1).intersect(state.outbox.union(state.sentRows).union(state.failedRows)).size()>0

  // A provider match can attach a row without making the send delivered.
  // Only a reported, successfully sent single part can use that row's status.
  pure def reconciled(state: State): State = {
    val memory=state.memory
    val partSet=partsOf(1,state.parts)
    val present=state.candidate=="exact" and not(ownedProvider(state))
    if (not(state.read) or state.old or memory.binding==0 or memory.decision!="none" or
      not(partSet.subseteq(memory.sent)) or (state.boot!=memory.boot and memory.reported.size()==0)) state
    else {
      val attributed=if (present) { ...memory,rows:memory.rows.union(Set(1)) } else memory
      val report=state.parts==1 and memory.reported.contains(1) and not(memory.delivered.contains(1) or memory.deliveryFailed.contains(1))
      val outcome=if (present and report and state.providerStatus=="complete")
          { ...attributed,delivered:attributed.delivered.union(Set(1)) }
        else if (present and report and state.providerStatus=="failed")
          { ...attributed,deliveryFailed:attributed.deliveryFailed.union(Set(1)) }
        else attributed
      if (outcome==memory) state else saved(state,outcome)
    }
  }

  pure def announce(state: State, changed: bool): State = {
    val receivers=state.listeners.filter(actor=>current(state,actor))
    if (not(changed)) state else { ...state,events:actors.mapBy(actor=>
      state.events.get(actor)+(if (receivers.contains(actor)) 1 else 0)) }
  }
  // The original eight callback publications remain available to each bridge.
  // Two eligible bridges can receive the same publication; no recipient gains past eight.
  pure def noticeBudget(state: State): bool = state.events.keys()==actors and
    actors.forall(actor=>state.events.get(actor)>=0 and state.events.get(actor)<=8)
  pure def deliveryChanged(before: Record, after: Record): bool =
    before.delivered!=after.delivered or before.deliveryFailed!=after.deliveryFailed

  action reconcile: bool = all {
    s.image,
    val read=reconciled(s)
    val candidateState=announce(read,deliveryChanged(s.memory,read.memory))
    all {noticeBudget(candidateState), s' = candidateState}
  }

  action callback(index: int, kind: str, ok: bool, mode: str): bool = all {
    index.in(1.to(4)), index<=s.accepted*s.parts, kind.in(Set("sent","delivery")),
    mode.in(Set("complete","wrong-action","before","after")),
    val candidateState=if (not(s.image) or mode=="wrong-action" or s.memory.binding==0) s
    else {
      val memory=s.memory
      val updated=if (kind=="delivery") { ...memory,reported:memory.reported.union(Set(index)) }
        else if (memory.sent.contains(index) or memory.failed.contains(index)) memory
        else if (ok) { ...memory,sent:memory.sent.union(Set(index)) }
        else { ...memory,failed:memory.failed.union(Set(index)) }
      val changed=updated!=memory
      if (changed and mode=="before") { ...s,memory:project(updated,s.recipients*s.parts) }
      else if (changed and mode=="after") saved(s,updated)
      else {
        val written=if (changed) saved(s,updated) else s
        val read=reconciled(if (kind=="sent") settleRow(written,index) else written)
        announce(read,changed or deliveryChanged(memory,read.memory))
      }
    }
    all {noticeBudget(candidateState), s' = candidateState}
  }

  action restart(reboot: bool): bool = all {
    s.process<3, s.image,
    val boot=if (reboot) s.boot+1 else s.boot
    val stored=s.disk
    val interrupted=stored.dispatching or
      (stored.binding!=0 and stored.decision=="none" and stored.boot!=boot and stored.sent.union(stored.failed).size()<s.recipients*s.parts)
    val loaded=if (interrupted) project({ ...stored,dispatching:false,unknown:true },s.recipients*s.parts) else stored
    val current={ ...s,process:s.process+1,boot:boot,foreground:actors,closed:Set(),
      listeners:Set(1),events:actors.mapBy(_=>0),reply:"none",replyBinding:0,memory:loaded,disk:loaded }
    val recovered=reconciled(current)
    // The fixture drains the first bridge's startup reconcile before loading the second.
    val published=announce(recovered,deliveryChanged(current.memory,recovered.memory))
    s' = { ...published,listeners:actors }
  }

  val OneRadioCallPerRecipient = s.accepted<=s.attempts and s.attempts<=s.recipients
  val RadioNeedsDurableIntent = s.attempts==0 or s.tombstoneBinding!=0 or (s.disk.binding!=0 and s.disk.decision=="none")
  val TombstoneRetiresLiveRecord = s.tombstoneBinding==0 or (s.memory.binding==0 and s.disk.binding==0)
  pure def evidence(record: Record): bool =
    record.sent.intersect(record.failed).size()==0 and record.delivered.union(record.deliveryFailed).subseteq(record.sent.intersect(record.reported))
  val DeliveryNeedsSentAndReport = evidence(s.memory) and evidence(s.disk) and
    (s.parts==1 or s.memory.delivered.union(s.disk.delivered).union(s.memory.deliveryFailed).union(s.disk.deliveryFailed).size()==0)
  val ProviderRowsHaveOnePhase = s.outbox.intersect(s.sentRows.union(s.failedRows)).size()==0 and s.sentRows.intersect(s.failedRows).size()==0
  val LiveBridgeListeners = s.listeners==actors.exclude(s.closed)
  val PerBridgeNoticeCapacity = noticeBudget(s)
  pure def claimed(state: State): Set[int] = cardSlots.filter(card=>state.cards.get(card).phase=="claimed")
  pure def journaled(state: State): int = if (state.tombstoneBinding!=0) state.tombstoneBinding else state.disk.binding
  // Radio only for the text of a card the owner approved and that admission claimed.
  val RadioNeedsClaimedApproval = s.attempts==0 or claimed(s).exists(card=>s.cards.get(card).binding==journaled(s))
  // One claim per operation. A claimed card's text is the journaled one, or nothing was journaled
  // at all (the journal refused every write), in which case the spent claim still admits nothing more.
  val OneClaimPerOperation = claimed(s).size()<=1 and claimed(s).forall(card=>
    s.cards.get(card).binding.in(Set(s.memory.binding,s.disk.binding,s.tombstoneBinding))
      or (s.memory.binding==0 and s.disk.binding==0 and s.tombstoneBinding==0))
  val safety = OneRadioCallPerRecipient and RadioNeedsDurableIntent and TombstoneRetiresLiveRecord
    and DeliveryNeedsSentAndReport and ProviderRowsHaveOnePhase and LiveBridgeListeners and PerBridgeNoticeCapacity
    and RadioNeedsClaimedApproval and OneClaimPerOperation

  action step = any {
    nondet kind=Set("image","send","phone","read","locked","role").oneOf()
    nondet allowed=Bool.oneOf()
    access(kind,allowed),
    nondet sim=0.to(3).oneOf()
    simAt(sim),
    refuseOutbox(true),refuseOutbox(false),age,prune,
    nondet card=cardSlots.oneOf()
    nondet binding=1.to(2).oneOf()
    approveCard(card,binding),
    nondet actor=actors.oneOf()
    nondet card=0.to(2).oneOf()
    nondet binding=1.to(2).oneOf()
    nondet request=requests.oneOf()
    nondet mode=sendModes.oneOf()
    send(actor,card,binding,request,mode),
    nondet actor=actors.oneOf()
    nondet exact=Bool.oneOf()
    cancel(actor,exact),
    nondet actor=actors.oneOf()
    nondet mode=Set("pause","resume","screen","destroy").oneOf()
    lifecycle(actor,mode),
    nondet actor=actors.oneOf()
    readback(actor),
    nondet kind=Set("none","wrong","ambiguous","exact").oneOf()
    nondet status=Set("none","pending","complete","failed").oneOf()
    provider(kind,status),
    reconcile,
    nondet index=1.to(4).oneOf()
    nondet kind=Set("sent","delivery").oneOf()
    nondet ok=Bool.oneOf()
    nondet mode=Set("complete","wrong-action","before","after").oneOf()
    callback(index,kind,ok,mode),
    restart(false),restart(true),
    s'=s
  }

  action approved=initWith(1,1,false).then(approveCard(1,1))
  action sent=approved.then(send(1,1,1,"complete","complete"))

  run conflictingCardCannotClaimAnotherReceiptTest = approved.then(approveCard(2,2))
    .then(send(1,1,1,"complete","complete")).then(send(2,2,2,"complete","complete"))
    .expect(s.reply=="invalid" and s.replyBinding==0 and s.memory.binding==1 and s.attempts==1 and s.cards.get(2).phase=="open")

  run exactReplayUsesFirstReceiptWithoutClaimTest = approved.then(approveCard(2,1))
    .then(send(1,1,1,"complete","complete")).then(send(2,2,1,"complete","complete"))
    .expect(s.reply=="submitted" and s.replyBinding==1 and s.attempts==1 and s.cards.get(2).phase=="open")

  run unapprovedOrMismatchedTextSendsNothingTest = approved.then(send(1,0,1,"complete","complete"))
    .expect(s.reply=="not-approved" and s.cards.get(1).phase=="open")
    .then(send(1,1,2,"complete","complete")).expect(s.reply=="not-approved")
    .then(send(1,1,1,"other-sim","complete")).expect(s.reply=="not-approved")
    .then(send(1,1,1,"other-recipient","complete"))
    .expect(s.reply=="not-approved" and s.attempts==0 and s.disk.binding==0 and s.cards.get(1).phase=="open")

  run expiredApprovalSendsNothingTest = approved.then(age).then(send(1,1,1,"complete","complete"))
    .expect(s.reply=="not-approved" and s.attempts==0 and s.disk.binding==0)

  run claimIsSingleUseWhenNothingWasJournaledTest = approved.then(send(1,1,1,"complete","journal-refused"))
    .expect(s.reply=="unavailable" and s.disk.binding==0 and s.cards.get(1).phase=="claimed")
    .then(restart(false)).then(send(2,1,1,"complete","complete"))
    .expect(s.reply=="not-approved" and s.attempts==0)
    .then(approveCard(2,2)).then(send(2,2,2,"complete","complete"))
    .expect(s.reply=="not-approved" and s.claimOwner==1 and s.attempts==0)

  run queuedCancellationClosesTheClaimTest = approved.then(send(1,1,1,"complete","cancel-queued"))
    .expect(s.reply=="cancelled" and s.attempts==0 and s.cards.get(1).phase=="claimed")
    .then(send(2,1,1,"complete","complete")).expect(s.reply=="cancelled" and s.attempts==0)

  run lateCardUsesTombstoneBindingTest = sent.then(approveCard(2,1)).then(age).then(prune)
    .then(send(2,2,1,"complete","complete"))
    .expect(s.reply=="expired" and s.replyBinding==0 and s.attempts==1)
    .then(restart(false)).then(send(1,2,2,"complete","complete"))
    .expect(s.reply=="invalid" and s.tombstoneBinding==1 and s.attempts==1)

  run simChangeAfterFirstRecipientIsUnknownTest = initWith(2,1,false).then(approveCard(1,1))
    .then(send(1,1,1,"complete","guard-change")).expect(s.reply=="unknown" and s.accepted==1 and s.attempts==1)
    .then(send(2,1,1,"complete","complete")).expect(s.reply=="unknown" and s.attempts==1)

  run callbackMemoryDoesNotImplyDurableEvidenceTest = sent.then(callback(1,"sent",true,"before"))
    .expect(s.memory.status=="sent" and s.disk.status=="submitted")
    .then(restart(false)).then(readback(2)).expect(s.reply=="submitted")

  run dispatchMarkerRefusalRecoversUnknownTest = approved.then(send(1,1,1,"complete","end-before"))
    .expect(s.memory.status=="submitted" and s.disk.dispatching)
    .then(restart(false)).then(send(2,1,1,"complete","complete")).expect(s.reply=="unknown" and s.attempts==1)

  run providerReadbackRequiresReportAndUniqueRowTest = sent.then(provider("ambiguous","complete"))
    .then(callback(1,"sent",true,"complete")).then(callback(1,"delivery",false,"complete"))
    .expect(s.memory.status=="sent" and s.memory.rows==Set())
    .then(provider("exact","complete")).then(reconcile).expect(s.memory.status=="delivered")

  run multipartReportDoesNotProveDeliveryTest = initWith(1,2,false).then(approveCard(1,1)).then(send(1,1,1,"complete","complete"))
    .then(provider("exact","complete")).then(callback(1,"sent",true,"complete")).then(callback(2,"sent",true,"complete"))
    .then(callback(1,"delivery",true,"complete")).then(callback(2,"delivery",true,"complete"))
    .expect(s.memory.status=="sent" and s.memory.delivered==Set())

  run emptyDivisionCannotReviveClaimedIdTest = approved.then(send(1,1,1,"empty-parts","complete"))
    .expect(s.reply=="denied" and s.disk.decision=="denied" and s.attempts==0 and s.cards.get(1).phase=="claimed")
    .then(send(2,1,1,"complete","complete")).expect(s.reply=="denied" and s.replyBinding==1 and s.attempts==0)
    .then(send(2,1,2,"complete","complete")).expect(s.reply=="invalid" and s.disk.binding==1 and s.attempts==0)

  run bothBridgesReceiveTheSameCallbackTest = sent.then(callback(1,"sent",true,"complete"))
    .expect(safety and s.listeners==actors and s.events==Map(1->1,2->1))

  run pausedAndDestroyedBridgesRetireOnlyTheirDeliveryTest = initWith(1,2,false)
    .then(approveCard(1,1)).then(send(1,1,1,"complete","complete"))
    .then(lifecycle(2,"pause")).then(callback(1,"sent",true,"complete"))
    .expect(s.events==Map(1->1,2->0) and s.listeners==actors)
    .then(lifecycle(2,"resume")).then(lifecycle(1,"destroy"))
    .then(callback(2,"sent",true,"complete"))
    .expect(safety and s.listeners==Set(2) and s.events==Map(1->1,2->1))

  run eightCallbackPublicationsReachBothBridgesTest = initWith(2,2,false)
    .then(approveCard(1,1)).then(send(1,1,1,"complete","complete"))
    .then(callback(1,"sent",true,"complete")).then(callback(2,"sent",true,"complete"))
    .then(callback(3,"sent",true,"complete")).then(callback(4,"sent",true,"complete"))
    .then(callback(1,"delivery",true,"complete")).then(callback(2,"delivery",true,"complete"))
    .then(callback(3,"delivery",true,"complete")).then(callback(4,"delivery",true,"complete"))
    .expect(safety and s.events==Map(1->8,2->8))
}
