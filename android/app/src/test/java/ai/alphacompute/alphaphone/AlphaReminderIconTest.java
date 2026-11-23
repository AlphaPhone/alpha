package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/** Due reminders show Alpha's monochrome bell; ReminderQuestionTest covers how the shared store posts it. */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public class AlphaReminderIconTest {
    @Test public void dueRemindersUseAlphasBell() {
        assertEquals(R.drawable.ic_reminder, AlphaReminders.CONFIGURATION.smallIcon);
    }
}
