// spec/app/telephony/callBar.md, "Story: See my live call over every view"
package ai.alphacompute.alphaphone;

final class AlphaLauncher {
 private AlphaLauncher() {}

 static void register(MainActivity activity, boolean image) {
  AlphaTelephonyRoles.sync(activity);
  if (image) activity.registerPlugin(AlphaOngoingCallPlugin.class);
 }
}
