// spec/app/calendar/index.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.calendar.CalendarConfiguration;
import ai.eliza.plugins.calendar.CalendarPlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "ElizaCalendar", permissions = {
 @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR }),
 @Permission(alias = "workflowCalendarRead", strings = { Manifest.permission.READ_CALENDAR })
})
public final class AlphaCalendarPlugin extends CalendarPlugin {
 static final CalendarConfiguration CONFIGURATION = new CalendarConfiguration(
  "Alpha Phone", "alpha-phone-local", "On this phone", "alpha-calendar-creations-v1", "alphaphone://calendar-creation/", 0xff0000ff, 2000);

 public AlphaCalendarPlugin() { super(CONFIGURATION); }
}
