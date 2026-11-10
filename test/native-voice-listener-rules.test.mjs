import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {root, nativeSource, fixture, runJvm} from './fixtures/jvm-tools.mjs';

// Host-JVM checks of the pure voice and listener rules plus source contracts for their Android
// wiring. Not AudioTrack, AudioRecord, foreground-service, permission-dialog or device evidence.
const read = name => fs.readFileSync(nativeSource(name), 'utf8');
const sense = name => join(root, 'android/sense/src/main/java/ai/elizaresearch/alphaphone/sense', name);
const strip = source => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

test('voice rules: permission pause, call during opening, assist window, drain, replace, focus and short utterances (host JVM)', () => {
  const sources = ['LiveCaptureAdmission.java', 'AssistInvocation.java', 'VoiceRequestRules.java', 'SpeechAudioFocusPolicy.java', 'VoiceLatencyTrials.java', 'SpeechPcmQueue.java', 'StreamingSpeechPlayback.java'].map(nativeSource);
  assert.match(runJvm([...sources, fixture('NativeVoiceRulesTest.java')], 'ai.elizaresearch.alphaphone.NativeVoiceRulesTest'), /^PASS native voice rules/);
});

test('listener rules: lease observation and the foreground-service start contract (host JVM)', () => {
  assert.match(runJvm([sense('IndicatorLease.java'), sense('ListenerPolicy.java'), fixture('ListenerServiceRulesTest.java')], 'ai.elizaresearch.alphaphone.sense.ListenerServiceRulesTest'), /^PASS listener service rules/);
});

test('the first microphone grant keeps the live capture request it paused the activity for', () => {
  const plugin = strip(read('AlphaVoiceCloudPlugin.java'));
  assert.match(plugin, /livePermissionEpochs\.put\(call\.getCallbackId\(\),ticket\);liveAdmission\.awaitPermission\(ticket\);if\(!LateLaunch\.ask\(/, 'the ticket is marked before the dialog is requested');
  assert.match(plugin, /livePermissionEpochs\.remove\(call\.getCallbackId\(\)\);liveAdmission\.permissionAnswered\(ticket\);\}return;\}/, 'a dialog that could not be shown stops holding the pause');
  assert.match(plugin, /handleOnPause\(\)\{speechForeground=false;boolean liveCancelled=liveAdmission\.pause\(\);releaseLiveCapture\(\);/, 'pause asks the admission instead of cancelling outright');
  assert.match(plugin, /if\(permissionEpochs\.isEmpty\(\)&&liveCancelled\)epoch\.incrementAndGet\(\);/, 'the epoch survives either pending permission request');
  assert.match(plugin, /ticket==null\|\|!liveAdmission\.permissionAnswered\(ticket\)\|\|ticket\.epoch!=epoch\.get\(\)/);
  assert.match(plugin, /main\.post\(\(\)->startLive\(call,ticket\)\);\}/, 'the foreground check runs after the resume that follows the dialog');
  assert.match(plugin, /private void stopLiveCapture\(\)\{liveAdmission\.cancelAll\(\);releaseLiveCapture\(\);\}/, 'destroy still cancels everything');
});

test('a call or a recording that begins while live capture opens stops it, and one capture owns the microphone', () => {
  const plugin = strip(read('AlphaVoiceCloudPlugin.java')), capture = strip(read('AlphaLiveVoiceCapture.java'));
  assert.match(plugin, /liveCurrent=next;\s*try\{\s*next\.start\(\);/, 'the opening capture is interruptible before it starts');
  assert.match(plugin, /String refusal=LiveCaptureAdmission\.openingRefusal\(false,next\.interruption\(\),focus!=null&&focus\.callActive\(\),SpeechAudioFocusPolicy\.CALL_ACTIVE\);\s*if\(refusal!=null\)\{next\.stop\(\);retireLive\(next\);/, 'the call state is checked again before publication');
  assert.match(plugin, /if\(focus!=null&&focus\.callActive\(\)\)\{closeNativePipe\(id,true,System\.currentTimeMillis\(\)\);rejectLiveOpening\(call,SpeechAudioFocusPolicy\.CALL_ACTIVE\);return;\}\s*AlphaLiveVoiceCapture next=/, 'and after the transport started, before the microphone opens');
  assert.match(plugin, /\(\)->active\.interrupt\(SpeechAudioFocusPolicy\.CALL_ACTIVE\),\(\)->active\.interruptPending\(SpeechAudioFocusPolicy\.CALL_ACTIVE\)\)/, 'a busy stop worker still ends the capture');
  assert.doesNotMatch(plugin, /live=next;liveCurrent=next;/);
  assert.equal((plugin.match(/retireLive\(live\);live=null;/g) || []).length, 3, 'the interruption handle is dropped wherever the capture is cleared');
  assert.match(capture, /void interruptPending\(String reason\)\{interruption=reason;cancelPending\(\);\}/);
  // Exclusivity between the recorder and live capture, both ways.
  assert.match(plugin, /JSObject started=capture\.start\(limit\);replaceLiveCapture\(\);call\.resolve\(started\);/, 'a started recording ends the live capture');
  assert.match(plugin, /if\(capture!=null\)capture\.stopAutomatically\(\);\s*final NativeLiveVoicePipe pipe;/, 'a live capture stops an open recording before it opens the microphone');
  assert.match(plugin, /active\.interrupt\(CAPTURE_REPLACED\)/);
});

test('voice cancellation always queues its barrier and replace:false sees a playing stream', () => {
  const plugin = strip(read('AlphaVoiceCloudPlugin.java'));
  const cancel = plugin.slice(plugin.indexOf('@PluginMethod public void cancelRecording('), plugin.indexOf('private static String required('));
  assert.doesNotMatch(cancel, /finishDrain\(false,"Recording cancellation failed"\)|finishDrain\(false,"Voice cancellation is unavailable"\)/, 'no path leaves draining set without a barrier on its way');
  assert.match(cancel, /try\{capture\.cancel\(\);\}catch\(RuntimeException error\)\{failure="Recording cancellation failed";\}\s*submitDrainBarrier\(failure\);/);
  assert.match(cancel, /finishDrain\(true,VoiceRequestRules\.drainResult\(destroyed,captureFailure\)\)/);
  assert.match(cancel, /==VoiceRequestRules\.DrainStep\.RETRY\)main\.postDelayed\(\(\)->submitDrainBarrier\(captureFailure\),VoiceRequestRules\.DRAIN_RETRY_MS\);/);
  const audio = plugin.slice(plugin.indexOf('private void synthesizeAudio(PluginCall call,boolean paired,String reviewed)'), plugin.indexOf('@PluginMethod public void play('));
  assert.match(audio, /if\(VoiceRequestRules\.speakerBusy\(call\.getBoolean\("replace",true\),playbackFile!=null,streamPlayback!=null\)\)\{file\.delete\(\);request\.failure="Speaker is in use";request\.failureCode="playback-busy";return;\}/);
});

