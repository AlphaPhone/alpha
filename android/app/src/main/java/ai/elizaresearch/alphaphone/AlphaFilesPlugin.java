package ai.elizaresearch.alphaphone;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.os.FileObserver;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Files browser over shared storage with all-files access (storage* methods,
 * design/view-refresh-2026-11/PLAN.md section 4), plus the earlier user-selected SAF tree.
 * Storage paths are volume-relative and checked by StorageBrowser.resolve; the renderer never
 * names an absolute path or a provider URI. */
@CapacitorPlugin(name="AlphaFiles")
public class AlphaFilesPlugin extends Plugin {
 private static final String PREF="alpha-files-tree",KEY="root";
 /** One page of a folder. Load more continues with an opaque cursor. */
 static final int PAGE=250;
 /** Session capability bound. Older listed entries are evicted, never the
  * root, the folder being listed or its ancestors. */
 static final int SESSION_LIMIT=2048,SESSION_RETAIN=1536;
 private long touch;
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final AtomicBoolean picking=new AtomicBoolean();
 private final Map<String,Entry> entries=new HashMap<>();
 private Uri tree;private String rootId;
 private static final class Entry { final String id=UUID.randomUUID().toString();Uri uri;final String parent;long touched;Entry(Uri uri,String parent){this.uri=uri;this.parent=parent;} }
 private interface Work {JSObject run()throws Exception;}
 private JSObject result(String status,String message){JSObject out=new JSObject();out.put("status",status);out.put("message",message);return out;}
 private void run(PluginCall call,Work task){PluginWorkers.submit(worker,()->{try{call.resolve(task.run());}catch(SecurityException e){entries.clear();rootId=null;call.resolve(result("revoked","Folder access expired. Choose the folder again."));}catch(Exception e){call.resolve(result("failed","The document provider could not confirm this operation. Refresh before retrying."));}},()->call.resolve(result("unavailable","Files closed. Reopen Files to continue.")));}
 private ContentResolver resolver(){return getContext().getContentResolver();}
 private boolean retained(boolean write){if(tree==null)return false;for(android.content.UriPermission p:resolver().getPersistedUriPermissions())if(tree.equals(p.getUri())&&p.isReadPermission()&&(!write||p.isWritePermission()))return true;return false;}
 private Entry root(){
  if(tree==null){String saved=getContext().getSharedPreferences(PREF,0).getString(KEY,null);if(saved==null)return null;tree=Uri.parse(saved);}
  if(!retained(false))throw new SecurityException();
  if(rootId==null){Entry root=new Entry(DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree)),null);entries.put(root.id,root);rootId=root.id;}
  return entries.get(rootId);
 }
 private Entry entry(String id){if(root()==null)return null;return entries.get(id);}
 private Set<String> chain(Entry folder){Set<String> keep=new HashSet<>();for(Entry at=folder;at!=null&&keep.add(at.id);at=at.parent==null?null:entries.get(at.parent));if(rootId!=null)keep.add(rootId);return keep;}
 private void evict(Entry folder){
  if(entries.size()<SESSION_LIMIT)return;Set<String> keep=chain(folder);
  List<Entry> candidates=new ArrayList<>();for(Entry item:entries.values())if(!keep.contains(item.id)&&!Objects.equals(item.parent,folder.id))candidates.add(item);
  candidates.sort((a,b)->Long.compare(a.touched,b.touched));
  for(Entry item:candidates){if(entries.size()<=SESSION_RETAIN)break;entries.remove(item.id);}
  if(entries.size()>=SESSION_LIMIT)throw new IllegalStateException("Folder session limit");
 }
 private Entry authorize(Uri uri,String parent){for(Entry item:entries.values())if(item.uri.equals(uri)&&Objects.equals(item.parent,parent)){item.touched=++touch;return item;}Entry folder=parent==null?null:entries.get(parent);if(folder!=null)evict(folder);else if(entries.size()>=SESSION_LIMIT)throw new IllegalStateException("Folder session limit");Entry value=new Entry(uri,parent);value.touched=++touch;entries.put(value.id,value);return value;}
 private JSObject describe(Entry item)throws Exception{
  String[] fields={DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE,DocumentsContract.Document.COLUMN_FLAGS,DocumentsContract.Document.COLUMN_SIZE,DocumentsContract.Document.COLUMN_LAST_MODIFIED};
  try(Cursor row=resolver().query(item.uri,fields,null,null,null)){
   if(row==null||!row.moveToFirst())throw new java.io.FileNotFoundException();
   String name=row.getString(0),mime=row.getString(1);long flags=row.getLong(2),size=row.isNull(3)?-1:row.getLong(3),modified=row.isNull(4)?-1:row.getLong(4);boolean directory=DocumentsContract.Document.MIME_TYPE_DIR.equals(mime),write=retained(true);
   JSObject value=new JSObject();value.put("id",item.id);value.put("parentId",item.parent);value.put("name",name);value.put("mimeType",mime);value.put("directory",directory);value.put("size",size);value.put("modified",modified);
   value.put("revision",name+"|"+mime+"|"+size+"|"+modified+"|"+flags);
   value.put("canCreate",write&&directory&&(flags&DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE)!=0);
   value.put("canRename",write&&item.parent!=null&&(flags&DocumentsContract.Document.FLAG_SUPPORTS_RENAME)!=0);
   value.put("canDelete",write&&item.parent!=null&&(flags&DocumentsContract.Document.FLAG_SUPPORTS_DELETE)!=0);
   value.put("canMove",write&&!directory&&item.parent!=null&&(flags&DocumentsContract.Document.FLAG_SUPPORTS_MOVE)!=0);
   return value;
  }
 }
 private JSObject list(Entry folder)throws Exception{return list(folder,0);}
 /** Cursor is the offset into the provider's child query for this folder. */
 private JSObject list(Entry folder,int offset)throws Exception{
  if(folder==null)return result("unavailable","Choose a folder in Android to browse its contents.");
  JSObject details=describe(folder);if(!details.optBoolean("directory"))return result("unsupported","This selection is not a folder.");
  folder.touched=++touch;
  Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getDocumentId(folder.uri));JSArray rows=new JSArray();boolean truncated=false,full=false;int total=0;
  try(Cursor cursor=resolver().query(children,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID},null,null,null)){
   if(cursor==null)throw new IllegalStateException();
   total=cursor.getCount();if(offset>0&&!cursor.moveToPosition(offset-1))offset=total;
   while(cursor.moveToNext()){
    if(rows.length()>=PAGE){truncated=true;break;}Uri uri=DocumentsContract.buildDocumentUriUsingTree(tree,cursor.getString(0));Entry child;
    // Listed entries of this folder stay operable, so a folder larger than the session bound stops here honestly.
    try{child=authorize(uri,folder.id);}catch(IllegalStateException limit){truncated=true;full=true;break;}
    rows.put(describe(child));
   }
  }
  int shown=offset+rows.length();
  JSObject out=result("ready",full?"Showing "+shown+" of "+total+" entries. This folder is too large to browse further here. Open a subfolder or choose a smaller folder.":truncated?"Showing "+shown+" of "+total+" entries. Load more to continue.":"Folder loaded from Android.");out.put("folder",details);out.put("entries",rows);out.put("truncated",truncated);out.put("rootId",rootId);out.put("offset",offset);out.put("total",total);
  if(truncated&&!full)out.put("cursor",folder.id+":"+shown);return out;
 }
 @PluginMethod public void choose(PluginCall call){
  if(!picking.compareAndSet(false,true)){call.resolve(result("busy","A folder picker is already open."));return;}
  Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION|Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
  try{startActivityForResult(call,intent,"chosen");}catch(RuntimeException error){picking.set(false);call.resolve(result("unavailable","Android folder selection is unavailable."));}
 }
 @ActivityCallback private void chosen(PluginCall call,ActivityResult response){
  picking.set(false);if(call==null)return;Intent data=response.getData();
  if(response.getResultCode()!=Activity.RESULT_OK||data==null||data.getData()==null){call.resolve(result("cancelled","Folder selection cancelled."));return;}
  Uri uri=data.getData();int flags=data.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
  run(call,()->{
   if(!"content".equals(uri.getScheme())||!DocumentsContract.isTreeUri(uri)||(flags&Intent.FLAG_GRANT_READ_URI_PERMISSION)==0)return result("unsupported","The provider did not grant readable folder access.");
   String previous=getContext().getSharedPreferences(PREF,0).getString(KEY,null);
   resolver().takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION|((flags&Intent.FLAG_GRANT_WRITE_URI_PERMISSION)!=0?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0));
   if(!getContext().getSharedPreferences(PREF,0).edit().putString(KEY,uri.toString()).commit())return result("failed","Folder access could not be saved. Choose the folder again.");
   tree=uri;rootId=null;entries.clear();
   // Replace only this plugin's previously recorded tree grant. Individually
   // selected documents retain their separate grants. Tree previews are transient.
   if(previous!=null&&!previous.equals(uri.toString()))for(android.content.UriPermission permission:resolver().getPersistedUriPermissions())if(previous.equals(permission.getUri().toString())){try{resolver().releasePersistableUriPermission(permission.getUri(),(permission.isReadPermission()?Intent.FLAG_GRANT_READ_URI_PERMISSION:0)|(permission.isWritePermission()?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0));}catch(SecurityException ignored){}break;}
   return list(root());
  });
 }
 @PluginMethod public void list(PluginCall call){run(call,()->{
  Entry root=root();String cursor=call.getString("cursor");Entry folder=call.getString("id")==null?root:entry(call.getString("id"));
  if(cursor==null)return list(folder);
  int split=cursor.lastIndexOf(':');if(folder==null||split<1||!cursor.substring(0,split).equals(folder.id))return result("conflict","This folder changed. Refresh it before loading more.");
  int offset;try{offset=Integer.parseInt(cursor.substring(split+1));}catch(NumberFormatException e){return result("conflict","Refresh this folder before loading more.");}
  if(offset<1)return result("conflict","Refresh this folder before loading more.");return list(folder,offset);
 });}
 /** Android grants folders in place; nothing is copied. Import opens the same tree picker. */
 @PluginMethod public void importFolder(PluginCall call){choose(call);}
 private JSObject outcome(String id,String status,String message){JSObject value=result(status,message);value.put("id",id);return value;}
 /** Per-item move or delete. Each item is checked against its listed revision and
  * applied independently; the result names every item's outcome. */
 @PluginMethod public void changeMany(PluginCall call){run(call,()->{
  JSArray items=call.getArray("items");String action=call.getString("action","");
  if(items==null||items.length()<1||items.length()>100)return result("unsupported","Select between 1 and 100 items.");
  if(!action.equals("move")&&!action.equals("delete"))return result("unsupported","Choose move or delete.");
  if(action.equals("delete")&&!Boolean.TRUE.equals(call.getBoolean("confirmPermanent")))return result("confirmation-required","Permanently delete the selected items? This provider has no integrated trash or undo.");
  Entry destination=action.equals("move")?entry(call.getString("destinationId")):null;
  if(action.equals("move")){if(destination==null)return result("revoked","Reload the destination folder first.");if(!describe(destination).optBoolean("canCreate"))return result("unsupported","This provider does not allow moving files into that folder.");}
  JSArray outcomes=new JSArray();int done=0;boolean expired=false;Set<String> seen=new HashSet<>();
  for(int i=0;i<items.length()&&!expired;i++){
   org.json.JSONObject request=items.optJSONObject(i);String id=request==null?"":request.optString("id","");String expected=request==null?"":request.optString("expectedRevision","");
   if(!seen.add(id)){outcomes.put(outcome(id,"unsupported","Duplicate selection."));continue;}
   Entry item=entry(id);if(item==null){outcomes.put(outcome(id,"revoked","Reload this folder first."));continue;}
   try{
    JSObject info=describe(item);
    if(!info.getString("revision").equals(expected)){outcomes.put(outcome(id,"conflict","Changed since it was listed."));continue;}
    if(action.equals("delete")){
     if(!info.optBoolean("canDelete")){outcomes.put(outcome(id,"unsupported","This provider does not permit deleting it."));continue;}
     if(info.optBoolean("directory")&&list(item).getJSONArray("entries").length()>0){outcomes.put(outcome(id,"unsupported","Only empty folders can be deleted here."));continue;}
     if(!DocumentsContract.deleteDocument(resolver(),item.uri)){outcomes.put(outcome(id,"failed","Deletion was not confirmed."));continue;}
     entries.remove(item.id);outcomes.put(outcome(id,"deleted","Permanently deleted."));done++;
    }else{
     if(!info.optBoolean("canMove")){outcomes.put(outcome(id,"unsupported","This provider does not support moving it."));continue;}
     if(destination.id.equals(item.parent)){outcomes.put(outcome(id,"unsupported","Already in that folder."));continue;}
     // The listed parent can leave the bounded session map; the item then needs a reload, not a revoked session.
     Entry parent=entry(item.parent);if(parent==null){outcomes.put(outcome(id,"revoked","Reload this folder first."));continue;}
     Uri moved=DocumentsContract.moveDocument(resolver(),item.uri,parent.uri,destination.uri);
     if(moved==null){outcomes.put(outcome(id,"failed","Move was not confirmed."));continue;}
     entries.remove(item.id);authorize(moved,destination.id);outcomes.put(outcome(id,"moved","Moved."));done++;
    }
   }catch(SecurityException e){
    // Access ended mid-batch: earlier items already changed, so their outcomes are still reported.
    expired=true;outcomes.put(outcome(id,"revoked","Folder access expired before this item."));
   }catch(Exception e){outcomes.put(outcome(id,"failed","The provider could not confirm this item. Refresh before retrying."));}
  }
  String verb=action.equals("move")?"moved":"deleted";
  if(expired){
   entries.clear();rootId=null;
   JSObject out=result(done>0?"partial":"revoked",done>0?done+" of "+items.length()+" items "+verb+" before folder access expired. Choose the folder again and review the items that remain.":"Folder access expired. Nothing was "+verb+". Choose the folder again.");
   out.put("outcomes",outcomes);out.put("count",done);return out;
  }
  JSObject out=result(done==items.length()?verb:done>0?"partial":"failed",done==items.length()?(done==1?"1 item ":done+" items ")+(action.equals("move")?"moved.":"permanently deleted."):done>0?done+" of "+items.length()+" items "+verb+". Review the items that remain.":"No items were "+verb+". Refresh the folder and review each item.");
  out.put("outcomes",outcomes);out.put("count",done);return out;
 });}
 /** One share sheet for several files. Folders are skipped, and nothing is sent until the user picks an app. */
 @PluginMethod public void shareMany(PluginCall call){run(call,()->{
  JSArray items=call.getArray("items");if(items==null||items.length()<1||items.length()>100)return result("unsupported","Select between 1 and 100 items.");
  ArrayList<Uri> uris=new ArrayList<>();JSArray outcomes=new JSArray();Set<String> types=new HashSet<>();
  for(int i=0;i<items.length();i++){
   org.json.JSONObject request=items.optJSONObject(i);String id=request==null?"":request.optString("id","");Entry item=entry(id);
   if(item==null){outcomes.put(outcome(id,"revoked","Reload this folder first."));continue;}
   JSObject info=describe(item);
   if(!info.getString("revision").equals(request.optString("expectedRevision",""))){outcomes.put(outcome(id,"conflict","Changed since it was listed."));continue;}
   if(info.optBoolean("directory")){outcomes.put(outcome(id,"unsupported","Folders cannot be shared. Open the folder and select files."));continue;}
   uris.add(item.uri);types.add(info.getString("mimeType"));outcomes.put(outcome(id,"included","Included."));
  }
  if(uris.isEmpty()){JSObject out=result("unsupported","None of the selected items can be shared.");out.put("outcomes",outcomes);return out;}
  String type=types.size()==1?types.iterator().next():"*/*";
  Intent send=new Intent(uris.size()==1?Intent.ACTION_SEND:Intent.ACTION_SEND_MULTIPLE).setType(type).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
  if(uris.size()==1)send.putExtra(Intent.EXTRA_STREAM,uris.get(0));else send.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);
  ClipData clip=ClipData.newRawUri("Selected files",uris.get(0));for(int i=1;i<uris.size();i++)clip.addItem(new ClipData.Item(uris.get(i)));send.setClipData(clip);
  Activity activity=getActivity();if(activity==null)return result("unavailable","Files closed. Reopen Files to share.");
  CountDownLatch started=new CountDownLatch(1);boolean[] opened={false};
  activity.runOnUiThread(()->{try{activity.startActivity(Intent.createChooser(send,"Share"));opened[0]=true;}catch(RuntimeException e){opened[0]=false;}finally{started.countDown();}});
  if(!started.await(5,TimeUnit.SECONDS)||!opened[0])return result("failed","Android could not open sharing for these files.");
  JSObject out=result("opened","Choose an app to share "+uris.size()+(uris.size()==1?" file":" files")+(outcomes.length()>uris.size()?". Some selected items were skipped":"")+". Nothing has been sent yet.");out.put("outcomes",outcomes);out.put("count",uris.size());return out;
 });}
 private String name(PluginCall call){String name=call.getString("name","").trim();if(name.isEmpty()||name.length()>255||name.equals(".")||name.equals("..")||name.indexOf('/')>=0||name.indexOf('\\')>=0||name.chars().anyMatch(Character::isISOControl))throw new IllegalArgumentException();return name;}
 private boolean current(JSObject row,PluginCall call){return row.getString("revision").equals(call.getString("expectedRevision"));}
 @PluginMethod public void createFolder(PluginCall call){run(call,()->{
  Entry folder=entry(call.getString("id"));if(folder==null)return result("revoked","Reload this folder first.");JSObject info=describe(folder);
  if(!info.optBoolean("canCreate"))return result("unsupported","This provider does not permit folder creation.");
  Uri created=DocumentsContract.createDocument(resolver(),folder.uri,DocumentsContract.Document.MIME_TYPE_DIR,name(call));if(created==null)return result("failed","The provider did not confirm folder creation. Refresh before retrying.");
  JSObject out=result("created","Folder created.");out.put("entry",describe(authorize(created,folder.id)));return out;
 });}
 @PluginMethod public void rename(PluginCall call){run(call,()->{
  Entry item=entry(call.getString("id"));if(item==null)return result("revoked","Reload this folder first.");JSObject info=describe(item);
  if(!info.optBoolean("canRename"))return result("unsupported","This provider does not permit renaming this item.");if(!current(info,call))return result("conflict","This item changed. Refresh before renaming.");
  Uri renamed=DocumentsContract.renameDocument(resolver(),item.uri,name(call));if(renamed==null)return result("failed","Rename was not confirmed. Refresh before retrying.");item.uri=renamed;JSObject out=result("renamed","Item renamed.");out.put("entry",describe(item));return out;
 });}
 @PluginMethod public void delete(PluginCall call){run(call,()->{
  Entry item=entry(call.getString("id"));if(item==null)return result("revoked","Reload this folder first.");JSObject info=describe(item);
  if(!info.optBoolean("canDelete"))return result("unsupported","This provider does not permit deletion.");if(!Boolean.TRUE.equals(call.getBoolean("confirmPermanent")))return result("confirmation-required","Permanently delete this item? This provider has no integrated trash or undo.");if(!current(info,call))return result("conflict","This item changed. Refresh before deleting.");
  if(info.optBoolean("directory")){JSObject contents=list(item);if(contents.getJSONArray("entries").length()>0)return result("unsupported","Only empty folders can be deleted here. Manage nonempty folders in Android Files.");}
  if(!DocumentsContract.deleteDocument(resolver(),item.uri))return result("failed","Deletion was not confirmed. Refresh before retrying.");entries.remove(item.id);return result("deleted","Item permanently deleted.");
 });}
 @PluginMethod public void move(PluginCall call){run(call,()->{
  Entry item=entry(call.getString("id")),destination=entry(call.getString("destinationId"));if(item==null||destination==null)return result("revoked","Reload source and destination folders first.");JSObject info=describe(item),target=describe(destination);
  if(!info.optBoolean("canMove")||!target.optBoolean("canCreate"))return result("unsupported","This provider does not support moving this file to that folder.");if(!current(info,call))return result("conflict","This file changed. Refresh before moving.");if(destination.id.equals(item.parent))return result("unsupported","This file is already in that folder.");Entry parent=entry(item.parent);if(parent==null)return result("revoked","Reload source and destination folders first.");
  Uri moved=DocumentsContract.moveDocument(resolver(),item.uri,parent.uri,destination.uri);if(moved==null)return result("failed","Move was not confirmed. Refresh both folders before retrying.");entries.remove(item.id);JSObject out=result("moved","File moved.");out.put("entry",describe(authorize(moved,destination.id)));return out;
 });}
 @PluginMethod public void select(PluginCall call){run(call,()->{
  Entry item=entry(call.getString("id"));if(item==null)return result("revoked","Reload this folder first.");JSObject info=describe(item);if(info.optBoolean("directory"))return result("unsupported","Open this folder to browse its contents.");
  String selectionId=SelectedDocumentAccess.authorize(getContext(),item.uri,0);JSObject out=result("selected","Document selected from your chosen folder.");out.put("action","files");out.put("selectionId",selectionId);out.put("name",info.getString("name"));out.put("mimeType",info.getString("mimeType"));out.put("uri",item.uri.toString());out.put("canRename",info.optBoolean("canRename"));return out;
 });}
 @PluginMethod public void forget(PluginCall call){run(call,()->{
  Uri old=tree;if(old==null){String saved=getContext().getSharedPreferences(PREF,0).getString(KEY,null);if(saved!=null)old=Uri.parse(saved);}
  if(!getContext().getSharedPreferences(PREF,0).edit().remove(KEY).commit())return result("failed","Folder selection could not be forgotten.");tree=null;rootId=null;entries.clear();
  if(old!=null)for(android.content.UriPermission p:resolver().getPersistedUriPermissions())if(old.equals(p.getUri())){int flags=(p.isReadPermission()?Intent.FLAG_GRANT_READ_URI_PERMISSION:0)|(p.isWritePermission()?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0);resolver().releasePersistableUriPermission(old,flags&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION));break;}
  return result("forgotten","Folder access released.");
 });}

 // ---- Storage browser (all-files access) ----
 private final ExecutorService storageWorker=Executors.newSingleThreadExecutor();
 private FileObserver observer;private android.database.ContentObserver mediaObserver;
 private final android.os.Handler main=new android.os.Handler(android.os.Looper.getMainLooper());
 private final Runnable changed=()->notifyListeners("storageChanged",new JSObject());
 private interface StorageWork {JSObject run(StorageBrowser browser)throws Exception;}
 private JSObject denied(){JSObject out=result("denied","Allow all-files access to browse storage.");out.put("access",StorageCatalog.access());return out;}
 private void storage(PluginCall call,StorageWork task){PluginWorkers.submit(storageWorker,()->{
  try{
   if(!"granted".equals(StorageCatalog.access())){call.resolve(denied());return;}
   StorageCatalog.Volume volume=StorageCatalog.volume(getContext(),call.getString("volume","primary"));
   if(volume==null){call.resolve(result("unavailable","This storage is not mounted."));return;}
   JSObject out=task.run(new StorageBrowser(volume.directory));if(!out.has("status"))out.put("status","ready");call.resolve(out);
  }catch(IllegalArgumentException e){call.resolve(result("invalid","Invalid name or path."));}
  catch(IllegalStateException e){call.resolve(result("exists","That name is already used here."));}
  catch(java.io.FileNotFoundException e){call.resolve(result("missing","This item is no longer there."));}
  catch(SecurityException e){call.resolve(denied());}
  catch(Exception e){call.resolve(result("failed","The operation could not be confirmed."));}
 },()->call.resolve(result("unavailable","Files closed.")));}
 private static List<String> strings(PluginCall call,String key,int max){
  JSArray array=call.getArray(key);if(array==null||array.length()<1||array.length()>max)throw new IllegalArgumentException();
  List<String> out=new ArrayList<>();Set<String> seen=new HashSet<>();
  for(int i=0;i<array.length();i++){String value=array.optString(i,null);if(value==null||!seen.add(value))throw new IllegalArgumentException();out.add(value);}
  return out;
 }
 private static JSObject row(StorageBrowser.Row r){JSObject o=new JSObject();o.put("path",r.path);o.put("name",r.name);o.put("directory",r.directory);o.put("mimeType",r.mime);o.put("size",r.size);o.put("modified",r.modified);if(r.directory)o.put("children",r.children);return o;}
 private static JSArray outcomes(List<StorageBrowser.Outcome> list){JSArray out=new JSArray();for(StorageBrowser.Outcome o:list){JSObject v=new JSObject();v.put("path",o.path);v.put("status",o.status);if(o.to!=null)v.put("to",o.to);out.put(v);}return out;}
 /** MediaStore follows moves, copies and trash so the categories stay queries over what is there. */
 private void scan(StorageBrowser browser,List<String> paths){
  List<String> files=new ArrayList<>();for(String p:paths)if(p!=null)files.add(new java.io.File(browser.root,p).getAbsolutePath());
  if(!files.isEmpty())android.media.MediaScannerConnection.scanFile(getContext(),files.toArray(new String[0]),null,null);
 }
 @PluginMethod public void storageState(PluginCall call){PluginWorkers.submit(storageWorker,()->{
  JSObject out=new JSObject();out.put("status","ready");String access=StorageCatalog.access();out.put("access",access);JSArray volumes=new JSArray();
  if("granted".equals(access))for(StorageCatalog.Volume v:StorageCatalog.volumes(getContext()))volumes.put(StorageCatalog.describe(v));
  out.put("volumes",volumes);call.resolve(out);
 },()->call.resolve(result("unavailable","Files closed.")));}
 /** Opens Android's "All files access" page for this app and reads access back on return. */
 @PluginMethod public void storageRequestAccess(PluginCall call){
  if("unsupported".equals(StorageCatalog.access())){JSObject out=new JSObject();out.put("status","ready");out.put("access","unsupported");call.resolve(out);return;}
  Intent intent=new Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,Uri.parse("package:"+getContext().getPackageName()));
  try{startActivityForResult(call,intent,"storageAccessReturned");}
  catch(RuntimeException e){
   try{startActivityForResult(call,new Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION),"storageAccessReturned");}
   catch(RuntimeException again){call.resolve(result("unavailable","Android's file access settings are unavailable."));}
  }
 }
 @ActivityCallback private void storageAccessReturned(PluginCall call,ActivityResult response){
  if(call==null)return;JSObject out=new JSObject();out.put("status","ready");out.put("access",StorageCatalog.access());call.resolve(out);
 }
 @PluginMethod public void storageList(PluginCall call){storage(call,b->{
  List<StorageBrowser.Row> rows=b.list(call.getString("path",""));JSArray entries=new JSArray();int n=0;
  for(StorageBrowser.Row r:rows){if(n++>=StorageBrowser.LIST_MAX)break;entries.put(row(r));}
  JSObject out=new JSObject();out.put("entries",entries);out.put("truncated",rows.size()>StorageBrowser.LIST_MAX);return out;
 });}
 @PluginMethod public void storageCategory(PluginCall call){storage(call,b->{JSObject out=new JSObject();out.put("entries",StorageCatalog.category(resolver(),call.getString("category","")));return out;});}
 /** Candidates for the agent's read-only filter; the renderer applies the exact rules. */
 @PluginMethod public void storageQuery(PluginCall call){storage(call,b->{
  Double from=call.getDouble("from"),to=call.getDouble("to");
  JSObject out=new JSObject();out.put("entries",StorageCatalog.query(resolver(),call.getString("text"),call.getString("mimePrefix"),call.getString("folder"),from==null?0:from.longValue(),to==null?0:to.longValue()));return out;
 });}
 @PluginMethod public void storageTransfer(PluginCall call){storage(call,b->{
  List<String> paths=strings(call,"paths",StorageBrowser.BATCH_MAX);boolean copy=Boolean.TRUE.equals(call.getBoolean("copy",false));
  List<StorageBrowser.Outcome> done=b.transfer(paths,call.getString("dest",""),copy);
  List<String> touched=new ArrayList<>();for(StorageBrowser.Outcome o:done){if(o.to!=null)touched.add(o.to);if(!copy&&"moved".equals(o.status))touched.add(o.path);}scan(b,touched);
  JSObject out=new JSObject();out.put("outcomes",outcomes(done));return out;
 });}
 @PluginMethod public void storageRename(PluginCall call){storage(call,b->{
  String from=call.getString("path",""),to=b.rename(from,call.getString("name",""));scan(b,Arrays.asList(from,to));JSObject out=new JSObject();out.put("path",to);return out;
 });}
 @PluginMethod public void storageCreateFolder(PluginCall call){storage(call,b->{JSObject out=new JSObject();out.put("path",b.createFolder(call.getString("parent",""),call.getString("name","")));return out;});}
 @PluginMethod public void storageTrash(PluginCall call){storage(call,b->{
  List<String> paths=strings(call,"paths",StorageBrowser.BATCH_MAX);List<StorageBrowser.Outcome> done=b.trash(paths,System.currentTimeMillis());
  List<String> gone=new ArrayList<>();for(StorageBrowser.Outcome o:done)if("trashed".equals(o.status))gone.add(o.path);scan(b,gone);
  JSObject out=new JSObject();out.put("outcomes",outcomes(done));return out;
 });}
 @PluginMethod public void storageTrashList(PluginCall call){storage(call,b->{
  JSArray items=new JSArray();for(StorageBrowser.TrashRow r:b.trashList(System.currentTimeMillis())){JSObject o=new JSObject();o.put("id",r.id);o.put("name",r.name);o.put("origin",r.origin);o.put("directory",r.directory);o.put("mimeType",r.mime);o.put("size",r.size);o.put("deletedAt",r.deletedAt);items.put(o);}
  JSObject out=new JSObject();out.put("items",items);return out;
 });}
 @PluginMethod public void storageRestore(PluginCall call){storage(call,b->{
  List<StorageBrowser.Outcome> done=b.restore(strings(call,"ids",StorageBrowser.BATCH_MAX));
  List<String> back=new ArrayList<>();for(StorageBrowser.Outcome o:done)if(o.to!=null)back.add(o.to);scan(b,back);
  JSObject out=new JSObject();out.put("outcomes",outcomes(done));return out;
 });}
 /** Permanent deletion. The renderer sends confirmed only after the owner confirmed it. */
 @PluginMethod public void storageEmptyTrash(PluginCall call){storage(call,b->{
  if(!Boolean.TRUE.equals(call.getBoolean("confirmed",false)))return result("confirmation-required","Confirm before deleting permanently.");
  JSArray ids=call.getArray("ids");List<String> list=null;if(ids!=null){list=strings(call,"ids",StorageBrowser.BATCH_MAX);}
  JSObject out=new JSObject();out.put("count",b.emptyTrash(list));return out;
 });}
 private Uri contentUri(java.io.File file){return androidx.core.content.FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".storage",file);}
 /** One share sheet for the listed files. Nothing is sent until the owner picks an app. */
 @PluginMethod public void storageShare(PluginCall call){storage(call,b->{
  ArrayList<Uri> uris=new ArrayList<>();Set<String> types=new HashSet<>();
  for(String path:strings(call,"paths",100)){java.io.File f=b.resolve(path,false);if(!f.isFile())continue;uris.add(contentUri(f));types.add(StorageBrowser.mime(f.getName()));}
  if(uris.isEmpty())return result("unsupported","Select files to share.");
  Intent send=new Intent(uris.size()==1?Intent.ACTION_SEND:Intent.ACTION_SEND_MULTIPLE).setType(types.size()==1?types.iterator().next():"*/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
  if(uris.size()==1)send.putExtra(Intent.EXTRA_STREAM,uris.get(0));else send.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);
  ClipData clip=ClipData.newRawUri("Files",uris.get(0));for(int i=1;i<uris.size();i++)clip.addItem(new ClipData.Item(uris.get(i)));send.setClipData(clip);
  if(!startOnUi(Intent.createChooser(send,null)))return result("failed","Sharing could not open.");
  JSObject out=result("opened","");out.put("count",uris.size());return out;
 });}
 /** Opens a file in this app's document preview (a selection like a picked document). */
 @PluginMethod public void storageSelect(PluginCall call){storage(call,b->{
  java.io.File f=b.resolve(call.getString("path",""),false);if(!f.isFile())throw new java.io.FileNotFoundException();
  String id=SelectedDocumentAccess.authorize(getContext(),contentUri(f),0);
  JSObject out=result("selected","");out.put("action","files");out.put("selectionId",id);out.put("name",f.getName());out.put("mimeType",StorageBrowser.mime(f.getName()));out.put("canRename",false);return out;
 });}
 /** Opens a file in the Android app that handles its type. */
 @PluginMethod public void storageOpen(PluginCall call){storage(call,b->{
  java.io.File f=b.resolve(call.getString("path",""),false);if(!f.isFile())throw new java.io.FileNotFoundException();
  Intent view=new Intent(Intent.ACTION_VIEW).setDataAndType(contentUri(f),StorageBrowser.mime(f.getName())).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
  if(!startOnUi(Intent.createChooser(view,null)))return result("unsupported","No app can open this file.");
  return result("opened","");
 });}
 private boolean startOnUi(Intent intent)throws InterruptedException{
  Activity activity=getActivity();if(activity==null)return false;CountDownLatch started=new CountDownLatch(1);boolean[] opened={false};
  activity.runOnUiThread(()->{try{activity.startActivity(intent);opened[0]=true;}catch(RuntimeException e){opened[0]=false;}finally{started.countDown();}});
  return started.await(5,TimeUnit.SECONDS)&&opened[0];
 }
 /** Watches the folder (or MediaStore for a category) on screen; a change emits storageChanged once per burst. */
 @PluginMethod public void storageWatch(PluginCall call){storage(call,b->{
  stopWatching();String path=call.getString("path");String category=call.getString("category");
  if(path!=null){java.io.File folder=b.resolve(path,true);
   observer=new FileObserver(folder,FileObserver.CREATE|FileObserver.DELETE|FileObserver.MOVED_FROM|FileObserver.MOVED_TO|FileObserver.CLOSE_WRITE|FileObserver.DELETE_SELF|FileObserver.MOVE_SELF){@Override public void onEvent(int event,String name){burst();}};observer.startWatching();}
  if(category!=null||path==null){mediaObserver=new android.database.ContentObserver(main){@Override public void onChange(boolean self){burst();}};resolver().registerContentObserver(android.provider.MediaStore.Files.getContentUri(android.provider.MediaStore.VOLUME_EXTERNAL),true,mediaObserver);}
  return new JSObject();
 });}
 @PluginMethod public void storageUnwatch(PluginCall call){stopWatching();call.resolve(new JSObject());}
 private void burst(){main.removeCallbacks(changed);main.postDelayed(changed,400);}
 private synchronized void stopWatching(){if(observer!=null){observer.stopWatching();observer=null;}if(mediaObserver!=null){resolver().unregisterContentObserver(mediaObserver);mediaObserver=null;}main.removeCallbacks(changed);}
 @Override protected void handleOnDestroy(){stopWatching();storageWorker.shutdownNow();worker.shutdownNow();}
}
