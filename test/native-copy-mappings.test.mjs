// Alpha words every sentence the shared native plugins (vendor/eliza, registered by Alpha's
// MainActivity under Alpha names) answer a screen with. Each table here pins one upstream
// sentence, read from the pinned Java/Kotlin source, to the Alpha sentence the screen shows, so a
// reworded upstream sentence fails here instead of reaching the owner raw, and an unknown sentence
// reads as the screen's own fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CapacitorException,ExceptionCode} from '@capacitor/core';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const VENDOR='vendor/eliza/';
/** Every Java string literal in an expression, joined, with `p`/named values substituted. */
function javaText(expr,values={}){
 return [...expr.matchAll(/"((?:[^"\\]|\\.)*)"|\b([A-Za-z_][\w.()]*)\b/g)]
  .map(([,literal,name])=>literal!==undefined?literal.replace(/\\(.)/g,'$1'):Object.hasOwn(values,name)?values[name]:'').join('');
}
/** A native rejection the way the Android bridge delivers it. */
const rejection=(message,code)=>Object.assign(new CapacitorException(message,code),code?{code}:{});

// --- Settings: Erase all data (Alpha's own native review AlphaResetPlugin + AlphaDataResetCopy) ---
// The native result sentences are Alpha's (forked from plugin-native-system reset.DataResetCopy);
// Settings still shows its own notice for each, so this pins the two tables to each other.
const {DATA_RESET_OUTCOMES,DATA_RESET_UNCONFIRMED,reviewDataReset}=await import('../apps/app/src/ui/settings/data-reset.ts');
const RESET_COPY='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaDataResetCopy.java';
const RESET_PLUGIN='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaResetPlugin.java';
const resetField=name=>{const m=new RegExp(`\\n\\s*${name} = ([^;]+);`).exec(source(RESET_COPY));assert.ok(m,name);return javaText(m[1],{p:'Alpha'});};
const RESET=[
 ['reviewClosed',null],['nothingReset',null],['authenticationCancelled',null],
 ['reviewBusy','The reset review is already open. Nothing was erased.'],
 ['reviewExpired','The reset review expired. Nothing was erased.'],
 ['noScreenLock','Set a screen lock in Android Settings before erasing Alpha’s data. Nothing was erased.'],
 ['authenticationUnavailable','Unlocking with your screen lock isn’t available. Nothing was erased.'],
 ['prepareFailed','Reset couldn’t be prepared, and the reset you confirmed may still go ahead. Close and reopen Alpha before trying again.'],
 ['listenerOff','Always-on listening is off or can’t be reached, so nothing was erased. Turn it on in Android Settings and try again.'],
];
test('every reset result the native review resolves with is worded by Alpha',async()=>{
 const used=[...source(RESET_PLUGIN).matchAll(/result\(call, "(?:cancelled|unavailable)", text\.(\w+)\)/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(used)].sort(),RESET.map(([f])=>f).sort(),'AlphaResetPlugin result fields');
 for(const [field,alpha] of RESET){
  const upstream=resetField(field);
  assert.ok(DATA_RESET_OUTCOMES.has(upstream),upstream);
  assert.equal(DATA_RESET_OUTCOMES.get(upstream),alpha,upstream);
  const status=alpha===null||field==='reviewExpired'||field==='authenticationCancelled'?'cancelled':'unavailable';
  const result=await reviewDataReset({review:async()=>({status,message:upstream})});
  assert.equal(result.notice,alpha,upstream);
  assert.notEqual(result.notice,upstream);
 }
 assert.equal(DATA_RESET_OUTCOMES.size,RESET.length);
});
test('an unknown, malformed or rejected reset answer reads as Alpha’s unavailable sentence',async()=>{
 // The plugin dispatches a recorded reset in the prepareFailed branch, and an unknown answer says
 // nothing about it: neither notice may claim that nothing was erased.
 const plugin=source(RESET_PLUGIN),branch=plugin.slice(plugin.indexOf('text.prepareFailed'));
 assert.match(branch.slice(0,600),/reset\.pending\(context\)[\s\S]*dispatchAfterBeforeDispatch/,'prepareFailed still may dispatch the recorded reset');
 for(const notice of [DATA_RESET_OUTCOMES.get(resetField('prepareFailed')),DATA_RESET_UNCONFIRMED])assert.doesNotMatch(notice,/nothing was erased|nothing reset/i,notice);
 for(const plugin of [null,{review:async()=>({status:'unavailable',message:'Something upstream said'})},{review:async()=>{throw rejection('boom');}},{review:async()=>({status:'done',message:'Nothing reset.'})}])
  assert.deepEqual(await reviewDataReset(plugin),{status:'unavailable',notice:DATA_RESET_UNCONFIRMED});
});

