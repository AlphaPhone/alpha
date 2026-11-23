package ai.alphacompute.alphaphone;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.eliza.plugins.notifications.HostNoticePoster;
import ai.eliza.plugins.notifications.NoticeDelivery;
import ai.eliza.plugins.notifications.NoticeRoutes;
import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.notifications.NotificationsHostPlugin;

/**
 * Alpha's registration of the shared notifications bridge (ai.eliza.plugins.notifications.NotificationsHostPlugin):
 * own rows, channel settings, cross-app access and workflow taps are upstream code behind its
 * ForegroundNoticeGate; the workflow notices themselves are posted by Alpha's WorkflowNoticePoster.
 * Alpha supplies installed identities (label, scope, credential slots, alpha-workflow-* channels and
 * routes, the alpha-notification-access mirror), its own notice kinds and the canonical Eliza
 * notification tap, which is Alpha's resident-agent integration.
 */
@CapacitorPlugin(name="AlphaNotifications")
public class AlphaNotificationsPlugin extends NotificationsHostPlugin {
 private static java.lang.ref.WeakReference<AlphaNotificationsPlugin> canonicalLive=new java.lang.ref.WeakReference<>(null);
 static void canonicalTapReady(){AlphaNotificationsPlugin plugin=canonicalLive.get();if(plugin!=null)plugin.notifyListeners("canonicalNotificationTap",new JSObject(),true);}
 @PluginMethod public void canonicalPending(PluginCall call){
  noticeWork(call,"Notification owner is unavailable.",()->{
   AlphaCanonicalNotifications.ensure(getContext());org.json.JSONObject pending=AlphaCanonicalNotifications.pending();
   requireNoticeForeground();call.resolve(JSObject.fromJSONObject(pending));
  });
 }
 @PluginMethod public void acknowledgeCanonical(PluginCall call){
  String token=call.getString("token","");
  noticeWork(call,"Notification read status is unconfirmed; it will not be retried.",()->{
   AlphaCanonicalNotifications.acknowledge(token,this::requireNoticeForeground);
   requireNoticeForeground();call.resolve(new JSObject().put("ok",true));
  });
 }
 /** One own row as the renderer was last shown it: its post time and title, under the id the shared list gave it. */
 private static final class Shown {
  final long at;final String title;
  Shown(long at,String title){this.at=at;this.title=title;}
 }
 /** Own rows of the latest listing by id, and the ids a question already consumed; both forgotten on pause, as the shared ids are. */
 private final java.util.Map<String,Shown> shown=new java.util.concurrent.ConcurrentHashMap<>();
 private final java.util.Set<String> consumedOwn=java.util.concurrent.ConcurrentHashMap.newKeySet();
 /** A listing call that remembers the own rows it answers before passing the answer on. */
 private final class ListingCall extends PluginCall {
  private final PluginCall original;
  ListingCall(PluginCall original){super(null,original.getPluginId(),original.getCallbackId(),original.getMethodName(),original.getData());this.original=original;}
  @Override public void resolve(JSObject value){remember(value);original.resolve(value);}
  @Override public void resolve(){original.resolve();}
  @Override public void reject(String message,String code,Exception cause,JSObject data){original.reject(message,code,cause,data);}
 }
 private void remember(JSObject listing){
  org.json.JSONArray items=listing==null?null:listing.optJSONArray("items");
  if(items==null)return;
  java.util.Set<String> current=new java.util.HashSet<>();
  for(int i=0;i<items.length();i++){
   org.json.JSONObject item=items.optJSONObject(i);
   if(item==null||!"own".equals(item.optString("source")))continue;
   String id=item.optString("id","");if(id.isEmpty())continue;
   current.add(id);shown.put(id,new Shown(item.optLong("at"),item.optString("title","")));
  }
  shown.keySet().retainAll(current);consumedOwn.retainAll(current);
 }
 /** The shared list, remembering each own row so a notice question can consume it once. */
 @Override @PluginMethod public void list(PluginCall call){super.list(new ListingCall(call));}
 /**
  * Consumes one of Alpha's own notices for the assistant's notice question, at most once per listing: `consumed` the first time,
  * `already-consumed` after, `changed` when the revision is not the listed one, `gone` when the row is no longer posted, and
  * `unavailable` when the posted row cannot be told apart.
  */
 @PluginMethod public void consumeOwnNotice(PluginCall call){
  String id=call.getString("id"),revision=call.getString("revision");
  noticeWork(call,"The notice could not be confirmed.",()->{
   requireNoticeForeground();
   String status;
   Shown row=id==null?null:shown.get(id);
   if(row==null)status="gone";
   else if(!id.equals(revision))status="changed";
   else if(consumedOwn.contains(id))status="already-consumed";
   else{
    int matches=0;
    for(android.service.notification.StatusBarNotification active:manager().getActiveNotifications()){
     if(active.getPostTime()!=row.at)continue;
     android.app.Notification n=active.getNotification();
     if(n.visibility==android.app.Notification.VISIBILITY_SECRET)continue;
     String title=ai.eliza.plugins.notifications.NotificationMirrorPolicy.bounded(n.extras.getCharSequence(android.app.Notification.EXTRA_TITLE),ai.eliza.plugins.notifications.NotificationMirrorPolicy.TITLE_LIMIT);
     if(row.title.equals(title))matches++;
    }
    status=matches==0?"gone":matches>1?"unavailable":consumedOwn.add(id)?"consumed":"already-consumed";
   }
   requireNoticeForeground();
   call.resolve(new JSObject().put("status",status));
  });
 }
 @Override protected void handleOnPause(){shown.clear();consumedOwn.clear();super.handleOnPause();}
 private AutoCloseable storeChanges;
 /** Posts `notificationsChanged` when one of Alpha's own rows is posted or removed, and `mirrorChanged` when a mirrored row or the mirror's access changes. */
 @Override public void load(){
  super.load();canonicalLive=new java.lang.ref.WeakReference<>(this);
  storeChanges=StoreChanges.observe(store->{
   String event=store==StoreChanges.Store.NOTIFICATIONS?"notificationsChanged":store==StoreChanges.Store.MIRROR?"mirrorChanged":null;
   if(event!=null)noticeMain().post(()->{if(!noticeHostDestroyed())notifyListeners(event,new JSObject(),false);});
  });
 }
 /** The live bridge, for the workflow taps {@link ElizaNotificationsPlugin} serves under the upstream name. */
 static AlphaNotificationsPlugin live(){return canonicalLive.get();}
 /** A workflow tap change also reaches the renderer's ElizaNotifications listeners. */
 @Override protected void notifyListeners(String event,JSObject data,boolean retain){
  super.notifyListeners(event,data,retain);
  if(PENDING_WORKFLOW_TAP_EVENT.equals(event))ElizaNotificationsPlugin.forward(event,data);
 }
 @Override protected void handleOnDestroy(){if(canonicalLive.get()==this)canonicalLive.clear();try{if(storeChanges!=null)storeChanges.close();}catch(Exception ignored){/* Already detached. */}super.handleOnDestroy();}

