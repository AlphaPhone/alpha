// Alpha owns its native media screens: the reviewed-attachment PDF viewer (AlphaMailPdfActivity),
// the device photo review dialog (AlphaMediaReview), the Photos and agent album bridges that open
// it (AlphaPhotosPlugin, AlphaPhotoLibraryPlugin) and the Android share sheet (AlphaShareSheet).
// They are forked from shared plugin-native-media classes (vendor/eliza, at the pin) so only the
// wording and ownership differ. This checks that Alpha's words are its own (host JVM), that no
// Alpha source still reaches the shared screens, and that each fork keeps the shared bridge
// contract (method names, refusal sentences and codes) and its checks in the same order. It reads
// sources and runs plain Java; it is not Android evidence (PdfViewerInstrumentedTest,
// PhotosTrashInstrumentedTest and PhotosMultiShareInstrumentedTest exercise the screens).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {root,nativeSource,fixture,runJvm,jvmSkip} from './fixtures/jvm-tools.mjs';

const MEDIA=join(root,'vendor/eliza/plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media');
const ALPHA=join(root,'android/app/src/main/java/ai/alphacompute/alphaphone');
const read=path=>readFileSync(path,'utf8');
const shared=name=>read(join(MEDIA,name+'.java'));
const alpha=name=>read(nativeSource(name+'.java'));
/** Java source without comments, so a doc comment naming the shared class is not a reference. */
const code=java=>java.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
/** Names of the bridge methods a plugin class declares. */
const methods=java=>[...code(java).matchAll(/@PluginMethod\s+public void (\w+)\(/g)].map(m=>m[1]).sort();
/** The first string literal of every rejection, cancellation and result a class answers with. */
const answers=java=>new Set([...code(java).matchAll(/\b(?:reject|cancel|result)\(\s*(?:request,\s*|"[a-z-]+",\s*)?"((?:[^"\\]|\\.)*)"/g)].map(m=>m[1]));
/** The order in which the given checks and effects appear in a class. */
function sequence(java,tokens){
 const body=code(java),found=[];
 for(const token of tokens)for(let at=body.indexOf(token);at>=0;at=body.indexOf(token,at+1))found.push([at,token]);
 return found.sort((a,b)=>a[0]-b[0]).map(([,token])=>token);
}

test('Alpha words its native media screens itself',{skip:jvmSkip('javac')},()=>{
 assert.match(runJvm([nativeSource('AlphaMediaCopy.java'),fixture('AlphaMediaCopyTest.java')],'ai.alphacompute.alphaphone.AlphaMediaCopyTest'),/^\d+ assertions passed/);
});

test('no Alpha source reaches the shared media screens',()=>{
 const forbidden=[
  [/\bPhotosPlugin\b/,'the shared Photos bridge (AlphaPhotosPlugin)'],
  [/\bDeviceLibraryPlugin\b/,'the shared agent album bridge (AlphaPhotoLibraryPlugin)'],
  [/\bPermittedMediaReview\b/,'the shared photo review dialog (AlphaMediaReview)'],
  [/\bIsolatedPdfViewerActivity\b/,'the shared PDF viewer (AlphaMailPdfActivity)'],
  [/\bSelectedDocuments\.shareUri\b/,'the shared share sheet (AlphaShareSheet.shareUri)'],
  [/\bSelectedDocumentCalls\.share\(/,'the shared share sheet (AlphaShareSheet.shareSelected)'],
  [/\bDocumentFolderTree\b[^;]*\.share\(/,'the shared folder share sheet'],
 ];
 for(const name of readdirSync(ALPHA).filter(file=>file.endsWith('.java'))){
  const java=code(read(join(ALPHA,name)));
  for(const [pattern,instead] of forbidden)assert.ok(!pattern.test(java),`${name} uses ${instead}`);
 }
 // The forks extend only the shared engines, never a shared screen.
 assert.match(alpha('AlphaMailPdfActivity'),/class AlphaMailPdfActivity extends Activity \{/);
 assert.match(alpha('AlphaPhotosPlugin'),/class AlphaPhotosPlugin extends PermittedPhotosPlugin \{/);
 assert.match(alpha('AlphaPhotoLibraryPlugin'),/class AlphaPhotoLibraryPlugin extends Plugin \{/);
 // Every visible word of a fork comes from AlphaMediaCopy.
 assert.doesNotMatch(code(alpha('AlphaMailPdfActivity')),/setText\("|setContentDescription\("|fail\("/);
 assert.doesNotMatch(code(alpha('AlphaMediaReview')),/set(?:Title|Message|NegativeButton|PositiveButton)\("/);
 assert.doesNotMatch(code(alpha('AlphaPhotosPlugin')+alpha('AlphaShareSheet')),/createChooser\(send, "/);
});

test('the forked bridges keep the shared plugin names, methods and permission aliases',()=>{
 const photos=alpha('AlphaPhotosPlugin'),library=alpha('AlphaPhotoLibraryPlugin');
 assert.deepEqual(methods(photos),methods(shared('PhotosPlugin')),'AlphaPhotos methods');
 assert.deepEqual(methods(library),methods(shared('DeviceLibraryPlugin')),'AlphaPhotoLibrary methods');
 assert.match(photos,/@CapacitorPlugin\(name="AlphaPhotos",/);
 assert.match(library,/@CapacitorPlugin\(name="AlphaPhotoLibrary",/);
 for(const java of [photos,library])
  for(const alias of ['libraryLegacy','libraryImages','libraryVideos','librarySelected'])assert.match(java,new RegExp(`alias="${alias}"`));
 // The agent album still runs on the Photos bridge's one catalog and one review.
 assert.match(library,/catalog = photos\.permittedCatalog\(\);\s+review = photos\.permittedReview\(\);/);
 assert.match(photos,/mediaReview = new AlphaMediaReview\(getBridge\(\), permitted, worker\(\), this::ask\);/);
});

test('each fork answers the renderer with the shared sentences and codes',()=>{
 const same=(fork,upstream,{dropped=[]}={})=>{
  const mine=answers(fork),theirs=answers(upstream);
  for(const sentence of dropped)assert.ok(theirs.delete(sentence),'dropped upstream: '+sentence);
  assert.deepEqual([...mine].sort(),[...theirs].sort());
  assert.ok(mine.size>=3);
 };
 // Alpha's review always uses the Photos bridge's own launch gate, so the shared default gate's
 // sentence is gone; AlphaPhotos answers a closed launcher with Alpha's late-launch sentence.
 same(alpha('AlphaMediaReview'),shared('PermittedMediaReview'),{dropped:['Android could not show this request; the app may have closed. Reopen it and try again.']});
 same(alpha('AlphaPhotosPlugin'),shared('PhotosPlugin'));
 same(alpha('AlphaPhotoLibraryPlugin'),shared('DeviceLibraryPlugin'));
 const sharing=answers(shared('SelectedDocuments'));
 sharing.add(/UNAVAILABLE = "([^"]+)";/.exec(shared('SelectedDocumentCalls'))[1]);
 for(const sentence of answers(alpha('AlphaShareSheet')))assert.ok(sharing.has(sentence),'share sentence: '+sentence);
 assert.match(alpha('AlphaMediaReview'),/DECLINED = "LIBRARY_DECLINED", STALE = "LIBRARY_STALE";/);
 assert.equal((alpha('AlphaMediaReview').match(/"LIBRARY_BUSY"/g)||[]).length,2);
 assert.match(alpha('AlphaPhotosPlugin'),/@Override protected String closedMessage\(\) \{\s+return LateLaunch\.CLOSED;/);
 assert.match(alpha('AlphaPhotoLibraryPlugin'),/catch \(IllegalStateException closed\) \{\s+call\.reject\(LateLaunch\.CLOSED\);/);
});

test('the photo review keeps every check, in the shared order',()=>{
 const tokens=['Build.VERSION.SDK_INT < 30','pending.compareAndSet(null, request)','catalog.mutationSource(',
  'MediaStore.createWriteRequest(','runOnUiThread(','hasWindowFocus()','pending.get() != request',
  'request.until < SystemClock.elapsedRealtime()','new AlertDialog.Builder(','gate.ask(','launcher.launch(',
  'getResultCode() != Activity.RESULT_OK','afterResume(request)','Lifecycle.State.RESUMED','dispatch(request)',
  'catalog.deleteTrashed(','catalog.changeFlag(','launcher.unregister()','.setOnCancelListener('];
 assert.deepEqual(sequence(alpha('AlphaMediaReview'),tokens),sequence(shared('PermittedMediaReview'),tokens));
 // Expiry stays two minutes from the request.
 assert.match(alpha('AlphaMediaReview'),/final long until = SystemClock\.elapsedRealtime\(\) \+ 120000;/);
});

test('the PDF viewer keeps every admission and reply check, in the shared order',()=>{
 const tokens=['getIntent().getData()','"content".equals(source.getScheme())','!admits(source)','bindService(',
  'Context.BIND_AUTO_CREATE','token != generation','token == generation','openFileDescriptor(source, "r")',
  'PdfPageLimits.VIEWER_TIMEOUT_MS','IsolatedPdfRenderService.MESSAGE','instanceof SharedMemory',
  '!pending.equals(data.getString("request"))','data.containsKey("error")','PdfPageLimits.requireReply(',
  'Process.myUid()','mapReadOnly()','SharedMemory.unmap(','unbindService(','state.putInt("page", page)'];
 assert.deepEqual(sequence(alpha('AlphaMailPdfActivity'),tokens),sequence(shared('IsolatedPdfViewerActivity'),tokens));
 // Admission is the current reviewed mail copy, rendered only by Alpha's isolated renderer.
 assert.match(alpha('AlphaMailPdfActivity'),/return AlphaMailAttachmentsPlugin\.handoff\(this\)\.admits\(source\);/);
 assert.match(alpha('AlphaMailPdfActivity'),/new Intent\(this, IsolatedPdfService\.class\)/);
});

test('the share sheets keep the shared opening checks',()=>{
 const tokens=['openAssetFileDescriptor(uri, "r")','getType(uri)','Intent.ACTION_SEND','FLAG_GRANT_READ_URI_PERMISSION','ClipData.newRawUri(','createChooser('];
 const upstream=shared('SelectedDocuments'),start=upstream.indexOf('public static JSObject shareUri(');
 assert.deepEqual(sequence(alpha('AlphaShareSheet'),tokens),sequence(upstream.slice(start,upstream.indexOf('public JSObject open(',start)),tokens));
 const many=['PhotoLibraryAccess.SHARE','unique.add(key)','permitted.read(key, revision, false)','owned.verified(key, item.getString("revision"))',
  'Intent.ACTION_SEND_MULTIPLE','destroyed() || getActivity().isFinishing() || !getActivity().hasWindowFocus()','createChooser('];
 assert.deepEqual(sequence(alpha('AlphaPhotosPlugin'),many),sequence(shared('PhotosPlugin'),many));
});
