package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.HostNoticePoster;
import ai.eliza.plugins.notifications.NoticeDelivery;
import ai.eliza.plugins.notifications.NoticeOwner;
import ai.eliza.plugins.notifications.NoticeRoutes;
import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.notifications.NotificationMirrorConfig;
import ai.eliza.plugins.notifications.NotificationsHostPlugin;
import ai.eliza.plugins.signin.CredentialPolicy.Custody;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name="ElizaNotifications")
public final class AlphaNotificationsPlugin extends NotificationsHostPlugin {
 static final NotificationMirror MIRROR=new NotificationMirror(new NotificationMirrorConfig(
   "alpha-notification-access","alpha.notification.history.v1","notification-history.enc",AlphaNotificationListener.class),AlphaNotificationOwner::admitted);
 private static final NoticeDelivery.Config DELIVERY=new NoticeDelivery.Config(
   "workflow-notice-delivery:v1","workflow-approval-notices:v1","Workflow step waiting for approval",
   "Open Alpha Phone to review it. Nothing runs until you approve it on this phone.",7L*86400000);
 private static final NoticeRoutes.Config ROUTES=new NoticeRoutes.Config(
   "workflow-notice-taps:v1","workflow-notice-owner:v1",DELIVERY,"workflowId","runId","versionId");
 private static final HostNoticePoster.Config POSTER=new HostNoticePoster.Config(
   "alpha_workflow_steps","Workflow updates","Messages your workflows send",
   "alpha_workflow_approvals","Workflow approvals","A workflow step needs your approval",
   R.drawable.notification_icon,"alpha-workflow-","ai.alphacompute.alphaphone.OPEN_WORKFLOW_NOTICE",
   "ai.alphacompute.alphaphone.ASK_WORKFLOW_NOTICE","alpha-workflow-notice:","Alpha Phone workflow",
   "Alpha Phone","Unlock to review this notification.","Ask Alpha","alpha_quiet_approvals",24L*3600000);

 @Override protected String appLabel(){return getContext().getString(R.string.app_name);}
 @Override protected String scope(){return "alpha-phone";}
 @Override protected NoticeDelivery.Storage noticeStorage(){
  AlphaSecureSlots slots=AlphaSecureSlots.of(getContext());
  return new NoticeDelivery.Storage(){
   @Override public String read(String key)throws Exception{return slots.read(key);}
   @Override public void write(String key,String value)throws Exception{slots.write(key,value);}
  };
 }
 @Override protected NoticeDelivery.Config deliveryConfig(){return DELIVERY;}
 @Override protected NoticeRoutes.Config routesConfig(){return ROUTES;}
 @Override protected HostNoticePoster.Config posterConfig(){return POSTER;}
 @Override protected NotificationMirror mirror(){return MIRROR;}

 private ResidentDigestChannel.Session noticeSession()throws Exception{
  var reader=new AlphaAgentCredentials(getContext()).reader();
  if(!(reader instanceof DeviceCredentialStore store))throw new SecurityException();
  var status=store.state();
  if(status.custody() instanceof Custody.SignedOut||status.custody() instanceof Custody.Expired){
   if(store.generation()!=status.generation())throw new SecurityException();
   return null;
  }
  return new ResidentDigestChannel(store,store::generation).openAccount();
 }

 @Override protected void requireWorkflowNoticeOwner(JSONObject owner)throws Exception{
  var session=noticeSession();
  if(session==null&&owner==null)return;
  if(session==null||owner==null||!NoticeOwner.matches(owner,new JSONObject().put("origin","agent:local")
   .put("ownerId",session.organizationId()+":"+session.scope().ownerId()).put("agentId",session.scope().agentId())))throw new SecurityException();
  session.check();
 }

 @PluginMethod public void workflowApprovalScope(PluginCall call){
  noticeWork(call,"Workflow notification owner is unavailable.",()->{
   var session=noticeSession();
   requireNoticeForeground();
   if(session==null){call.resolve(new JSObject().put("kind","signedOut"));return;}
   session.check();
   call.resolve(new JSObject().put("kind","owned").put("userId",session.scope().ownerId())
     .put("organizationId",session.organizationId()).put("agentId",session.scope().agentId()).put("epoch",session.epoch()));
  });
 }
}