test('focus is abandoned after any granted request and short streams reach the start threshold', () => {
  const focus = strip(read('AlphaSpeechAudioFocus.java')), output = strip(read('AudioTrackSpeechOutput.java'));
  assert.match(focus, /boolean abandon=policy\.released\(\);\s*if\(abandon&&audio!=null\)try\{audio\.abandonAudioFocusRequest\(request\);\}/);
  assert.match(output, /SDK_INT>=android\.os\.Build\.VERSION_CODES\.S\)try\{track\.setStartThresholdInFrames\(StreamingSpeechPlayback\.startThreshold\(rate,track\.getBufferCapacityInFrames\(\)\)\);\}/);
  assert.match(output, /public int startFrames\(\)\{\s*try\{\s*if\(android\.os\.Build\.VERSION\.SDK_INT>=android\.os\.Build\.VERSION_CODES\.S\)return track\.getStartThresholdInFrames\(\);\s*return track\.getBufferCapacityInFrames\(\);/);
  assert.match(strip(read('FirstWriteSpeechOutput.java')), /public int startFrames\(\)\{return output\.startFrames\(\);\}/, 'the production wrapper reports the track threshold');
  assert.match(strip(read('StreamingSpeechPlayback.java')), /int padding=silencePadding\(written,out\.startFrames\(\)\);/);
});

test('a cold assistant launch starts its listener window when the page has loaded', () => {
  const activity = strip(read('AlphaAssistActivity.java'));
  assert.match(activity, /super\.onCreate\(state\);\s*if \(getBridge\(\) != null\) getBridge\(\)\.addWebViewListener\(/);
  assert.match(activity, /if \(!awaitingFirstPage\) return;\s*awaitingFirstPage = false;\s*invocationAt = AssistInvocation\.windowStart\(invocationAt, android\.os\.SystemClock\.elapsedRealtime\(\)\);/, 'once per instance');
  assert.match(read('AssistInvocation.java'), /only\s+\* from Android 15 \(API 35\)/, 'the warm-wake platform requirement is stated');
});

test('the listener serialises lease observations and never stops an unanswered foreground start', () => {
  const listener = strip(fs.readFileSync(sense('Listener.java'), 'utf8')), service = strip(fs.readFileSync(sense('ListeningService.java'), 'utf8'));
  assert.match(listener, /synchronized\(LEASE_LOCK\)\{\s*boolean held=microphoneHeld;[\s\S]*?indicatorPause=seen\.pause;\s*return seen\.valid;\s*\}/, 'read, compute and write happen under one lock');
  const refresh = listener.slice(listener.indexOf('static synchronized void refresh('));
  assert.match(refresh, /switch\(ListenerPolicy\.serviceCommand\(ListenerPolicy\.foreground\(state\),ListeningService\.running\(\),outstandingStarts\.get\(\)>0\)\)/);
  assert.match(refresh, /case START:\s*outstandingStarts\.incrementAndGet\(\);\s*try\{app\.startForegroundService\(service\);\}catch\(RuntimeException refused\)\{startDelivered\(\);throw refused;\}/);
  assert.match(refresh, /case CONVERGE:ListeningService\.converge\(\);break;\s*case STOP:app\.stopService\(service\);break;/);
  assert.match(service, /if\(intent!=null\)\{Listener\.startDelivered\(\);startDelivered=true;\}\s*apply\(\);/);
  const stopping = service.slice(service.indexOf('if(!ListenerPolicy.foreground(state)){'), service.indexOf('ListenerNotifications.showStatus(this,state);\n   return;'));
  assert.ok(stopping.indexOf('if(answerStart)try{') > 0 && stopping.indexOf('startForeground(') > stopping.indexOf('if(answerStart)try{') && stopping.indexOf('startForeground(') < stopping.indexOf('stopSelf()'), 'the delivered start is answered before the service stops');
  assert.match(stopping, /if\(ListenerPolicy\.serviceMayStop\(Listener\.outstandingStarts\.get\(\)\)\)\{stoppedSelf=true;stopSelf\(\);\}/, 'and it does not stop while another start is on its way');
  assert.ok(stopping.indexOf('stopCapture();') < stopping.indexOf('if(answerStart)try{'), 'capture is closed first');
  assert.match(service, /if\(instance==this\)instance=null;\s*if\(!stoppedSelf\)Listener\.outstandingStarts\.set\(0\);/, 'only a stop from outside forgets undelivered starts');
});
