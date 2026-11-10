package ai.elizaresearch.alphaphone;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/** Plain-JVM checks of the foreground voice rules. Not an Android, AudioTrack or device test. */
public final class NativeVoiceRulesTest {
 private static void check(boolean condition,String name){if(!condition)throw new AssertionError(name);}

 /** Like an AudioTrack before its start threshold: nothing plays until that many frames are buffered. */
 static final class ThresholdOutput implements StreamingSpeechPlayback.Output {
  final int threshold;long buffered;int silentFrames;boolean stopped;
  ThresholdOutput(int threshold){this.threshold=threshold;}
  public void play(){}
  public synchronized int write(float[] samples,int offset,int length){
   boolean silent=true;for(int i=offset;i<offset+length;i++)if(samples[i]!=0f)silent=false;
   if(silent)silentFrames+=length;
   buffered+=length;return length;
  }
  public synchronized long playedFrames(){return buffered>=threshold?buffered:0;}
  public long presentationNs(long frame){return VoiceLatencyTrials.UNSET;}
  public void setVolume(float volume){}
  public void abort(){}
  public synchronized void stop(){stopped=true;}
  public void release(){}
  @Override public int startFrames(){return threshold;}
 }
 static final class Events implements StreamingSpeechPlayback.Listener {
  final AtomicInteger ended=new AtomicInteger(),failed=new AtomicInteger();volatile String failure;
  final CountDownLatch done=new CountDownLatch(1);
  public void firstFrame(long nanos){}
  public void audible(long nanos,String clock){}
  public void ended(boolean silent){ended.incrementAndGet();done.countDown();}
  public void failed(String reason){failure=reason;failed.incrementAndGet();done.countDown();}
 }

 private static void permissionPause(){
  LiveCaptureAdmission gate=new LiveCaptureAdmission();
  LiveCaptureAdmission.Ticket asking=gate.begin("asking",1);
  gate.awaitPermission(asking);
  check(!gate.pause(),"the pause caused by the permission dialog keeps the epoch");
  check(gate.current(asking)&&gate.events(asking),"a capture waiting on the permission dialog survives the pause it causes");
  check(gate.permissionAnswered(asking),"the answered ticket may start");
  check(gate.pause()&&!gate.current(asking)&&!gate.events(asking),"once answered, a pause cancels and discards it");

  LiveCaptureAdmission.Ticket running=gate.begin("running",2);
  check(gate.pause()&&!gate.current(running),"a capture that never asked is cancelled by a pause");

  LiveCaptureAdmission.Ticket replaced=gate.begin("replaced",3);gate.awaitPermission(replaced);
  LiveCaptureAdmission.Ticket next=gate.begin("next",3);
  check(!gate.permissionAnswered(replaced),"a replaced request cannot start when its dialog is answered");
  check(gate.pause()&&!gate.current(next),"the replacement is not waiting on a dialog");

  LiveCaptureAdmission.Ticket stopped=gate.begin("stopped",4);gate.awaitPermission(stopped);gate.stop("stopped");
  check(gate.pause(),"a request stopped while its dialog shows no longer holds the epoch");
  check(!gate.permissionAnswered(stopped),"and cannot start");

  LiveCaptureAdmission.Ticket late=gate.begin("late",5);gate.stop("late");gate.awaitPermission(late);
  check(gate.pause(),"a cancelled ticket cannot begin waiting");
 }

 private static void openingRefusal(){
  String call=SpeechAudioFocusPolicy.CALL_ACTIVE;
  check(LiveCaptureAdmission.openingRefusal(false,null,false,call)==null,"an undisturbed opening is published");
  check(call.equals(LiveCaptureAdmission.openingRefusal(false,null,true,call)),"a call that began while the capture opened refuses it");
  check(call.equals(LiveCaptureAdmission.openingRefusal(false,call,false,call)),"a capture interrupted by a call that already ended is still refused");
  check("capture-replaced".equals(LiveCaptureAdmission.openingRefusal(false,"capture-replaced",true,call)),"the interruption names the reason");
  check(LiveCaptureAdmission.CANCELLED.equals(LiveCaptureAdmission.openingRefusal(true,call,true,call)),"lifecycle cancellation wins");
 }

