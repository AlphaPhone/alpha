package ai.alphacompute.alphaphone;

import android.view.HapticFeedbackConstants;

/**
 * The Android touch feedback for each renderer haptic kind (apps/app/src/runtime/haptics.ts).
 * View.performHapticFeedback plays it only when the owner's touch-feedback setting allows.
 */
final class AlphaHaptics {
 private AlphaHaptics(){}
 /** The HapticFeedbackConstants value for a kind on this API level, or -1 for an unknown kind. */
 static int constant(String kind,int sdk){
  if(kind==null)return -1;
  switch(kind){
   case "toggle-on":return sdk>=34?HapticFeedbackConstants.TOGGLE_ON:HapticFeedbackConstants.CLOCK_TICK;
   case "toggle-off":return sdk>=34?HapticFeedbackConstants.TOGGLE_OFF:HapticFeedbackConstants.CLOCK_TICK;
   case "confirm":return sdk>=30?HapticFeedbackConstants.CONFIRM:HapticFeedbackConstants.VIRTUAL_KEY;
   case "long-press":return HapticFeedbackConstants.LONG_PRESS;
   default:return -1;
  }
 }
}
