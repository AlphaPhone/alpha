package ai.alphacompute.alphaphone;
import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionCoordinator;
import ai.eliza.plugins.actionjournal.deletion.DeletionReceiptRecovery;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.actionjournal.ActionJournalPlugin;
import ai.eliza.plugins.notifications.NoticeRecovery;
import java.util.Set;
import org.json.JSONObject;
import static ai.eliza.plugins.actionjournal.ActionJournal.sameJson;

/**
 * Product receipt recovery over the shared encrypted journal, the deletion window's records, the
 * agent device-execution journal (get/edit/list without a scope) and Clock approval of an agent
 * Clock request bound to its device-execution entry.
 */
@CapacitorPlugin(name="AlphaActionJournal")
public final class AlphaActionJournalPlugin extends ActionJournalPlugin {
 @Override protected ActionJournal createJournal(){return AlphaActionJournal.get(getContext());}
 @PluginMethod public void recoverNotification(PluginCall call){work(call,true,(store,scope,id)->{synchronized(store.lock()){
  JSONObject entry=store.get(scope,id);
  WorkflowNoticeDelivery delivery=WorkflowNoticeTapsFactory.delivery(getContext());
  JSONObject recovered=NoticeRecovery.recover(entry,scope,id,call.getString("bindingHash"),delivery::receipt);
  if(recovered!=entry)store.update(scope,id,previous->recovered);return entryResponse(recovered);
 }});}
 @PluginMethod public void recoverDeletion(PluginCall call){work(call,true,(store,scope,id)->{synchronized(store.lock()){
  JSONObject entry=store.get(scope,id);if(entry==null)return entryResponse(null);
  JSONObject operation=entry.getJSONObject("record").getJSONObject("operation");String type=operation.optString("type");
  if(!Set.of("calendar_delete","reminder_cancel").contains(type))return entryResponse(entry);
  JSONObject receipt=NativeDeletionCoordinator.get(getContext()).receipt("calendar_delete".equals(type)?"calendar":"reminder",entry.getString("operationId")),reminderResult=null;
  if(receipt!=null&&"reminder_cancel".equals(type)&&receipt.has("operationBinding")){
   JSONObject binding=receipt.getJSONObject("operationBinding"),saved=AlphaReminders.engine(getContext()).operationReceipt(entry.getString("operationId"),binding.getString("bindingHash"),operation);
   if("succeeded".equals(saved.optString("status")))reminderResult=saved.optJSONObject("result");
  }
  JSONObject recovered=DeletionReceiptRecovery.recover(entry,receipt,reminderResult);
  if(recovered!=entry){AlphaActionJournal.checkResult(recovered,recovered.getString("status"),recovered.getJSONObject("result"));store.update(scope,id,previous->recovered);}return entryResponse(recovered);
 }});}
 @PluginMethod public void recoverReminder(PluginCall call){work(call,true,(store,scope,id)->{synchronized(store.lock()){
  JSONObject entry=store.get(scope,id);if(entry==null)throw new IllegalStateException();
  JSONObject operation=entry.getJSONObject("record").getJSONObject("operation");
  if(!AlphaActionJournal.REMINDER_OPERATIONS.contains(operation.optString("type")))throw new IllegalArgumentException();
  if("terminal".equals(entry.optString("phase"))&&!"unknown".equals(entry.optString("status")))return entryResponse(entry);
  if(!"applying".equals(entry.optString("phase"))&&!"unknown".equals(entry.optString("status")))throw new IllegalStateException();
  String binding=call.getString("bindingHash");
  if(!scope.equals(entry.getString("scope"))||!id.equals(entry.getString("proposalId"))||!NoticeRecovery.binding(entry,scope,id).equals(binding))throw new IllegalStateException("Reminder recovery binding changed");
  JSONObject receipt=AlphaReminders.engine(getContext()).operationReceipt(entry.getString("operationId"),binding,operation);
  if(!"succeeded".equals(receipt.optString("status")))return entryResponse(entry);
  entry.put("phase","terminal").put("status","succeeded").put("summary","Recovered the original saved reminder receipt. No action was repeated.").put("finishedAt",System.currentTimeMillis())
   .put("result",new JSONObject().put("operationId",entry.getString("operationId")).put("reminderResult",receipt.getJSONObject("result")));
  store.update(scope,id,previous->entry);return entryResponse(entry);
 }});}
 private final android.os.Handler clockMain = new android.os.Handler(android.os.Looper.getMainLooper());
 private <T> T clockUi(java.util.concurrent.Callable<T> action) throws Exception {
  if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) throw new IllegalStateException("Clock storage must run off main thread");
  java.util.concurrent.FutureTask<T> task = new java.util.concurrent.FutureTask<>(() -> { if (destroyed()) throw new IllegalStateException(); return action.call(); });
  if (!clockMain.post(task)) throw new IllegalStateException("Activity unavailable");
  try { return task.get(5, java.util.concurrent.TimeUnit.SECONDS); }
  catch (InterruptedException interrupted) { task.cancel(false); clockMain.removeCallbacks(task); Thread.currentThread().interrupt(); throw interrupted; }
  catch (Exception unavailable) { task.cancel(false); clockMain.removeCallbacks(task); throw unavailable; }
 }
 private DeviceExecutionJournal deviceJournal(){return DeviceExecutionJournal.of(getContext());}
 private ClockReviewMarks clockMarks(){return ClockReviewMarks.of(getContext());}
 /** Runs one device-journal call on the journal worker; a call after teardown is refused, never run. */
 private void deviceWork(PluginCall call,java.util.concurrent.Callable<JSObject> task){
  PluginWorkers.submit(worker(),()->{try{if(destroyed())throw new IllegalStateException();call.resolve(task.call());}catch(Exception refused){call.reject(refusal());}},()->call.reject(refusal()));
 }
 /** With a {@code scope}, the shared journal's entry; without one, the device-execution entry for {@code proposalId} ({@code {entry, digest}}, entry null when absent). */
 @Override @PluginMethod public void get(PluginCall call){
  if(call.getData().has("scope")){super.get(call);return;}
  deviceWork(call,()->{JSObject out=new JSObject();JSONObject entry=deviceJournal().get(call.getString("proposalId"));out.put("entry",entry==null?JSONObject.NULL:entry);if(entry!=null&&!entry.optString("digest").isEmpty())out.put("digest",entry.getString("digest"));return out;});
 }
 /** With a {@code scope}, the shared journal's entries; without one, every device-execution entry ({@code {entries}}). */
 @Override @PluginMethod public void list(PluginCall call){
  if(call.getData().has("scope")){super.list(call);return;}
  deviceWork(call,()->{JSObject out=new JSObject();out.put("entries",deviceJournal().list());return out;});
 }
 /** Compare-and-set of one device-execution entry at the revision the page last read ({@code {kept}}). */
 @PluginMethod public void edit(PluginCall call){
  deviceWork(call,()->{
   Object expected=call.getData().opt("expectedRevision");
   if(!(expected instanceof Number)||((Number)expected).doubleValue()<0||((Number)expected).doubleValue()!=Math.floor(((Number)expected).doubleValue()))throw new IllegalArgumentException();
   JSONObject next=call.getData().optJSONObject("next");
   JSObject out=new JSObject();out.put("kept",deviceJournal().edit(call.getString("proposalId"),((Number)expected).longValue(),next==null?null:new JSONObject(next.toString())));return out;
  });
 }
 /** The deletion window's records (Messages, voicemail, contacts, calendar, reminders) for the shared pending/undo/dismiss. */
 @Override protected DeferredDeletionCoordinator deletions()throws Exception{return NativeDeletionCoordinator.get(getContext());}
 /** The device-execution entry an agent Clock request runs under: claimed, live, of a bound owner, and naming this operation. */
 private JSONObject clockEntry(String id,String operationId)throws Exception{
  if(destroyed())throw new IllegalStateException();
  JSONObject entry=deviceJournal().get(id);
  if(entry==null||!operationId.equals(entry.optString("operationId")))throw new IllegalStateException();
  DeviceExecutionJournal.Attempt attempt=DeviceExecutionJournal.attemptOf(entry);
  if(!Set.of("Applying","Called").contains(attempt.phase)||attempt.attemptId<=0||attempt.retired)throw new IllegalStateException();
  for(String name:new String[]{"ownerId","agentId","origin","installationId","enrollmentId"})if(entry.optString(name).isEmpty())throw new IllegalStateException();
  ClockAgentReview.validate(operationOf(entry));
  return entry;
 }
 private static JSONObject operationOf(JSONObject entry)throws Exception{return new JSONObject(entry.getString("operation"));}
 /** The mark for this attempt, or null; a mark left by another attempt or operation refuses. */
 private static JSONObject boundMark(JSONObject mark,JSONObject entry)throws Exception{
  if(mark==null)return null;
  if(!ClockReviewMarks.binds(mark,entry))throw new IllegalStateException();
  return mark;
 }
 private JSObject clockReply(JSONObject clock,String action)throws Exception{
  JSObject out=new JSObject();out.put("result",clock!=null&&clock.has("result")?clock.getJSONObject("result"):ClockAgentReview.result(action,"unknown"));return out;
 }
 /** Rejects a Clock call that arrives after handleOnDestroy stopped the worker: nothing was reviewed, approved or handed to Clock. */
 private void clockWork(PluginCall call,Runnable task){
  PluginWorkers.submit(worker(),task,()->call.reject("Clock review closed before this step started; nothing was sent to Clock"));
 }
 @PluginMethod public void reviewClock(PluginCall call){
  clockWork(call,()->{try{
   String scope=ActionJournal.scope(call.getString("scope")),id=ActionJournal.id(call.getString("proposalId")),operationId=ActionJournal.id(call.getString("operationId"));
   String key=scope+":"+id;ClockReviewMarks marks=clockMarks();JSONObject approved;
   synchronized(ClockReviewMarks.lock()){
    JSONObject entry=clockEntry(id,operationId),clock=boundMark(marks.get(key),entry);approved=operationOf(entry);
    if(!sameJson(approved,call.getObject("operation")))throw new IllegalStateException();
    if(clock!=null&&!"reviewing".equals(clock.getString("phase"))){call.resolve(clockReply(clock,approved.getString("action")));return;}
    if("show".equals(approved.getString("action"))){
     // Opening Clock changes no alarm: the approved card is the owner's review. confirmClock still
     // checks foreground and keyguard and starts only an external Clock.
     String token=java.util.UUID.randomUUID().toString();marks.put(key,ClockReviewMarks.mark(entry,"approved").put("reviewToken",token));
     JSObject reply=new JSObject();reply.put("reviewToken",token);call.resolve(reply);return;
    }
    // "reviewing" sends nothing. One whose dialog closed with its surface or process is offered again.
    if(!ClockAgentReview.claim(this,key)){call.resolve(clockReply(clock,approved.getString("action")));return;}
    if(clock==null)try{marks.put(key,ClockReviewMarks.mark(entry,"reviewing"));}catch(Exception unsaved){ClockAgentReview.release(this,key);throw unsaved;}
   }
   try{clockUi(()->{
    ClockAgentReview.show(getActivity(),this,key,approved,accepted->{if(destroyed())return;PluginWorkers.submit(worker(),()->{if(destroyed())return;try{synchronized(ClockReviewMarks.lock()){JSONObject entry=clockEntry(id,operationId),clock=boundMark(marks.get(key),entry);
      if(clock==null||!"reviewing".equals(clock.getString("phase"))){call.resolve(clockReply(clock,approved.getString("action")));return;}
      JSObject reply=new JSObject();if(accepted){String token=java.util.UUID.randomUUID().toString();clock.put("phase","approved").put("reviewToken",token).put("issuedAt",System.currentTimeMillis());reply.put("reviewToken",token);}else{clock.put("phase","cancelled").put("result",ClockAgentReview.result(approved.getString("action"),"failed"));reply=clockReply(clock,approved.getString("action"));}
      marks.put(key,clock);call.resolve(reply);
     }}catch(Exception refusal){if(!destroyed())call.reject("Clock review expired or was retired");}},()->call.reject("Clock review retired"));});
    return null;
   });}catch(Exception closed){ClockAgentReview.release(this,key);throw closed;}
  }catch(Exception refusal){call.reject("Exact approved Clock review unavailable");}});
 }
 @PluginMethod public void cancelClock(PluginCall call){work(call,true,(store,scope,id)->{synchronized(ClockReviewMarks.lock()){
  String operationId=ActionJournal.id(call.getString("operationId"));JSONObject entry=deviceJournal().get(id);
  if(entry==null||!operationId.equals(entry.optString("operationId")))throw new IllegalStateException();
  JSONObject operation=operationOf(entry);ClockAgentReview.validate(operation);
  String key=scope+":"+id;ClockReviewMarks marks=clockMarks();JSONObject clock=marks.get(key);
  if(clock==null||!ClockReviewMarks.binds(clock,entry))clock=ClockReviewMarks.mark(entry,"reviewing");
  if(Set.of("reviewing","approved").contains(clock.getString("phase"))){clock.put("phase","cancelled").remove("reviewToken");clock.put("result",ClockAgentReview.result(operation.getString("action"),"failed"));marks.put(key,clock);}
  getActivity().runOnUiThread(()->ClockAgentReview.dismiss(key));return clockReply(clock,operation.getString("action"));
 }});}
 @PluginMethod public void confirmClock(PluginCall call){
  // Serialize exact approval and durable dispatch intent on the journal worker.
  // Only the foreground check and Android handoff run on the Activity thread.
  clockWork(call,()->{try{synchronized(ClockReviewMarks.lock()){
   if(destroyed())throw new IllegalStateException();
   String scope=ActionJournal.scope(call.getString("scope")),id=ActionJournal.id(call.getString("proposalId")),operationId=ActionJournal.id(call.getString("operationId"));
   String key=scope+":"+id;ClockReviewMarks marks=clockMarks();
   JSONObject entry=clockEntry(id,operationId),clock=boundMark(marks.get(key),entry),operation=operationOf(entry);
   if(clock==null)throw new IllegalStateException();
   if(!"approved".equals(clock.getString("phase"))){call.resolve(clockReply(clock,operation.getString("action")));return;}
   if(!clock.getString("reviewToken").equals(call.getString("reviewToken")))throw new IllegalStateException();
   clockUi(()->{ClockAgentReview.foreground(getActivity());ClockAgentReview.zone(operation);return null;});
   long expiresAt=clock.optLong("issuedAt",0)+ClockReviewMarks.APPROVAL_WINDOW_MS;
   clock.put("phase","dispatching").remove("reviewToken");marks.put(key,clock);
   JSObject result=clockUi(()->{if(expiresAt<=System.currentTimeMillis())return ClockAgentReview.result(operation.getString("action"),"failed");return ClockAgentReview.dispatch(getActivity(),operation);});
   clock.put("phase","finished").put("result",result);marks.put(key,clock);call.resolve(clockReply(clock,operation.getString("action")));
  }}catch(Exception uncertain){call.reject("Clock handoff result is unconfirmed; do not repeat it");}});
 }
 @Override protected void handleOnDestroy(){super.handleOnDestroy();ClockAgentReview.abandon(this);}
}
