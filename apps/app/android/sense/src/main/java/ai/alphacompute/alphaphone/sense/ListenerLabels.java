package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.ListenerPolicy;

/**
 * Alpha's lock-screen-safe status text for each listener state: the notification title, the Quick
 * Settings tile's state description, the listening settings heading and the control provider's
 * {@code label}. Never contains captured content. The shared {@link ListenerPolicy} decides the
 * state; its own English label is never shown. Every label stays under 64 characters.
 */
final class ListenerLabels {
 private ListenerLabels(){}

 static String label(ListenerPolicy.State state){
  switch(state){
   case LISTENING:return "Listening";
   case PAUSED_USER:return "Listening paused";
   case PAUSED_CALL:return "Paused during a call";
   case PAUSED_MIC_IN_USE:return "Paused while another app uses the microphone";
   case PAUSED_MIC_UNAVAILABLE:return "Paused because the microphone is unavailable";
   case PAUSED_DISPLAY_OFF:return "Paused while the screen is off without Always-on display";
   case PAUSED_FULLSCREEN:return "Paused while an app is full screen";
   case PAUSED_SHADE:return "Paused while notifications are open";
   case PAUSED_TRANSITION:return "Paused while the screen changes";
   case WAITING_FOR_UNLOCK:return "Listening starts after you unlock the phone";
   case SPEECH_UNAVAILABLE:return "Listening unavailable until on-device speech is ready";
   case STOPPED_AFTER_ERRORS:return "Listening stopped after repeated errors";
   case STOPPED_INDICATOR_LOST:return "Listening stopped because its indicator wasn’t shown";
   case INDICATOR_UNAVAILABLE:return "Listening is waiting for its indicator";
   case PERMISSION_REQUIRED:return "Listening needs microphone permission";
   case NOTIFICATIONS_REQUIRED:return "Listening needs its notification to be allowed";
   case PAUSED_OTHER_USER:return "Paused while another user is active";
   default:return "Listening is off";
  }
 }
}
