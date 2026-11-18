/**
 * What Alpha's call screen and call notices say and offer for a call, separate from how
 * {@link AlphaCallActivity} draws it (forked from the shared TelecomCallPresentation,
 * plugin-native-phone at elizaOS pin 1803ea88). Everything here is a pure function of Telecom state,
 * so it runs on the JVM.
 */
package ai.alphacompute.alphaphone;

import android.telecom.Call;
import java.util.Locale;

final class AlphaCallPresentation {
    private AlphaCallPresentation() {}

    /** The controls a call offers. A ringing call offers only answer and decline. */
    public static final class Controls {
        public final boolean answer, decline, end, mute, keypad, speaker, hold;

        Controls(boolean answer, boolean decline, boolean end, boolean mute, boolean keypad, boolean speaker, boolean hold) {
            this.answer = answer; this.decline = decline; this.end = end; this.mute = mute;
            this.keypad = keypad; this.speaker = speaker; this.hold = hold;
        }
    }

    /**
     * @param audioKnown Telecom reported an audio state, which mute and the speaker route need.
     * @param speakerRoutable the speaker and an earpiece or wired route are both supported.
     * @param canHold the call has {@code CAPABILITY_HOLD}.
     */
    public static Controls controls(int state, boolean audioKnown, boolean speakerRoutable, boolean canHold) {
        if (state == Call.STATE_RINGING) return new Controls(true, true, false, false, false, false, false);
        if (state == Call.STATE_DISCONNECTED || state == Call.STATE_DISCONNECTING) {
            return new Controls(false, false, false, false, false, false, false);
        }
        return new Controls(false, false, true, audioKnown, state == Call.STATE_ACTIVE,
            audioKnown && speakerRoutable, canHold);
    }

    /**
     * Up to two letters for the avatar: the first letter of the first and of the last word of the
     * name. A number with no name is {@code #}; a withheld caller has no initials.
     */
    public static String initials(String name, boolean hasNumber) {
        int first = -1, last = -1;
        if (name != null) {
            for (String word : name.trim().split("\\s+")) {
                int letter = initial(word);
                if (letter < 0) continue;
                if (first < 0) first = letter;
                else last = letter;
            }
        }
        if (first < 0) return hasNumber ? "#" : "";
        StringBuilder letters = new StringBuilder().appendCodePoint(Character.toUpperCase(first));
        if (last >= 0) letters.appendCodePoint(Character.toUpperCase(last));
        return letters.toString();
    }

    private static int initial(String word) {
        for (int i = 0; i < word.length(); ) {
            int point = word.codePointAt(i);
            if (Character.isLetter(point)) return point;
            i += Character.charCount(point);
        }
        return -1;
    }

    /** {@code m:ss}, or {@code h:mm:ss} from one hour. A negative duration is {@code 0:00}. */
    public static String elapsed(long millis) {
        long seconds = Math.max(0, millis) / 1000;
        long hours = seconds / 3600, minutes = seconds % 3600 / 60;
        seconds %= 60;
        return hours > 0
            ? String.format(Locale.ROOT, "%d:%02d:%02d", hours, minutes, seconds)
            : String.format(Locale.ROOT, "%d:%02d", minutes, seconds);
    }

    /**
     * The one line under the caller's name.
     *
     * @param numberWhenNamed the formatted number when a name is shown above it, otherwise null.
     * @param connectMillis {@code Call.Details.getConnectTimeMillis()}; 0 when Telecom has not set it.
     */
    public static String secondaryLine(int state, String numberWhenNamed, long connectMillis, long nowMillis) {
        switch (state) {
            case Call.STATE_RINGING: return numberWhenNamed == null ? "" : numberWhenNamed;
            case Call.STATE_ACTIVE: return connectMillis > 0 ? elapsed(nowMillis - connectMillis) : "";
            case Call.STATE_HOLDING: return "On hold";
            case Call.STATE_DISCONNECTING:
            case Call.STATE_DISCONNECTED: return "Call ended";
            default: return "Calling…";
        }
    }

