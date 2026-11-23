/** Synthetic Android/Cloud primitives. Product controllers retain their own policy and state. */
export async function installCompositionPorts(page) {
  await page.addInitScript(() => {
    const runtime = window;
    const base = runtime.Capacitor.nativePromise;
    runtime.Capacitor.nativePromise = async (plugin,method,input) => {
      if(plugin==='AlphaConnection'&&method==='request') {
        const url=new URL(input.url);
        if(url.pathname==='/api/v1/user'){const account=runtime.residentStub.accounts.find(row=>'Bearer '+row.token===input.headers?.Authorization);if(!account)throw Error('Unmatched synthetic account');return{status:200,data:{success:true,data:{id:account.userId,email:account.email,organization_id:'11111111-2222-4333-8444-555555555555'}}};}
      }
      return base(plugin,method,input);
    };
  });
}

export const compositionEntry = `
  import {connectionController as controller} from '/src/runtime/connection-ui.tsx';
  import {VoiceAssistantSession} from '/src/runtime/voice-assistant.ts';
  const f=window.refinement={controller,events:[],voice:null,voiceRequests:[],ready:controller.initialize()};
  controller.subscribe(()=>{const s=controller.getSnapshot();f.events.push({owner:s.cloudAccount?.userId??null,open:s.open,busy:s.busy,step:s.signIn?.step??null});});
  f.startVoice=async()=>{
    const binding=await controller.prepareVoiceConversation(new AbortController().signal);
    f.voiceBinding=binding;
    f.voice=new VoiceAssistantSession({conversationId:binding.conversationId,
      assertCurrent(){if(!controller.voiceConversationCurrent(binding))throw new DOMException('Retired voice binding','AbortError');},
      async listen(handlers){f.listenHandlers=handlers;return{fullDuplex:true,async close(){},cancel(){}};},
      send(input){f.voiceRequests.push(input);return new Promise(resolve=>{f.voiceReply=()=>resolve({requestId:input.turnId,conversationId:binding.conversationId,userMessageId:'user',assistantMessageId:'reply',complete:true,text:'First sentence. Second sentence.'});});},
      speak(input){input.onStarted();return new Promise(()=>{});},onHeard(){}
    });await f.voice.start();
  };
  f.recheckVoice=()=>f.voice?.recheck();
  f.snapshot=()=>{
    const state=controller.getSnapshot();
    return{owner:state.cloudAccount?.userId??null,credential:!!window.flagOff.slots['cloud:production'],open:state.open,
      providerReady:state.residentInference==='cloud',
      voicePhase:f.voice?.getSnapshot().phase??'idle',voiceCapture:!!f.voice?.capture,voiceInputHeld:f.voice?.getSnapshot().inputHeld===true,voiceSends:f.voiceRequests.length,foreground:!document.hidden};
  };
`;