// --- Settings: Listening switch subtitle (the listener's own ListenerLabels.label) -----------------
const {LISTENER_STATE_TEXT,listenerStateText}=await import('../apps/app/src/ui/settings/system-settings.ts');
const {LISTENER_STATES}=await import('../.eliza/client-features/plugins/plugin-native-system/src/sense.ts');
test('every listener state has Alpha’s subtitle and the listener’s own label is never shown',()=>{
 // Alpha's listener (android/sense) words each state in ListenerLabels; Settings shows its own subtitle.
 const listener=source('android/sense/src/main/java/ai/alphacompute/alphaphone/sense/ListenerLabels.java');
 const body=listener.slice(listener.indexOf('static String label(ListenerPolicy.State state)'));
 const labels=new Map([...body.slice(0,body.indexOf('\n }')).matchAll(/case (\w+):return "([^"]+)";/g)].map(m=>[m[1],m[2]]));
 labels.set('OFF',/default:return "([^"]+)";/.exec(body)[1]);
 assert.deepEqual([...labels.keys()].sort(),[...LISTENER_STATES].sort(),'ListenerLabels states');
 assert.deepEqual(Object.keys(LISTENER_STATE_TEXT).sort(),[...LISTENER_STATES].sort());
 const PINNED={OFF:'Off',PERMISSION_REQUIRED:'Needs microphone permission',NOTIFICATIONS_REQUIRED:'Needs its notification to be allowed',
  STOPPED_AFTER_ERRORS:'Stopped after repeated errors',STOPPED_INDICATOR_LOST:'Stopped because the microphone indicator wasn’t shown',
  PAUSED_OTHER_USER:'Paused while another user is active',WAITING_FOR_UNLOCK:'Starts after you unlock the phone',
  SPEECH_UNAVAILABLE:'Unavailable until on-device speech is ready',INDICATOR_UNAVAILABLE:'Waiting for the microphone indicator',
  PAUSED_USER:'Paused',PAUSED_CALL:'Paused during a call',PAUSED_MIC_IN_USE:'Paused while another app uses the microphone',
  PAUSED_MIC_UNAVAILABLE:'Paused because the microphone is unavailable',PAUSED_DISPLAY_OFF:'Paused while the screen is off without Always-on display',
  PAUSED_FULLSCREEN:'Paused while an app is full screen',PAUSED_SHADE:'Paused while notifications are open',PAUSED_TRANSITION:'Paused while the screen changes',LISTENING:'Listening'};
 for(const [state,label] of labels){
  assert.equal(listenerStateText(state),PINNED[state],`${state} (${label})`);
 }
 assert.equal(listenerStateText('SOMETHING_NEW'),'Off');
 assert.equal(listenerStateText(undefined),'Off');
});

