package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.BuildConfig;
import com.android.systemui.privacy.SenseListeningPolicy;

/**
 * Alpha's notification Pause action against the SystemUI chip that consumes it (ported from the
 * contract part of the shared ListenerSystemUiPolicyTest): only Pause is advertised, under the
 * versioned key SystemUI reads, and SystemUI accepts exactly the token Alpha's listener posts.
 */
public final class ListenerActionContractTest {
 static final String PKG="ai.alphacompute.alphaphone.sense";
 static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
 static boolean pause(int uid,int notice,int creator,String pkg,int id,String channel,boolean immutable,boolean broadcast,boolean auth,String marker){
  return SenseListeningPolicy.pause(PKG,uid,notice,PKG,id,channel,creator,pkg,immutable,broadcast,auth,marker);
 }
 public static void main(String[] args){
  check(BuildConfig.APPLICATION_ID.equals(PKG),"listener application id");
  check(ListenerActionReceiver.PAUSE.equals(PKG+".action.PAUSE")&&ListenerActionReceiver.RESUME.equals(PKG+".action.RESUME")
   &&ListenerActionReceiver.STOP.equals(PKG+".action.STOP")&&ListenerActionReceiver.DISMISSED.equals(PKG+".action.DISMISSED"),"installed action names");
  check(ListenerActionContract.KEY.equals(PKG+".SYSTEMUI_ACTION_V1"),"producer consumer contract key");
  check(ListenerActionContract.PAUSE.equals(SenseListeningPolicy.PAUSE),"marker matches SystemUI");
  check(ListenerActionContract.PAUSE.equals(ListenerActionContract.marker(ListenerActionReceiver.PAUSE)),"only pause advertised");
  for(String action:new String[]{null,"",ListenerActionReceiver.RESUME,ListenerActionReceiver.STOP,ListenerActionReceiver.DISMISSED})
   check(ListenerActionContract.marker(action)==null,"never advertise another action: "+action);
  // The indicator notification: id 1 on the listening-indicator channel, immutable broadcast, Pause without unlock.
  check(ListenerNotifications.ACTIVE_ID==1&&ListenerNotifications.STATUS_ID==2,"notification ids");
  check("listening-indicator".equals(ListenerNotifications.CHANNEL_ACTIVE)&&"listener-status".equals(ListenerNotifications.CHANNEL_STATUS)&&"listening".equals(ListenerNotifications.CHANNEL_RETIRED),"channel ids");
  String marker=ListenerActionContract.marker(ListenerActionReceiver.PAUSE);
  check(pause(10042,10042,10042,PKG,ListenerNotifications.ACTIVE_ID,ListenerNotifications.CHANNEL_ACTIVE,true,true,false,marker),"SystemUI accepts Alpha's pause token");
  check(!pause(10042,10042,10042,PKG,ListenerNotifications.STATUS_ID,ListenerNotifications.CHANNEL_ACTIVE,true,true,false,marker),"never from the status notification");
  check(!pause(10042,10042,10042,PKG,ListenerNotifications.ACTIVE_ID,ListenerNotifications.CHANNEL_STATUS,true,true,false,marker),"never from the status channel");
  check(!pause(10042,10042,10042,PKG,ListenerNotifications.ACTIVE_ID,ListenerNotifications.CHANNEL_ACTIVE,true,true,true,marker),"never an unlock-requiring action");
  check(!pause(10042,10042,10042,PKG,ListenerNotifications.ACTIVE_ID,ListenerNotifications.CHANNEL_ACTIVE,true,true,false,ListenerActionContract.marker(ListenerActionReceiver.RESUME)),"never resume");
  System.out.println("PASS Alpha listener pause contract with SystemUI");
 }
}
