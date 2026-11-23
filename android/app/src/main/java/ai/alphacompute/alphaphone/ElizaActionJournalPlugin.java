package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.actionjournal.ActionJournalPlugin;
import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionCoordinator;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The shared action journal under its upstream name (@elizaos/os bridges/action-journal), which
 * the phone, messages and contacts clients and the deletion window call: reviewed sends and the
 * Undo window over Alpha's one encrypted journal instance and deletion coordinator, the same ones
 * {@link AlphaActionJournalPlugin} serves, so one monitor serializes every transition.
 */
@CapacitorPlugin(name="ElizaActionJournal")
public final class ElizaActionJournalPlugin extends ActionJournalPlugin {
 @Override protected ActionJournal createJournal(){return AlphaActionJournal.get(getContext());}
 @Override protected DeferredDeletionCoordinator deletions()throws Exception{return NativeDeletionCoordinator.get(getContext());}
}
