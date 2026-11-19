package ai.alphacompute.alphaphone;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;

/**
 * Display names and descriptions for channels that shared code creates without a description, or
 * with a name that repeats another row (app review #855, NOTIF-13). Channel IDs are installed
 * identities and never change here. Only a channel that already exists is touched, with its own
 * importance: Android then updates just its name and description, so nothing is created early and
 * no owner choice (importance, sound, lock screen) is replaced.
 *
 * No channel is put in a group. The shared posters decide "blocked" from the channel alone, and the
 * shared notice routing reads a grouped eliza_updates as owner-customised, so grouping needs a
 * shared change first.
 */
final class AlphaNotificationChannels {
 private AlphaNotificationChannels(){}
 /** Channel ID, then the string resources (alpha-notices.xml) for its display name (0 keeps the installed name) and description. */
 static final class Row {final String id;final int name,description;Row(String id,int name,int description){this.id=id;this.name=name;this.description=description;}}
 static final Row[] ROWS={
  new Row("eliza_alerts",0,R.string.alpha_channel_alerts_description),
  new Row("eliza_notifications",0,R.string.alpha_channel_notifications_description),
  new Row("eliza_updates",0,R.string.alpha_channel_updates_description),
  new Row("eliza_quiet",0,R.string.alpha_channel_quiet_description),
  // The shared reminder store names this channel after the older one plus " (due)"; it is the one in use.
  new Row(AlphaReminders.CONFIGURATION.channelId,R.string.alpha_channel_reminders_old_name,R.string.alpha_channel_reminders_old_description),
  new Row(AlphaReminders.CONFIGURATION.dueChannelId(),R.string.alpha_channel_reminders_name,R.string.alpha_channel_reminders_description),
 };
 /** Safe to repeat: a channel whose name and description already match is left alone. */
 static void describe(Context context){
  try{
   NotificationManager manager=context.getSystemService(NotificationManager.class);
   if(manager==null)return;
   for(Row row:ROWS){
    NotificationChannel existing=manager.getNotificationChannel(row.id);
    if(existing==null)continue;
    String name=row.name==0?String.valueOf(existing.getName()):context.getString(row.name),description=context.getString(row.description);
    if(name.contentEquals(existing.getName())&&description.equals(existing.getDescription()))continue;
    NotificationChannel next=new NotificationChannel(row.id,name,existing.getImportance());
    next.setDescription(description);
    manager.createNotificationChannel(next);
   }
  }catch(RuntimeException unavailable){/* Presentation only; retried on the next start or return to the app. */}
 }
}