// --- Clock: the reviewed handoff (ClockHandoff, ClockDays, DailyAppsPlugin for "Alpha") ----------
const {CLOCK_RESULT_TEXT,clockResultText}=await import('../apps/app/src/ui/clock/clock-handoff-presentation.ts');
test('every Clock handoff sentence maps to its pinned Alpha sentence',()=>{
 const clock=VENDOR+'plugins/plugin-native-system/android/src/main/java/ai/eliza/plugins/system/clock/';
 const handoff=source(clock+'ClockHandoff.java'),days=source(clock+'ClockDays.java'),daily=source('android/app/src/main/java/ai/alphacompute/alphaphone/DailyAppsPlugin.java');
 const found=new Set([
  ...[...handoff.matchAll(/result\(action, Status\.\w+, ((?:"[^"]*"|\w+)(?:\s*\+\s*(?:"[^"]*"|\w+))*)\)/g)].map(m=>javaText(m[1],{productName:'Alpha'})),
  ...[...handoff.matchAll(/IllegalArgumentException\("([^"]+)"\)/g)].map(m=>m[1]),
  javaText(/start\(activity, action, target, timeZone, ([^)]+)\);/.exec(handoff)[1],{productName:'Alpha'}),
  /INVALID = "([^"]+)"/.exec(days)[1],
  ...[...daily.matchAll(/IllegalArgumentException\("([^"]*Clock[^"]*)"\)/g)].map(m=>m[1]),
 ].filter(Boolean));
 for(const sentence of ['No installed Clock app handles this action','Open Alpha before continuing to Clock','Clock request sent. Check the Clock app; Alpha cannot confirm an alarm was changed.','Choose valid repeat days','Unexpected Clock option'])
  assert.ok(found.has(sentence),'extracted: '+sentence);
 assert.deepEqual([...found].sort(),[...CLOCK_RESULT_TEXT.keys()].sort(),'every Clock sentence has exactly one Alpha row');
 for(const [upstream,alpha] of CLOCK_RESULT_TEXT){
  assert.equal(clockResultText({status:'failed',message:upstream}),alpha);
  if(!['Choose a Clock action','Choose a valid alarm time','Choose valid repeat days','Android did not allow this Clock action','The Clock app is no longer available'].includes(upstream))assert.notEqual(alpha,upstream);
 }
});
test('an unknown Clock answer is worded by its status, never shown',()=>{
 assert.equal(clockResultText({status:'opened',message:'Something new'}),'Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed.');
 assert.equal(clockResultText({status:'denied',message:'x'}),'Android didn’t allow this Clock action.');
 assert.equal(clockResultText({status:'failed',message:'Not sent'}),'Not sent');
 assert.equal(clockResultText({status:'bogus',message:'x'}),'Alpha can’t tell whether Clock got the request. Check Clock before trying again.');
});

// --- Browser: tab host refusals, notices and page errors (Alpha's own AlphaBrowserPlugin) --------
// Alpha's fork of the shared tab host keeps the shared fixed sentences on the bridge; Browser
// words each one here.
const {BROWSER_REFUSALS,BROWSER_NOTICES,BROWSER_PAGE_ERRORS,browserNoticeText,browserPageErrorText}=await import('../apps/app/src/ui/browser/browser-messages.ts');
const {browserErrorMessage}=await import('../apps/app/src/browser/browser-errors.ts');
const BROWSER='android/app/src/main/java/ai/alphacompute/alphaphone/';
const ALPHA_NAMES={'config().appName':'Alpha Phone','config().hostName':'Alpha','config().browserName':'Alpha Browser'};
function browserSentences(file,call){
 const text=source(BROWSER+file),out=[];
 for(const m of text.matchAll(new RegExp(`\\b${call}\\(\\s*(?:\\w+\\s*,\\s*)?((?:"(?:[^"\\\\]|\\\\.)*"|config\\(\\)\\.\\w+|kind)(?:\\s*\\+\\s*(?:"(?:[^"\\\\]|\\\\.)*"|config\\(\\)\\.\\w+|kind))*)`,'g'))){
  if(!m[1].includes('"'))continue;
  if(m[1].includes('kind'))for(const kind of ['camera','microphone','location'])out.push(javaText(m[1],{...ALPHA_NAMES,kind}));
  else out.push(javaText(m[1],ALPHA_NAMES));
 }
 return out;
}
test('every tab host refusal, notice and page error has an Alpha sentence',()=>{
 const refusals=[...browserSentences('AlphaBrowserPlugin.java','reject'),...browserSentences('browser/AlphaReviewedReading.java','reject')];
 const notices=browserSentences('AlphaBrowserPlugin.java','notice');
 const errors=[...browserSentences('AlphaBrowserPlugin.java','fail'),/"(Browser renderer stopped[^"]*)"/.exec(source(BROWSER+'AlphaBrowserPlugin.java'))[1]];
 assert.ok(refusals.length>=40&&notices.length>=18&&errors.length>=10,`${refusals.length}/${notices.length}/${errors.length}`);
 for(const sentence of refusals)assert.ok(BROWSER_REFUSALS.has(sentence),'refusal: '+sentence);
 for(const sentence of notices)assert.ok(BROWSER_NOTICES.has(sentence),'notice: '+sentence);
 for(const sentence of errors)assert.ok(BROWSER_PAGE_ERRORS.has(sentence),'page error: '+sentence);
 // Staged BrowserTabSession refusals.
 const staged=source('.eliza/client-features/plugins/plugin-native-browser-surface/src/tab-host.ts');
 for(const sentence of ['Browser closed','Invalid tab','Close a tab before opening another.']){assert.ok(staged.includes(JSON.stringify(sentence)),sentence);assert.ok(BROWSER_REFUSALS.has(sentence),sentence);}
});
test('Browser shows Alpha’s pinned sentences for the host’s text',()=>{
 const PINNED=[
  ['refusal','Close a tab before opening another','Tab limit. Close a tab before opening another.'],
  ['refusal','Bookmark could not be saved. The device stores up to 100 bookmarks; existing data was not changed.','Bookmark not saved. Alpha keeps up to 100 bookmarks; nothing else changed.'],
  ['refusal','Browsing data is being cleared. Try again in a moment.','Clearing browsing data. Try again in a moment.'],
  ['refusal','This Android WebView does not support isolated browser profiles','Update WebView'],
  ['notice','Blocked a sign-in prompt from a different site.','Blocked a sign-in request from a different site.'],
  ['notice','Passkeys are not supported in Alpha Browser. Use a password or open the page in another browser from the menu.','Alpha’s Browser doesn’t support passkeys. Use a password, or open the page in another browser from the menu.'],
  ['notice','Android has not allowed Alpha Phone to use your microphone. You can allow it in Android Settings.','Android hasn’t allowed Alpha to use your microphone. You can allow it in Android Settings.'],
  ['error','Page could not load. Check the address and connection, then reload.','The page didn’t load. Check the address and connection, then reload.'],
  ['error','Secure connection failed. The certificate was not accepted.','Secure connection failed: the site’s certificate wasn’t accepted.'],
  ['error','Browser renderer stopped. Close this tab and open a new one.','This tab stopped working. Close it and open a new one.'],
 ];
 for(const [kind,upstream,alpha] of PINNED){
  const shown=kind==='refusal'?browserErrorMessage(rejection(upstream)):kind==='notice'?browserNoticeText(upstream):browserPageErrorText(upstream);
  assert.equal(shown,alpha,upstream);
 }
 assert.equal(browserNoticeText('A new upstream notice'),'Browser blocked something on this page.');
 assert.equal(browserPageErrorText('A new upstream failure'),'The page didn’t load. Reload to try again.');
});

