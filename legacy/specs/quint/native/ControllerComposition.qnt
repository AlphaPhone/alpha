module CompositionIdentity {
  const instance: int
  import IdentitySession.* from "../services/IdentitySession"
  export IdentitySession.s
  export IdentitySession.init
  export IdentitySession.safety
  export IdentitySession.begin
  export IdentitySession.codeVerified
  export IdentitySession.exchanged
  export IdentitySession.writeReceipt
  export IdentitySession.writeKey
  export IdentitySession.ack
  export IdentitySession.revokePrevious
  export IdentitySession.releaseSteward
  export IdentitySession.cancel
  export IdentitySession.signOut
  export IdentitySession.restart
  export IdentitySession.cooldownElapsed
}
module CompositionVoice {
  const instance: int
  import VoiceSession.* from "./VoiceSession"
  export VoiceSession.s
  export VoiceSession.init
  export VoiceSession.safety
  export VoiceSession.start
  export VoiceSession.stop
  export VoiceSession.segment
  export VoiceSession.beginSubmission
  export VoiceSession.inputClosed
  export VoiceSession.inputCloseFailed
  export VoiceSession.reply
  export VoiceSession.sentenceFinished
  export VoiceSession.playbackFinished
}

/// Native activation, renderer publication and captured consumer bindings are separate lifetimes.
module ControllerComposition {
  import CompositionIdentity(instance=101) as Identity
  import CompositionVoice(instance=103) as Voice
  type Host = {owner:int, epoch:int, foreground:bool, connectionOpen:bool, providerReady:bool,
    voiceOwner:int, voiceEpoch:int}
  var host:Host
  val state = {identity:Identity::s, voice:Voice::s, host:host}
  action init = all {Identity::init, Voice::init,
    host'={owner:0,epoch:0,foreground:true,connectionOpen:false,providerReady:false,
      voiceOwner:0,voiceEpoch:0}}
  action keepIdentity = Identity::s'=Identity::s
  action keepVoice = Voice::s'=Voice::s
  action keepHost = host'=host
  action keep = all {keepIdentity,keepVoice,keepHost}
  action stopVoice = if(Voice::s.phase=="idle")keepVoice else Voice::stop
  val voiceSubmissions = Voice::s.sent.size()
  val credentialPresent = Identity::s.owner!=0 and (Identity::s.key or Identity::s.oldKey)
  val accountReady = host.owner!=0 and host.providerReady and not(host.connectionOpen)
  action beginSignIn = all {host.foreground,Identity::begin("email"),stopVoice,
    host'={...host,connectionOpen:true}}
  action cooldownElapsed = all {Identity::cooldownElapsed,keepVoice,keepHost}
  action verifyCode = all {Identity::codeVerified(false),keepVoice,keepHost}
  action identityExchanged = all {Identity::exchanged,keepVoice,keepHost}
  action saveIdentityReceipt = all {Identity::writeReceipt,keepVoice,keepHost}
  action acceptIdentityKey = all {Identity::writeKey,keepVoice,keepHost}
  action acknowledgeIdentity = all {Identity::ack(true),keepVoice,keepHost}
  action revokePreviousIdentity = all {Identity::revokePrevious(true),keepVoice,keepHost}
  action releaseIdentitySession = all {Identity::releaseSteward,keepVoice,keepHost}
  /// The native result reaches the renderer only after activation. Existing consumers keep the captured old binding until then.
  action publishIdentity = all {
    Identity::s.activation.acknowledged,Identity::s.owner!=0,host.owner!=Identity::s.owner,host.epoch<3,
    keepIdentity,stopVoice,
    host'={...host,owner:Identity::s.owner,epoch:host.epoch+1,connectionOpen:false,providerReady:false}
  }
  action bindingReady = all {host.owner!=0,keepIdentity,keepVoice,host'={...host,providerReady:true}}
  action cancelSignIn = all {Identity::cancel,keepVoice,keepHost}
  action signOut = all {Identity::signOut,stopVoice,host.epoch<3,
    host'={...host,owner:0,epoch:host.epoch+1,providerReady:false,connectionOpen:true}}
  action hide = all {stopVoice,keepIdentity,host'={...host,foreground:false}}
  action resume = all {keepIdentity,keepVoice,host'={...host,foreground:true}}
  action restartConsumers = all {Identity::restart,stopVoice,
    host'={...host,connectionOpen:false}}
  action startVoice = all {accountReady,host.foreground,Voice::start(false,true),keepIdentity,
    host'={...host,voiceOwner:host.owner,voiceEpoch:host.epoch}}
  action voiceSegment = all {Voice::segment(Voice::s.session,true),keepIdentity,keepHost}
  action voiceBeginSubmission = all {Voice::beginSubmission(true),keepIdentity,keepHost}
  action voiceInputClosed = all {accountReady,Voice::inputClosed,keepIdentity,keepHost}
  action voiceInputFailed = all {Voice::inputCloseFailed,keepIdentity,keepHost}
  action voiceReply(session:int,turn:int):bool = all {Voice::reply(session,turn,false),keepIdentity,keepHost}
  action stopVoiceSession = all {stopVoice,keepIdentity,keepHost}
  action step = any {beginSignIn,verifyCode,identityExchanged,saveIdentityReceipt,acceptIdentityKey,
    acknowledgeIdentity,revokePreviousIdentity,releaseIdentitySession,publishIdentity,bindingReady,cancelSignIn,signOut,
    hide,resume,restartConsumers,startVoice,voiceSegment,voiceBeginSubmission,voiceInputClosed,voiceInputFailed,
    voiceReply(0,1),voiceReply(1,1),voiceReply(2,1),stopVoiceSession,keep}
  val RendererHasActivatedCredential = host.owner!=0 implies Identity::s.activation.acknowledged or Identity::s.oldKey or Identity::s.owner!=host.owner
  val VoiceBindingCurrent = Voice::s.phase.in(Set("idle","error")) or
    (accountReady and host.foreground and host.voiceOwner==host.owner and host.voiceEpoch==host.epoch)
  val safety = Identity::safety and Voice::safety and
    RendererHasActivatedCredential and VoiceBindingCurrent
  run signedInSetup = init.then(beginSignIn).then(verifyCode).then(identityExchanged).then(saveIdentityReceipt)
    .then(acceptIdentityKey).then(acknowledgeIdentity).then(releaseIdentitySession).then(publishIdentity).then(bindingReady).then(cooldownElapsed)
  run readySetup = signedInSetup
  run signInAndVoiceTest = signedInSetup.then(startVoice).then(voiceSegment).then(voiceBeginSubmission).then(voiceInputClosed).then(stopVoiceSession).expect(safety)
  run nativeCommitPrecedesRendererPublicationTest = signedInSetup.then(beginSignIn).then(verifyCode).then(identityExchanged).then(saveIdentityReceipt).then(acceptIdentityKey)
    .expect(host.owner==1 and Identity::s.owner==2 and safety).then(acknowledgeIdentity).then(revokePreviousIdentity).then(releaseIdentitySession)
    .then(publishIdentity).then(bindingReady).expect(host.owner==2 and safety)
  run cancelledReplacementKeepsOldBindingTest = signedInSetup.then(startVoice).then(beginSignIn).then(cancelSignIn)
    .expect(host.owner==1 and Voice::s.phase=="idle" and safety)
  run lateVoiceReplyCannotUseReplacementTest = signedInSetup.then(startVoice).then(voiceSegment).then(voiceBeginSubmission).then(voiceInputClosed)
    .then(beginSignIn).then(voiceReply(0,1)).expect(Voice::s.phase=="idle" and safety)
  // Synthetic checker canary, excluded from step and source refinement claims.
  action unsafeUncoordinatedKey = all {Identity::s'={...Identity::s,owner:2},keepVoice,keepHost}
  run uncoordinatedIdentityChangeDetectedTest = signedInSetup.then(startVoice).then(unsafeUncoordinatedKey)
    .expect(Identity::s.owner==2 and not(safety))

}
