package ai.alphacompute.alphaphone;

import android.media.AudioRecord;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;

public final class LiveCapturePorts {
 public static final ArrayList<AudioRecord> records=new ArrayList<>();
 public static boolean holdOpen,failRelease,failStart;
 public static CountDownLatch opening=new CountDownLatch(1),allowOpen=new CountDownLatch(1);
 public static int startsDuringCall;
 private LiveCapturePorts(){}
}