// --- Photos and Keep (AlphaPhotosPlugin, forked from PhotosPlugin, and the shared stores) ----------
// Alpha's Photos bridge and its review dialog (AlphaMediaReview) are its own; the stores stay shared.
const ALPHA_PHOTOS='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPhotosPlugin.java';
const ALPHA_REVIEW='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMediaReview.java';
const {PHOTOS_MESSAGES,photosErrorText,photosResultText}=await import('../apps/app/src/ui/photos/photos-messages.ts');
const MEDIA=VENDOR+'plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media/';
test('every fixed AlphaPhotos refusal and Keep outcome has an Alpha sentence',()=>{
 const photos=source(ALPHA_PHOTOS);
 const literal=[...photos.matchAll(/call\.reject\("([^"]+)"\)/g)].map(m=>m[1]);
 const fallbacks=[...photos.matchAll(/getMessage\(\) == null\s*\?\s*"([^"]+)"/g)].map(m=>m[1]);
 const dynamic=javaText(/call\.reject\(("Select 1-" \+ OwnedMediaLibrary\.PAGE \+ " listed items\.")\)/.exec(photos)[1],{'OwnedMediaLibrary.PAGE':String(/PAGE = (\d+);/.exec(source(MEDIA+'OwnedMediaLibrary.java'))[1])});
 const captures=[...source(MEDIA+'OwnedCaptures.java').matchAll(/new Result\(\s*false, null, "([^"]+)"\)/g)].map(m=>m[1]);
 const admission=[.../IllegalArgumentException\("([^"]+)"\)/.exec(source(MEDIA+'CaptureAdmission.java'))].slice(1);
 const albums=[...source(MEDIA+'OwnedAlbums.java').matchAll(/IllegalArgumentException\("([^"]+)"\)/g)].map(m=>m[1]);
 for(const sentence of [...literal,...fallbacks,dynamic,...captures,...admission,...albums])
  assert.ok(PHOTOS_MESSAGES.has(sentence),'Photos sentence: '+sentence);
 assert.ok(literal.length>=25&&captures.length>=2,`${literal.length}/${captures.length}`);
 // Every key is a sentence the bridge or Alpha's own late-launch answer can still produce.
 const all=[source(ALPHA_PHOTOS),source(ALPHA_REVIEW),...['OwnedPhotoEdits','VideoCopyEdits','VideoEditSpec','OwnedAlbums','OwnedMediaLibrary','OwnedMediaSelection','TrashDeleteRequest','OwnedCaptures','CaptureAdmission','PhotoCrop','PhotoFilter','PermittedPhotosPlugin'].map(n=>source(MEDIA+n+'.java')),source('android/app/src/main/java/ai/alphacompute/alphaphone/LateLaunch.java')].join('\n');
 const reviewed=/REVIEWED = (\d+);[\s\S]*REVIEWED_BATCH = (\d+);/.exec(source(MEDIA+'PhotoLibraryAccess.java')).slice(1).map(max=>`Select 1–${max} distinct permitted items.`);
 for(const key of PHOTOS_MESSAGES.keys())if(key!==dynamic&&!reviewed.includes(key))assert.ok(all.includes(JSON.stringify(key))||all.includes(`"${key}`),'still upstream: '+key);
});
test('Photos screens show Alpha’s pinned sentences and fall back for unknown native text',()=>{
 const PINNED=[
  ['Select 1–20 distinct owned items with current revisions.','Select 1 to 20 different items again; the selection is out of date.'],
  ['More than 500 owned items are in trash. Manage a smaller batch in Android Photos.','Trash holds more than 500 of Alpha’s items. Manage them in smaller batches in Android Photos.'],
  ['Delete confirmation expired. Review trash again.','The delete confirmation expired. Review trash again.'],
  ['Android trash requires Android 11 or later','Trash needs Android 11 or later.'],
  ['Video editor is unavailable. Original unchanged.','Video editor isn’t available. The original is unchanged.'],
  ['Android sharing could not open','Android couldn’t open sharing.'],
 ];
 for(const [upstream,alpha] of PINNED)assert.equal(photosErrorText(rejection(upstream),'FALLBACK'),alpha,upstream);
 assert.equal(photosErrorText(rejection('A new upstream refusal'),'Not saved'),'Not saved');
 assert.equal(photosErrorText(new Error('Alpha’s own sentence.'),'Not saved'),'Alpha’s own sentence.');
 for(const [upstream,alpha] of [['The unfinished capture was removed. Capture it again to retry.','The unfinished photo was removed. Take it again to retry.'],['This capture identity already belongs to different image bytes.','This photo was already kept with a different image. Take it again.']])
  assert.equal(photosResultText(upstream,'Discarded'),alpha);
 // A share answer reuses the selected-document registry's sentences.
 assert.equal(photosResultText('Android could not open sharing for this item.','Share failed'),'Android could not open sharing for this item.');
 assert.equal(photosResultText('Unknown native text','Share failed'),'Share failed');
});

// --- Camera page capture (CameraPlugin.kt rejection codes) ----------------------------------------
const {CAMERA_CAPTURE_CODES,cameraCaptureErrorText}=await import('../apps/app/src/ui/camera/camera-capture-messages.ts');
test('every capturePhoto rejection code is worded by Alpha and exception text is never shown',()=>{
 const kt=source(VENDOR+'plugins/plugin-native-camera/android/src/main/java/ai/eliza/plugins/camera/CameraPlugin.kt');
 const capture=kt.slice(kt.indexOf('fun capturePhoto'),kt.indexOf('fun ',kt.indexOf('fun capturePhoto')+20));
 const codes=new Set([...capture.matchAll(/reject\([^)]*?"([A-Z_]+)"/g)].map(m=>m[1]));
 for(const code of ['CAMERA_INACTIVE','CAPTURE_ERROR','CAPTURE_CANCELLED'])assert.ok(codes.has(code)||kt.includes(`"${code}"`),code);
 for(const code of [...codes,'CAMERA_DESTROYED','PHOTO_PROCESSING_FAILED','GALLERY_WRITE_FAILED','PREVIEW_STOPPED'])assert.ok(Object.hasOwn(CAMERA_CAPTURE_CODES,code),code);
 assert.equal(cameraCaptureErrorText(rejection('Photo capture failed: java.lang.IllegalStateException: x','CAPTURE_ERROR'),'F'),'The photo couldn’t be taken. Try again.');
 assert.equal(cameraCaptureErrorText(rejection('Camera preview stopped: boom','PREVIEW_STOPPED'),'F'),'The camera preview stopped. Start Camera again.');
 assert.equal(cameraCaptureErrorText(rejection('Something new','NEW_CODE'),'Page could not be captured. Try again.'),'Page could not be captured. Try again.');
 assert.equal(cameraCaptureErrorText(new Error('Camera changed. Try capturing again.'),'F'),'Camera changed. Try capturing again.');
});

// --- Phone and Messages (TelephonyPlugin, staged native-telephony / mms-send) --------------------
const {CALL_RESULTS,HANDOFF_RESULTS,SEND_REFUSALS,callResultText,handoffResultText,sendRefusalText}=await import('../apps/app/src/ui/telephony/telephony-messages.ts');
const TELEPHONY='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyBase.java';
test('every call placement and handoff sentence has an Alpha sentence',()=>{
 const java=source(TELEPHONY);
 const placements=[...java.matchAll(/placement\("[a-z-]+", "([^"]+)"\)/g)].map(m=>m[1]);
 const handoffs=[...java.matchAll(/handoff\("[a-z-]+", target, (?:null|name|\w+), "([^"]+)"\)/g)].map(m=>m[1]);
 const opened=[...java.matchAll(/open\(call, [^;]*?,\s*"(?:dialer|sms)",\s*"([^"]+)"\)/gs)].map(m=>m[1]);
 assert.ok(placements.length>=8&&opened.length===2,`${placements.length}/${opened.length}`);
 for(const sentence of placements)assert.ok(CALL_RESULTS.has(sentence),'placement: '+sentence);
 for(const sentence of [...handoffs,...opened])assert.ok(HANDOFF_RESULTS.has(sentence),'handoff: '+sentence);
 assert.equal(callResultText({status:'busy',message:'A call is already in progress. Nothing was dialed.'}),'A call is already in progress. Nothing was dialed.');
 assert.equal(callResultText({status:'failed',message:'Android refused the call request. Nothing was dialed.'}),'Android didn’t accept the call. Nothing was dialed.');
 assert.equal(callResultText({status:'unavailable',message:'Something new'}),'Calls aren’t available right now. Nothing was dialed.');
 assert.equal(handoffResultText({status:'handed-off',message:'Text is ready in your messaging app. Nothing has been sent.'}),'Your message is ready in your messaging app. Nothing has been sent.');
 assert.equal(handoffResultText({status:'failed',message:'Something new'}),'Couldn’t open. Nothing was sent or dialed.');
});
test('every send refusal a Messages screen shows is worded by Alpha',()=>{
 const java=source(TELEPHONY);
 const send=java.slice(java.indexOf('public void sendSms'));
 const sendRejects=[...send.matchAll(/call\.reject\("([^"]+)", "(?:invalid|expired|unavailable|busy|too-large)"\)/g)].map(m=>m[1])
  .filter(s=>!/thread|cursor|page|voicemail|Voicemail|conversation|No send|send history|send record could not be read\.$|Invalid send$|observed|access/.test(s));
 for(const sentence of [...sendRejects,'Choose the SIM in your messaging app','Invalid message','Invalid recipient'])assert.ok(SEND_REFUSALS.has(sentence),'send: '+sentence);
 const staged=source('.eliza/client-features/packages/contracts/src/native-telephony.ts')+source('.eliza/client-features/packages/contracts/src/mms-send.ts');
 for(const sentence of ['Another message is waiting for review. Nothing was sent.','The review could not be shown. Nothing was sent.','A native send needs the reviewed SIM','Too large for a native send','Invalid reviewed MMS','An MMS needs text or an attachment','MMS attachment names must be distinct','MMS is too large'])
  assert.ok(staged.includes(JSON.stringify(sentence)),'staged: '+sentence);
 assert.equal(sendRefusalText(rejection('This request is too old to read back. Nothing was sent again.','expired'),'Not sent'),'This send is too old to check. Nothing was sent again.');
 assert.equal(sendRefusalText(rejection('Invalid recipient','invalid'),'Not sent'),'A recipient isn’t a valid phone number. Nothing was sent.');
 assert.equal(sendRefusalText(rejection('Some new native text','too-long'),'Not sent'),'This text is too long to send as SMS. Nothing was sent.');
 assert.equal(sendRefusalText(new Error('MMS is too large'),'Couldn’t open'),'These pictures are too large to send together.');
 assert.equal(sendRefusalText(new Error('Refresh Messages, then review the MMS again.'),'Couldn’t open'),'Refresh Messages, then review the MMS again.');
});

// --- Installed app launcher (SystemPlugin.launchApp, SystemLauncherApps) --------------------------
const {LAUNCH_REFUSALS,launchFailureText}=await import('../apps/app/src/ui/mobile-shell/installed-launcher.ts');
test('every launcher refusal is worded by Alpha after the app name',()=>{
 const system=VENDOR+'plugins/plugin-native-system/android/src/main/java/ai/eliza/plugins/system/';
 const apps=source(system+'SystemLauncherApps.java'),kt=source(system+'SystemPlugin.kt');
 const refusals=[...apps.matchAll(/new Refusal\(\w+, "([^"]+)"\)/g)].map(m=>m[1]);
 const locked=[...apps.slice(apps.indexOf('static String lockedMessage')).matchAll(/return "([^"]+)";/g)].slice(0,3).map(m=>m[1]);
 const launch=kt.slice(kt.indexOf('fun launchApp'),kt.indexOf('fun getBuildInfo')>0?kt.indexOf('fun getBuildInfo'):undefined);
 const plugin=[...launch.matchAll(/call\.reject\("([^"$]+)"/g)].map(m=>m[1]).concat(javaText('"No app on this device handles dial"'));
 assert.ok(refusals.length>=4&&locked.length===3,`${refusals.length}/${locked.length}`);
 for(const sentence of [...refusals,...locked,...plugin])assert.ok(LAUNCH_REFUSALS.has(sentence),'launcher: '+sentence);
 assert.equal(launchFailureText('Maps',rejection('This app is disabled. Enable it in Android settings to open it.','disabled')),'Maps could not be opened. It’s turned off. Turn it on in Android Settings to open it.');
 assert.equal(launchFailureText('Maps',rejection('A new upstream reason','profile-unavailable')),'Maps could not be opened. Its profile is no longer on this phone.');
 assert.equal(launchFailureText('Phone',new Error('Unavailable')),'Phone could not be opened. Try again.');
});

// --- On-device speech (LocalSpeechBridgePlugin) ---------------------------------------------------
const {SPEECH_BRIDGE_REFUSALS,speechFailureReason}=await import('../apps/app/src/ui/voice/speech-bridge-messages.ts');
test('every speech bridge refusal a reading or navigation voice shows is worded by Alpha',()=>{
 const java=source(VENDOR+'plugins/plugin-local-inference/native/android/speech-bridge/src/main/java/ai/eliza/voice/LocalSpeechBridgePlugin.java');
 const sentences=new Set([
  ...[...java.matchAll(/reject\("([^"]+)"/g)].map(m=>m[1]).filter(s=>!/Recording|Microphone|microphone|live capture|turn stage|timing/.test(s)),
  ...[...java.matchAll(/failure="([^"]+)"/g)].map(m=>m[1]),
  /CALL_MESSAGE="([^"]+)"/.exec(java)[1],/LAUNCH_CLOSED="([^"]+)"/.exec(java)[1],
  /:"(Another app is using the speaker)"/.exec(java)[1],
 ]);
 for(const sentence of ['Speaker is in use','Voice unavailable','Playback replaced','Voice request failed'])assert.ok(sentences.has(sentence),'extracted: '+sentence);
 for(const sentence of sentences)assert.ok(SPEECH_BRIDGE_REFUSALS.has(sentence),'speech: '+sentence);
 assert.equal(speechFailureReason(rejection('Speaker is in use','playback-busy')),'Another app is using the speaker.');
 assert.equal(speechFailureReason(rejection('A new upstream reason')),null);
 assert.equal(speechFailureReason(new Error('On-device navigation speech is unavailable.')),'On-device navigation speech is unavailable.');
 assert.equal(speechFailureReason(Object.assign(new Error('Voice cancelled'),{name:'AbortError'})),'Voice stopped.');
});

test('the native isolated-profile refusal and Capacitor’s unimplemented exception stay plain Browser copy',()=>{
 assert.equal(browserErrorMessage(new CapacitorException('"AlphaBrowser" plugin is not implemented on android',ExceptionCode.Unimplemented)),'Unavailable');
 assert.equal(browserErrorMessage(rejection('A new native sentence')),'Browser unavailable');
});