 private static void assistWindow(){
  long limit=AssistInvocation.COLD_START_LIMIT_MS,window=AssistInvocation.LISTENER_WINDOW_MS;
  check(AssistInvocation.windowStart(1000,1000+window+3000)==1000+window+3000,"a cold start's window begins when its page loaded");
  long start=AssistInvocation.windowStart(1000,9000);
  check(AssistInvocation.take("listener",start,9000+window,false).equals("listener"),"a wake that had to load the page is still a listener invocation");
  check(AssistInvocation.take("listener",1000,9000,false).equals("assist"),"measured from arrival the same wake had expired");
  check(AssistInvocation.take("listener",start,9001+window,false).equals("assist"),"the window after the load is the usual one");
  check(AssistInvocation.windowStart(1000,1000+limit)==1000+limit&&AssistInvocation.windowStart(1000,1001+limit)==1000,"a page that took too long never restarts the window");
  check(AssistInvocation.windowStart(1000,999)==1000,"a clock that went backwards keeps the arrival time");
  check(AssistInvocation.take("listener",AssistInvocation.windowStart(1000,5000),5100,true).equals("assist"),"an invocation that arrived behind the keyguard stays assist");
 }

 private static void requestRules(){
  check(VoiceRequestRules.speakerBusy(false,false,true),"replace:false is refused while a streamed utterance plays");
  check(VoiceRequestRules.speakerBusy(false,true,false),"replace:false is refused while a clip is prepared");
  check(!VoiceRequestRules.speakerBusy(false,false,false),"an idle speaker accepts replace:false");
  check(!VoiceRequestRules.speakerBusy(true,true,true)&&!VoiceRequestRules.speakerBusy(null,true,true),"replace:true and a missing replace always replace");
  check(VoiceRequestRules.barrierRefused(false)==VoiceRequestRules.DrainStep.RETRY,"a refused barrier is offered again");
  check(VoiceRequestRules.barrierRefused(true)==VoiceRequestRules.DrainStep.ABANDON,"a destroyed plugin abandons it");
  check(VoiceRequestRules.drainResult(false,null)==null,"a clean drain resolves");
  check("Recording cancellation failed".equals(VoiceRequestRules.drainResult(false,"Recording cancellation failed")),"a failed capture cancellation is reported after the drain");
  check("Voice unavailable".equals(VoiceRequestRules.drainResult(true,null)),"a destroyed plugin reports unavailable");
 }

 private static void focusAbandon(){
  SpeechAudioFocusPolicy focus=new SpeechAudioFocusPolicy();
  check(!focus.released(),"nothing to abandon before a request");
  focus.granted(false);check(!focus.released(),"a denied request leaves nothing to abandon");
  focus.granted(true);
  check(focus.changed(SpeechAudioFocusPolicy.Event.LOSS_TRANSIENT)==SpeechAudioFocusPolicy.Action.STOP&&!focus.held(),"a transient loss stops speech");
  check(focus.released(),"the request granted before a transient loss is still abandoned");
  check(!focus.released(),"and only once");
  focus.granted(true);check(focus.released()&&!focus.held(),"a held request is abandoned when speech ends");
 }

 private static void shortUtterance()throws Exception{
  check(StreamingSpeechPlayback.silencePadding(2400,4800)==2400,"a short stream is padded up to the threshold");
  check(StreamingSpeechPlayback.silencePadding(4800,4800)==0&&StreamingSpeechPlayback.silencePadding(9600,4800)==0,"a stream at or past the threshold is not padded");
  check(StreamingSpeechPlayback.silencePadding(0,4800)==0&&StreamingSpeechPlayback.silencePadding(100,0)==0,"nothing written, or no threshold, pads nothing");
  check(StreamingSpeechPlayback.startThreshold(24000,4800)==480,"20 ms of audio starts playback");
  check(StreamingSpeechPlayback.startThreshold(24000,240)==240&&StreamingSpeechPlayback.startThreshold(8000,0)==1,"never above the buffer, never below one frame");

  ThresholdOutput output=new ThresholdOutput(4800);Events events=new Events();
  StreamingSpeechPlayback playback=new StreamingSpeechPlayback(24_000,24_000,.01f,()->output,events,System::nanoTime);
  float[] word=new float[2400];java.util.Arrays.fill(word,.5f);
  check(playback.offer(word,true),"the whole utterance is queued");
  playback.start();
  check(events.done.await(6,TimeUnit.SECONDS),"the utterance settles");
  check(events.ended.get()==1&&events.failed.get()==0,"an utterance shorter than the start threshold plays and ends: "+events.failure);
  check(output.silentFrames==2400&&output.buffered==4800,"padded with exactly the missing silence");
  check(output.stopped,"the output is stopped after the drain");
  check(playback.join(2000),"writer exits");
 }

 public static void main(String[] args)throws Exception{
  permissionPause();openingRefusal();assistWindow();requestRules();focusAbandon();shortUtterance();
  System.out.println("PASS native voice rules");
 }
}
