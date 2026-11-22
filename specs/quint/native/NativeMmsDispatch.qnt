// Alpha's MMS send: refused on the agent bridge, sent only from the Messages composer, whose
// Send is the owner's confirmation. Shared SMS/MMS ID ownership and outgoing PDU custody.
// Binding 1 and 2 differ in composed attachment bytes. Binding 3 is SMS.
module NativeMmsDispatch {
  type Record = { binding: int, status: str, dispatching: bool, boot: int, row: bool }
  type Events = {listeners: Set[int], deliveries: int -> int}
  type State = {
    groupRecipients: bool, source: str,
    reply: str, replyKind: str, replyBinding: int, composedBinding: int, memory: Record, disk: Record, tombstoneBinding: int,
    smsAttempts: int, mmsAttempts: int, mmsAccepted: int,
    files: int, mmsBox: int, deletedMms: int, events: Events,
    role: bool, carrier: bool, size: bool, provider: bool, locked: bool, process: int, boot: int
  }
  var s: State
  val actors = Set(1,2)
  val noRecord = {binding:0,status:"none",dispatching:false,boot:0,row:false}
  val noEvents = {listeners:actors,deliveries:actors.mapBy(_=>0)}

  action initWith(groupRecipients: bool): bool = s' = {
    groupRecipients:groupRecipients,source:"none",reply:"none",replyKind:"none",replyBinding:0,composedBinding:0,
    memory:noRecord,disk:noRecord,tombstoneBinding:0,smsAttempts:0,mmsAttempts:0,mmsAccepted:0,files:0,mmsBox:0,deletedMms:0,events:noEvents,
    role:true,carrier:true,size:true,provider:true,locked:false,process:1,boot:1
  }
  action init = {
    nondet groupRecipients=Bool.oneOf()
    initWith(groupRecipients)
  }

  pure def isMms(binding: int): bool = binding.in(Set(1,2))
  pure def wireKind(binding: int): str = if (isMms(binding)) "mms-send" else "sms-send"
  pure def reject(state: State, status: str): State = { ...state,reply:status,replyKind:"none",replyBinding:0,composedBinding:0 }
  pure def receipt(state: State): State = {
    ...state,reply:state.memory.status,replyKind:wireKind(state.memory.binding),replyBinding:state.memory.binding,composedBinding:0
  }
  pure def blocked(state: State, binding: int): bool =
    state.locked or (isMms(binding) and not(state.role and state.carrier))
  pure def retained(state: State): bool = state.memory.binding!=0 or state.tombstoneBinding!=0
  pure def existing(state: State, binding: int): State =
    if (state.tombstoneBinding!=0) reject(state,if (state.tombstoneBinding==binding) "expired" else "invalid")
    else if (state.memory.binding==binding) receipt(state) else reject(state,"invalid")
  pure def decide(state: State, binding: int, outcome: str): State =
    if (retained(state)) reject(state,"unavailable")
    else {
      val record={ ...noRecord,binding:binding,status:outcome,boot:state.boot }
      receipt({ ...state,memory:record,disk:record })
    }

  // The agent bridge's sendMms. No card proposes an MMS, so nothing can confirm one here:
  // the bridge refuses it before reading, journaling, staging or sending anything.
  action request(actor: int, binding: int, input: str): bool = all {
    actors.contains(actor), isMms(binding), input.in(Set("valid","bad-bytes")),
    s' = { ...reject(s,if (s.locked) "unavailable" else "not-approved"),source:"agent" }
  }

  val modes = Set("complete","throw-before","throw-after","begin-before","end-before")
  // The composer's own send of a validated message: journal admission, dispatch and its receipt.
  pure def composed(state: State, binding: int, mode: str): State =
    if (blocked(state,binding)) decide(state,binding,"denied")
    else if (isMms(binding) and not(state.size)) reject(state,"too-large")
    else if (mode=="begin-before") decide(state,binding,"denied")
    else {
      val mms=isMms(binding)
      val row=if (mms) state.provider else state.role
      val submitted=mode!="throw-before" and mode!="throw-after"
      val record={binding:binding,status:if (submitted) "submitted" else "unknown",dispatching:false,boot:state.boot,row:row}
      val disk=if (mode=="end-before") { ...record,status:"unknown",dispatching:true } else record
      receipt({ ...state,memory:record,disk:disk,
        smsAttempts:if (mms) 0 else (if (state.groupRecipients) 2 else 1),
        mmsAttempts:if (mms) 1 else 0, mmsAccepted:if (mms and mode!="throw-before") 1 else 0,
        files:if (mms and submitted) 1 else 0,mmsBox:if (mms and row) 4 else 0,
        deletedMms:if (mms and not(row)) 1 else 0 })
    }

  // The owner's Send in the Messages composer (binding 3 is a text from the same composer).
  // A retained operation ID answers from the shared journal before anything is staged.
  action compose(actor: int, binding: int, input: str, mode: str): bool = all {
    actors.contains(actor), binding.in(1.to(3)), input=="valid" or (input=="bad-bytes" and isMms(binding)), modes.contains(mode),
    mode=="complete" or (isMms(binding) and input=="valid" and not(retained(s)) and not(blocked(s,binding)) and s.size
      and (mode!="end-before" or s.provider)),
    val outcome=if (s.locked) reject(s,"unavailable")
      else if (input=="bad-bytes") reject(s,"invalid")
      else if (retained(s)) existing(s,binding)
      else composed(s,binding,mode)
    s' = { ...outcome,composedBinding:binding,source:"composer" }
  }

  // Two composer sends with one operation ID, both queued before either is admitted: the first
  // dispatches, and the second recovers only the receipt of exactly its own binding and kind.
  action composeTogether(first: int, second: int): bool = all {
    first.in(1.to(3)), second.in(1.to(3)), not(s.locked), not(retained(s)),
    not(blocked(s,first)), not(blocked(s,second)), s.size,
    val outcome=existing(composed(s,first,"complete"),second)
    s' = { ...outcome,composedBinding:second,source:"composer" }
  }

  action preflightConflict(actor: int, changedField: str): bool = all {
    actors.contains(actor), changedField.in(Set("body","recipients","sim")), s.memory.binding!=0, not(s.locked),
    s'={ ...reject(s,"invalid"),source:"composer" }
  }
  action prune = all {
    isMms(s.memory.binding), s.memory==s.disk, s.memory.status.in(Set("sent","failed")), s.files==0,
    s'={ ...s,memory:noRecord,disk:noRecord,tombstoneBinding:s.memory.binding,source:"none" }
  }

  action readback(actor: int, mms: bool): bool = all {
    actors.contains(actor),
    val outcome=if (s.locked) reject(s,"unavailable")
      else if (s.memory.binding==0 or isMms(s.memory.binding)!=mms) reject(s,"not-found")
      else receipt(s)
    s' = { ...outcome,source:"none" }
  }

  val callbackModes=Set("complete","bad-uri","foreign-kind","failure-conf","unreadable-conf","before","after")
  // Preserve four publications per bridge; the two live bridges each receive the same callback.
  pure def noticeBudget(events: Events): bool = events.deliveries.keys()==actors and
    actors.forall(actor=>events.deliveries.get(actor)>=0 and events.deliveries.get(actor)<=4)
  action callback(mode: str, ok: bool): bool = all {
    callbackModes.contains(mode), s.mmsAccepted==1, isMms(s.memory.binding),
    val finalAlready=s.memory.status.in(Set("sent","failed"))
    all {
      not(finalAlready and mode.in(Set("before","after"))),
      val candidateState=if (mode.in(Set("bad-uri","foreign-kind"))) s
      else {
        val status=if (finalAlready) s.memory.status else if (ok and mode!="failure-conf") "sent" else "failed"
        val record={ ...s.memory,status:status }
        val disk=if (finalAlready or mode=="before") s.disk else record
        val box=if (not(mode.in(Set("before","after"))) and s.role and s.mmsBox==4)
          (if (status=="sent") 2 else 5) else s.mmsBox
        { ...s,memory:record,disk:disk,files:0,mmsBox:box,
          events:if (not(finalAlready) and not(s.locked) and not(mode.in(Set("before","after"))))
            { ...s.events,deliveries:actors.mapBy(actor=>s.events.deliveries.get(actor)+
              (if (s.events.listeners.contains(actor)) 1 else 0)) } else s.events }
      }
      all {noticeBudget(candidateState.events), s' = { ...candidateState,source:"none" }}
    }
  }

  val controlKinds=Set("role","carrier","size","provider","locked")
  action controls(kind: str, allowed: bool): bool = all {
    controlKinds.contains(kind),
    val state={ ...s,source:"none" }
    s' = if (kind=="role") { ...state,role:allowed } else if (kind=="carrier") { ...state,carrier:allowed }
      else if (kind=="size") { ...state,size:allowed }
      else if (kind=="provider") { ...state,provider:allowed } else { ...state,locked:allowed }
  }

  action restart(reboot: bool): bool = all {
    s.process<3,
    val boot=if (reboot) s.boot+1 else s.boot
    val disk=s.disk
    val recovered=if (disk.dispatching or (reboot and disk.status=="submitted"))
      { ...disk,status:"unknown",dispatching:false } else disk
    s'=reject({ ...s,boot:boot,process:s.process+1,memory:recovered,disk:recovered,events:noEvents,source:"none" },"none")
  }

  val OneKindOwnsDispatch = s.smsAttempts<=2 and s.mmsAccepted<=s.mmsAttempts and s.mmsAttempts<=1
    and (s.smsAttempts==0 or s.mmsAttempts==0)
  val DurableHandoffBinding = (s.mmsAttempts==0 or isMms(s.disk.binding) or isMms(s.tombstoneBinding))
    and (s.smsAttempts==0 or s.disk.binding==3)
  val PduHeldForAcceptedMms = s.files==0 or (s.files==1 and s.mmsAccepted==1 and isMms(s.disk.binding))
  val MmsNeverClaimsDelivery = (not(isMms(s.memory.binding)) or s.memory.status!="delivered")
    and (not(isMms(s.disk.binding)) or s.disk.status!="delivered") and (s.replyKind!="mms-send" or s.reply!="delivered")
  val OutboxOnlyForMms = s.mmsBox==0 or isMms(s.tombstoneBinding) or (isMms(s.disk.binding) and s.disk.row)
  val TombstoneRetiresRecord = s.tombstoneBinding==0 or (s.memory.binding==0 and s.disk.binding==0)
  val ComposedReceiptMatchesSend = s.composedBinding==0 or s.replyBinding==0
    or (s.replyBinding==s.composedBinding and s.replyKind==wireKind(s.composedBinding))
  // The agent bridge never yields an MMS receipt: it answers only that nothing was sent.
  val AgentBridgeRefusesMms = s.source!="agent" or (s.reply.in(Set("not-approved","unavailable")) and s.replyBinding==0)
  val LiveBridgeListeners = s.events.listeners==actors
  val PerBridgeNoticeCapacity = noticeBudget(s.events)
  val safety = OneKindOwnsDispatch and DurableHandoffBinding and PduHeldForAcceptedMms and MmsNeverClaimsDelivery
    and OutboxOnlyForMms and TombstoneRetiresRecord and ComposedReceiptMatchesSend and AgentBridgeRefusesMms
    and LiveBridgeListeners and PerBridgeNoticeCapacity

  action step = any {
    nondet actor=actors.oneOf()
    nondet binding=1.to(2).oneOf()
    nondet input=Set("valid","bad-bytes").oneOf()
    request(actor,binding,input),
    nondet actor=actors.oneOf()
    nondet binding=1.to(3).oneOf()
    nondet input=Set("valid","bad-bytes").oneOf()
    nondet mode=modes.oneOf()
    compose(actor,binding,input,mode),
    nondet first=1.to(3).oneOf()
    nondet second=1.to(3).oneOf()
    composeTogether(first,second),
    nondet actor=actors.oneOf()
    nondet changedField=Set("body","recipients","sim").oneOf()
    preflightConflict(actor,changedField),
    prune,
    nondet actor=actors.oneOf()
    nondet mms=Bool.oneOf()
    readback(actor,mms),
    nondet mode=callbackModes.oneOf()
    nondet ok=Bool.oneOf()
    callback(mode,ok),
    nondet kind=controlKinds.oneOf()
    nondet allowed=Bool.oneOf()
    controls(kind,allowed),
    restart(false),restart(true),s'=s
  }

  action composedA = initWith(false).then(compose(1,1,"valid","complete"))

  run agentBridgeRefusesMmsTest = initWith(false).then(request(1,1,"valid"))
    .expect(s.reply=="not-approved" and s.mmsAttempts==0 and s.memory.binding==0 and s.files==0 and s.mmsBox==0)
    .then(request(2,2,"bad-bytes")).expect(s.reply=="not-approved" and s.disk.binding==0)
    .then(controls("locked",true)).then(request(1,1,"valid")).expect(s.reply=="unavailable" and s.mmsAttempts==0)

  run conflictingAttachmentCannotClaimAnotherReceiptTest = initWith(false).then(composeTogether(1,2))
    .expect(s.reply=="invalid" and s.replyBinding==0 and s.mmsAttempts==1 and s.files==1)
    .then(compose(2,2,"valid","complete")).expect(s.reply=="invalid")

  run mmsCannotClaimSmsWireReceiptTest = initWith(false).then(composeTogether(3,1))
    .expect(s.reply=="invalid" and s.replyBinding==0 and s.smsAttempts==1 and s.mmsAttempts==0 and s.files==0)
    .then(readback(2,true)).expect(s.reply=="not-found")

  run retiredMmsRetainsExactBindingTest = composedA.then(callback("complete",true)).then(prune)
    .then(compose(2,1,"valid","complete"))
    .expect(s.reply=="expired" and s.tombstoneBinding==1 and s.files==0 and s.mmsAttempts==1)
    .then(restart(false)).then(compose(2,2,"valid","complete")).expect(s.reply=="invalid")

  run retainedIdRejectsDifferentBodyRecipientsAndSimTest = composedA
    .then(preflightConflict(2,"body")).expect(s.reply=="invalid")
    .then(preflightConflict(2,"recipients")).expect(s.reply=="invalid")
    .then(preflightConflict(2,"sim")).expect(s.reply=="invalid" and s.mmsAttempts==1 and s.memory.binding==1)

  run stagedSmsRejectsMmsReceiptTest = initWith(false).then(composeTogether(1,3))
    .expect(s.reply=="invalid" and s.mmsAttempts==1 and s.smsAttempts==0)

  run exactComposerRetryUsesFirstReceiptTest = initWith(false).then(composeTogether(1,1))
    .expect(s.reply=="submitted" and s.replyBinding==1 and s.mmsAttempts==1 and s.files==1)

  run invalidAttachmentIsNeverJournaledTest = initWith(false).then(compose(1,1,"bad-bytes","complete"))
    .expect(s.reply=="invalid" and s.memory.binding==0 and s.mmsAttempts==0)

  run carrierFailureOverridesAndroidSuccessTest = composedA.then(callback("bad-uri",true)).then(callback("foreign-kind",true))
    .expect(s.files==1 and s.memory.status=="submitted").then(callback("failure-conf",true))
    .expect(s.memory.status=="failed" and s.files==0 and s.mmsBox==5)

  run providerChildRefusalKeepsRadioAndDeletesPartialRowTest = initWith(false).then(controls("provider",false))
    .then(compose(1,1,"valid","complete")).expect(s.deletedMms==1 and s.mmsAttempts==1 and not(s.disk.row))
    .then(callback("complete",true)).expect(s.memory.status=="sent" and s.mmsBox==0 and s.files==0)

  run failedCallbackWriteDeletesPduButLosesEvidenceOnRestartTest = composedA.then(callback("before",true))
    .expect(s.files==0 and s.memory.status=="sent" and s.disk.status=="submitted" and s.mmsBox==4)
    .then(restart(false)).expect(s.memory.status=="submitted" and s.mmsAttempts==1)

  run interruptedHandoffRecoversWithoutResendTest = initWith(false).then(compose(1,1,"valid","end-before")).then(restart(false))
    .expect(s.disk.status=="unknown" and s.files==1).then(compose(2,1,"valid","complete"))
    .expect(s.reply=="unknown" and s.mmsAttempts==1).then(callback("complete",true))
    .expect(s.disk.status=="sent" and s.files==0)

  run bothMmsBridgesReceiveAndRestartRetiresTheirCountersTest = composedA.then(callback("complete",true))
    .expect(safety and s.events.listeners==actors and s.events.deliveries==Map(1->1,2->1))
    .then(restart(false)).expect(safety and s.events==noEvents)

  run lockedMmsCallbackCannotPublishOrReplayALateNoticeTest = composedA.then(controls("locked",true))
    .then(callback("complete",true)).expect(s.events==noEvents)
    .then(controls("locked",false)).then(callback("complete",true))
    .expect(safety and s.events==noEvents)
}
