// spec/app/notices/index.md
package ai.alphacompute.alphaphone;

import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Context;
import java.util.Objects;

final class AlphaNotificationChannels {
 private AlphaNotificationChannels() {}
 static final String ASSISTANT = "alpha.group.assistant", MAIL_AND_BRIEFS = "alpha.group.mail-briefs", WORKFLOWS = "alpha.group.workflows", ONGOING = "alpha.group.ongoing";

 record Group(String id, int name) {}
 record Row(String id, int name, int description, String group) {}

 static final Group[] GROUPS = {
  new Group(ASSISTANT, R.string.alpha_channel_group_assistant),
  new Group(MAIL_AND_BRIEFS, R.string.alpha_channel_group_mail_briefs),
  new Group(WORKFLOWS, R.string.alpha_channel_group_workflows),
  new Group(ONGOING, R.string.alpha_channel_group_ongoing),
 };
 static final Row[] ROWS = {
  new Row("eliza-agent", 0, 0, ASSISTANT),
 };

 static void describe(Context context) {
  try {
   NotificationManager manager = context.getSystemService(NotificationManager.class);
   if (manager == null) return;
   for (Row row : ROWS) {
    NotificationChannel existing = manager.getNotificationChannel(row.id());
    if (existing == null) continue;
    String name = row.name() == 0 ? String.valueOf(existing.getName()) : context.getString(row.name());
    String description = row.description() == 0 ? existing.getDescription() : context.getString(row.description());
    String group = existing.getGroup() != null ? existing.getGroup() : row.group();
    if (name.contentEquals(existing.getName()) && Objects.equals(description, existing.getDescription()) && Objects.equals(group, existing.getGroup())) continue;
    if (group != null && group.equals(row.group())) manager.createNotificationChannelGroup(new NotificationChannelGroup(group, context.getString(groupName(group))));
    NotificationChannel next = new NotificationChannel(row.id(), name, existing.getImportance());
    next.setDescription(description);
    next.setGroup(group);
    manager.createNotificationChannel(next);
   }
  } catch (RuntimeException unavailable) {
   android.util.Log.w("AlphaNotificationChannels", "Channel groups unchanged");
  }
 }

 private static int groupName(String id) {
  for (Group group : GROUPS) if (group.id().equals(id)) return group.name();
  throw new IllegalArgumentException("Unknown channel group");
 }
}