    /** Milliseconds until the elapsed time next changes, so each tick lands on a second boundary. */
    public static long untilNextSecond(long connectMillis, long nowMillis) {
        long elapsed = nowMillis - connectMillis;
        return connectMillis > 0 && elapsed >= 0 ? 1000 - elapsed % 1000 : 1000;
    }

    /** A chip for a call that is not the one shown: who it is and what it is doing. */
    public static String chipLabel(String who, int state) {
        String doing;
        switch (state) {
            case Call.STATE_RINGING: doing = "Incoming"; break;
            case Call.STATE_ACTIVE: doing = "In call"; break;
            case Call.STATE_HOLDING: doing = "On hold"; break;
            case Call.STATE_DISCONNECTING:
            case Call.STATE_DISCONNECTED: doing = "Call ended"; break;
            default: doing = "Calling…";
        }
        return who + " · " + doing;
    }

    /** What a screen reader says for a toggle, for example "Mute, on". */
    public static String toggleDescription(String label, boolean on) {
        return label + (on ? ", on" : ", off");
    }

    /** What the call notice says under the caller, by Telecom state. */
    public static String stateLabel(int state) {
        switch (state) {
            case Call.STATE_RINGING: return "Incoming call";
            case Call.STATE_DIALING: return "Calling…";
            case Call.STATE_CONNECTING: return "Connecting…";
            case Call.STATE_ACTIVE: return "In call";
            case Call.STATE_HOLDING: return "On hold";
            case Call.STATE_DISCONNECTING: return "Ending call…";
            case Call.STATE_DISCONNECTED: return "Call ended";
            case Call.STATE_SELECT_PHONE_ACCOUNT: return "Choose a SIM to call from";
            default: return "Getting the call ready…";
        }
    }

    /**
     * What the WebView's ongoing-call bar is told a call is doing (AlphaOngoingCallPlugin): one of
     * {@code dialing}, {@code ringing}, {@code active} or {@code held}, or null for a call that is
     * ending, ended, or in a state the owner does not see.
     */
    static String ongoingState(int state) {
        if (ringing(state)) return "ringing";
        switch (state) {
            case Call.STATE_NEW:
            case Call.STATE_SELECT_PHONE_ACCOUNT:
            case Call.STATE_DIALING:
            case Call.STATE_CONNECTING:
            case Call.STATE_PULLING_CALL: return "dialing";
            case Call.STATE_ACTIVE: return "active";
            case Call.STATE_HOLDING: return "held";
            default: return null;
        }
    }

    /**
     * The connect time the ongoing-call bar counts its clock from: Telecom's
     * {@code Call.Details.getConnectTimeMillis()}, only once the call is ACTIVE or held. A dialing,
     * connecting or ringing call has none, whatever time the network has already attached to it, so
     * the bar says "Calling…" or "Incoming call" as the call screen does, never "On call · 0:00".
     */
    static Long ongoingConnectedAt(int state, long connectMillis) {
        boolean connected = state == Call.STATE_ACTIVE || state == Call.STATE_HOLDING;
        return connected && connectMillis > 0 ? connectMillis : null;
    }

    /**
     * A call still waiting for the owner's answer: Telecom's ringing, or a call it presents as ringing
     * after screening ({@code STATE_SIMULATED_RINGING}). The bar names both "ringing" and offers
     * Decline for them, so its end action rejects both rather than disconnecting one.
     */
    static boolean ringing(int state) {
        return state == Call.STATE_RINGING || state == Call.STATE_SIMULATED_RINGING;
    }

    /** A call nobody is named for: no name, and no number Telecom reports. */
    static final String UNKNOWN_CALLER = "Unknown caller";

    /** The chip that switches the screen to another call, for a screen reader. */
    static String chipDescription(String label) { return "Switch to call, " + label; }
}
