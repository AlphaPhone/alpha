// spec/app/assistant/attachments.md, "Story: Choose files to attach"; spec/app/assistant/attachments.md, "Attach reads the chosen files once, and adds only those within the type, name and size limits"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertThrows;

import android.system.ErrnoException;
import android.system.Os;
import android.system.OsConstants;
import androidx.test.platform.app.InstrumentationRegistry;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileTime;
import org.junit.Test;

public final class AttachmentCustodyInstrumentedTest {
 @Test public void readsOnlyTheReviewedRegularFile() throws Exception {
  Path cache = InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir().toPath();
  Path scratch = Files.createTempDirectory(cache, "ask-attachment-");
  Path visible = scratch.resolve("notes.txt");
  Path replacement = scratch.resolve("replacement.txt");
  byte[] original = {1, 2, 3};
  byte[] other = {4, 5, 6};
  FileTime modified = FileTime.fromMillis(1_700_000_000_000L);
  try {
   Files.write(visible, original);
   Files.setLastModifiedTime(visible, modified);
   String receipt = AlphaSelectedDocumentsPlugin.attachmentReceipt(visible.toFile());
   long inode = Os.lstat(visible.toString()).st_ino;
   assertArrayEquals(original, AlphaSelectedDocumentsPlugin.readReviewedDescriptor(visible.toFile(), receipt, original.length));

   Files.write(replacement, other);
   Files.setLastModifiedTime(replacement, modified);
   Files.move(replacement, visible, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
   assertEquals(original.length, Files.size(visible));
   assertEquals(modified, Files.getLastModifiedTime(visible));
   assertNotEquals(inode, Os.lstat(visible.toString()).st_ino);
   assertThrows(IllegalStateException.class,
       () -> AlphaSelectedDocumentsPlugin.readReviewedDescriptor(visible.toFile(), receipt, original.length));

   String current = AlphaSelectedDocumentsPlugin.attachmentReceipt(visible.toFile());
   assertArrayEquals(other, AlphaSelectedDocumentsPlugin.readReviewedDescriptor(visible.toFile(), current, other.length));
   Files.move(visible, replacement);
   Os.symlink(replacement.toString(), visible.toString());
   ErrnoException refused = assertThrows(ErrnoException.class,
       () -> AlphaSelectedDocumentsPlugin.readReviewedDescriptor(visible.toFile(), current, other.length));
   assertEquals(OsConstants.ELOOP, refused.errno);
   assertArrayEquals(other, Files.readAllBytes(replacement));
  } finally {
   Files.deleteIfExists(visible);
   Files.deleteIfExists(replacement);
   Files.deleteIfExists(scratch);
  }
 }
}