 @Override protected String appLabel(){return "Alpha Phone";}
 @Override protected String scope(){return "alpha-phone";}
 /** Deployed credential slots; the record formats are unchanged. */
 @Override protected NoticeDelivery.Storage noticeStorage(){AlphaCredentialStore store=new AlphaCredentialStore(getContext());return new NoticeDelivery.Storage(){public String read(String key)throws Exception{return store.readCredentialSlot(key);}public void write(String key,String value)throws Exception{store.writeCredentialSlot(key,value);}};}
 @Override protected NoticeDelivery.Config deliveryConfig(){return WorkflowNoticeDelivery.CONFIG;}
 @Override protected NoticeRoutes.Config routesConfig(){return WorkflowNoticeTaps.CONFIG;}
 @Override protected NoticeRoutes routes(){return WorkflowNoticeTapsFactory.create(getContext());}
 @Override protected HostNoticePoster.Config posterConfig(){return WorkflowNoticePoster.CONFIG;}
 /** Alpha's own WorkflowNoticePoster posts every workflow notice; the shared poster is never built. */
 @Override protected NoticeDelivery delivery(){NoticeRoutes routes=routes();return new NoticeDelivery(deliveryConfig(),noticeStorage(),new WorkflowNoticePoster(getContext(),routes::token));}
 @Override protected NotificationMirror mirror(){return NotificationAccess.MIRROR;}
 @Override protected String noticeKind(String channel){return kind(channel);}
 /**
  * The kind of one of Alpha's own notices, from its channel. Hosted results and scheduled digests
  * (alpha-hosted-results) and workflow notices can carry mail-derived text, so the renderer offers
  * a question only for reminder and navigation rows (context-selection.ts noticeReviewable). An
  * unrecognized channel is "other" and is not offered either.
  */
 static String kind(String channel){
  if(channel==null)return "other";
  if(AlphaHostedResultsPlugin.CHANNEL.equals(channel))return "hosted-result";
  if(WorkflowNoticePoster.CHANNEL.equals(channel)||WorkflowNoticePoster.APPROVAL_CHANNEL.equals(channel))return "workflow";
  if(AlphaReminders.CONFIGURATION.channelId.equals(channel)||AlphaReminders.CONFIGURATION.dueChannelId().equals(channel))return "reminder";
  if(AlphaNavigationService.CHANNEL.equals(channel))return "navigation";
  return "other";
 }
}
