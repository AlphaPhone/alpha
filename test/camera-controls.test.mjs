import test from 'node:test';import assert from 'node:assert/strict';
// Camera control rules (camera-controls.ts). Source-level: browser specs drive the rendered Camera.
const c=await import('../apps/app/src/prototype/camera-controls.ts');

test('the access notice says why access is needed, or what went wrong, and the way on',()=>{
 assert.match(c.accessDetail('camera',false),/^Alpha needs camera access to take photos and videos\. Tap Allow to turn it on in Settings\.$/);
 assert.match(c.accessDetail('camera',true),/for this page in your browser, then tap Retry\.$/);
 assert.match(c.accessDetail('microphone',false),/^Videos record sound with the microphone\. .*or record without sound\.$/);
 assert.match(c.accessDetail('unavailable',false),/didn’t start.*tap Retry\.$/);
 assert.equal(c.accessDetail('unavailable',true),c.accessDetail('unavailable',false),'a start failure reads the same in both builds');
 for(const kind of ['camera','microphone','unavailable'])for(const browser of [false,true])assert.doesNotMatch(c.accessDetail(kind,browser),/receipt|revision|admission|permission denied/i);
});

test('flash cycles Off, Auto, On on the phone and only torch off/on in the browser',()=>{
 assert.deepEqual(['off','auto','on'].map(mode=>c.nextFlashMode(mode,false)),['auto','on','off']);
 assert.deepEqual(['off','on','auto'].map(mode=>c.nextFlashMode(mode,true)),['on','off','off']);
 assert.deepEqual(['off','auto','on'].map(c.flashLabel),['Flash off','Flash auto','Flash on']);
 // The preview receipt reports only "may fire": the owner's Auto survives a restart, off is off.
 assert.equal(c.flashFromReceipt(true,'auto'),'auto');assert.equal(c.flashFromReceipt(true,'on'),'on');
 assert.equal(c.flashFromReceipt(true,'off'),'on');assert.equal(c.flashFromReceipt(false,'auto'),'off');
});

test('the self-timer steps Off, 3 s, 10 s and back',()=>{
 assert.deepEqual([0,3,10].map(c.nextTimer),[3,10,0]);
 assert.deepEqual([0,3,10].map(c.timerLabel),['Timer off','Timer 3 seconds','Timer 10 seconds']);
});

test('the recording timer shows the time left once the length or size limit is near',()=>{
 const limits={maxDuration:300,maxFileSize:100*1024*1024};
 assert.equal(c.recordingLabel(5,1e6,limits),'0:05','far from both limits: elapsed only');
 assert.equal(c.recordingLabel(250,1e6,limits),'4:10 · 0:50 left','the length limit is near');
 assert.equal(c.recordingLabel(300.4,1e6,limits),'5:00 · 0:00 left');
 // At about 1.25 MB/s a 100 MB limit is reached at about 84 s, long before five minutes.
 const rate=1.25e6;assert.equal(c.recordingLabel(20,20*rate,limits),'0:20','size limit not yet near');
 assert.equal(c.recordingLabel(40,40*rate,limits),'0:40 · 0:44 left','the size limit is near first');
 assert.equal(c.recordingLeft(1,5e6,limits),299,'no size estimate in the first seconds');
 assert.equal(c.recordingLeft(10,0,{maxDuration:0,maxFileSize:0}),undefined,'no limits, no time left');
 assert.equal(c.recordingLabel(Number.NaN,0,limits),'0:00');
});

test('the aspect chip offers only the ratios the camera lists, and frames the grid to the ratio',()=>{
 assert.deepEqual(c.supportedAspects({supportedCaptureAspectRatios:['16:9','4:3']}),['4:3','16:9'],'listed ratios, in the chip order');
 assert.deepEqual(c.supportedAspects({supportedCaptureAspectRatios:['4:3','1:1']}),['4:3'],'a ratio Camera does not offer is left out');
 for(const device of [undefined,{},{supportedCaptureAspectRatios:'16:9'}])assert.deepEqual(c.supportedAspects(device),[],'web and iOS list none');
 assert.equal(c.nextAspect('4:3',['4:3','16:9']),'16:9');assert.equal(c.nextAspect('16:9',['4:3','16:9']),'4:3');
 assert.equal(c.nextAspect('4:3',['4:3']),'4:3','one ratio: no other to pick');assert.equal(c.nextAspect('4:3',[]),'4:3');
 assert.deepEqual(['4:3','16:9'].map(c.aspectLabel),['Aspect ratio 4:3','Aspect ratio 16:9']);
 assert.deepEqual(['4:3','16:9'].map(c.frameAspect),['3 / 4','9 / 16'],'the portrait viewfinder frame');
});

test('Video mode names its light',()=>{
 assert.equal(c.videoLightLabel(false),'Light off');assert.equal(c.videoLightLabel(true),'Light on');
});

test('the volume-key shutter state reaches Android once per change and again after a failure',async()=>{
 const sent=[];let fail=false;
 const sync=c.volumeShutterSync(enabled=>{sent.push(enabled);return fail?Promise.reject(Error('bridge')):Promise.resolve();});
 sync(false);assert.deepEqual(sent,[],'Android starts with the keys off: nothing to send');
 sync(true);sync(true);assert.deepEqual(sent,[true]);
 fail=true;sync(false);await new Promise(resolve=>setTimeout(resolve));
 fail=false;sync(false);assert.deepEqual(sent,[true,false,false],'a refused change is sent again');
 sync(false);assert.deepEqual(sent,[true,false,false]);
});
