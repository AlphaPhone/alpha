package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * An agent-proposed text is confirmed by the owner's Approve on its card in the chat; no further
 * dialog follows. Before {@link AlphaTelephonyBase#sendSms} dispatches one, this binds the request to
 * that card's entry in the encrypted action journal ({@link AlphaActionJournal}) the chat records
 * every approval in, so the page cannot send any other text through this path:
 *
 * <ul>
 *   <li>the entry named by the request's {@code journalIdentity} is {@code applying} (approved and
 *       claimed), unexpired, recorded on a screen that was not sensitive, and journaled under this
 *       operation ID;</li>
 *   <li>its operation names exactly these recipients and this text: an {@code sms_send} also this
 *       SIM (and its proposal ID is the operation ID); an {@code sms_compose} to a number that exact
 *       number; an {@code sms_compose} to a contact only a number that belongs to a contact, since the
 *       owner picked that contact on the card;</li>
 *   <li>the device reserves the operation ID for this entry before marking it with {@link #CLAIM}.
 *       A lost journal acknowledgement cannot give a second chat the same operation ID.</li>
 * </ul>
 *
 * A repeated request for the same operation ID is answered from the SMS send journal before this
 * runs and never sends again. A draft-only {@code sms_compose} and every other operation are refused.
 */
final class AlphaApprovedSms {
 /** The one-time native admission of an approved text. It never changes once written. */
 static final String CLAIM = "smsDispatchClaim";
 interface OperationClaim {
  boolean reserve(String operationId, String binding) throws Exception;
 }
 private static final Pattern DIALABLE = Pattern.compile("^\\+?[\\d\\s().-]{2,40}$"), DIGITS = Pattern.compile("^\\+?\\d{2,20}$");

 private AlphaApprovedSms() {}

 /** Admits one dispatch of exactly this text for the approved card {@code identity}, or refuses without dispatch. */
 static void claim(ActionJournal journal, OperationClaim deviceClaim, JSONObject identity, String operationId, String[] recipients, String body, int subscriptionId,
   Predicate<String> contactNumber, long now) throws Exception {
  claim(journal, null, deviceClaim, identity, operationId, recipients, body, subscriptionId, contactNumber, now);
 }

 /** Admits one dispatch against either the device-execution journal ({@code {proposalId}}) or the legacy action journal ({@code {scope, proposalId}}). */
 static void claim(ActionJournal journal, DeviceExecutionJournal deviceJournal, OperationClaim deviceClaim, JSONObject identity, String operationId, String[] recipients, String body, int subscriptionId,
   Predicate<String> contactNumber, long now) throws Exception {
  if (identity == null) throw new SecurityException("No approved card names this text");
  if (identity.length() == 1 && identity.has("proposalId")) {
   if (deviceJournal == null) throw new SecurityException("No device execution journal");
   String proposal = DeviceExecutionJournal.proposalId(identity.optString("proposalId", null));
   JSONObject operation = openDevice(deviceJournal.get(proposal), operationId);
   // The contact lookup is a provider read, so it runs before the journal lock; the record it checks never changes.
   if (!approves(operation, proposal, operationId, recipients, body, subscriptionId, contactNumber))
    throw new SecurityException("The approved card names another text");
   synchronized (DeviceExecutionJournal.lock()) {
    JSONObject entry = deviceJournal.get(proposal);
    openDevice(entry, operationId);
    JSONObject binding = new JSONObject().put("proposalId", proposal)
     .put("operationHash", DeviceExecutionJournal.operationHash(entry));
    if (!deviceClaim.reserve(operationId, binding.toString())) throw new SecurityException("This operation was already claimed");
   }
   return;
  }
  if (identity.length() != 2 || journal == null) throw new SecurityException("No approved card names this text");
  String scope = ActionJournal.scope(identity.optString("scope", null)), proposal = ActionJournal.id(identity.optString("proposalId", null));
  // The contact lookup is a provider read, so it runs before the journal lock; the record it checks never changes.
  if (!approves(open(journal.get(scope, proposal), operationId, now), proposal, operationId, recipients, body, subscriptionId, contactNumber))
   throw new SecurityException("The approved card names another text");
  synchronized (journal.lock()) {
   JSONObject entry = journal.get(scope, proposal);
   open(entry, operationId, now);
   JSONObject binding = new JSONObject().put("scope", scope).put("proposalId", proposal)
    .put("operationHash", entry.getString("operationHash"));
   if (!deviceClaim.reserve(operationId, binding.toString())) throw new SecurityException("This operation was already claimed");
   journal.update(scope, proposal, current -> current.put(CLAIM, new JSONObject().put("operationId", operationId)));
  }
 }

 /** The approved operation of a device-execution entry that may still admit this send. */
 private static JSONObject openDevice(JSONObject entry, String operationId) throws Exception {
  if (entry == null || !operationId.equals(entry.optString("operationId")) || entry.optBoolean("acknowledged", false))
   throw new SecurityException("The approval is not open for this send");
  DeviceExecutionJournal.Attempt attempt = DeviceExecutionJournal.attemptOf(entry);
  if (!Set.of("Applying", "Called").contains(attempt.phase) || attempt.attemptId <= 0 || attempt.retired)
   throw new SecurityException("The approval is not active");
  for (String field : new String[]{"ownerId", "agentId", "origin", "installationId", "enrollmentId"})
   if (entry.optString(field).isEmpty()) throw new SecurityException("The approval binding is incomplete");
  return new JSONObject(entry.getString("operation"));
 }

 /** The approved operation of an entry that may still admit this send. */
 private static JSONObject open(JSONObject entry, String operationId, long now) throws Exception {
  if (entry == null || !"applying".equals(entry.optString("phase")) || !operationId.equals(entry.optString("operationId")) || entry.has(CLAIM))
   throw new SecurityException("The approval is not open for this send");
  JSONObject record = entry.getJSONObject("record"), context = record.optJSONObject("context");
  if (record.getLong("expiresAt") <= now || context == null || context.optBoolean("sensitive", false))
   throw new SecurityException("The approval expired");
  return record.getJSONObject("operation");
 }

 static boolean approves(JSONObject operation, String proposal, String operationId, String[] recipients, String body, int subscriptionId,
   Predicate<String> contactNumber) throws Exception {
  switch (operation.optString("type")) {
   case "sms_send": {
    if (!proposal.equals(operationId)) return false;
    JSONArray numbers = new JSONArray();
    for (String number : recipients) numbers.put(number);
    return ActionJournal.sameJson(operation, new JSONObject().put("type", "sms_send").put("recipients", numbers).put("body", body).put("subscriptionId", subscriptionId));
   }
   case "sms_compose": {
    if (operation.length() != 3 || recipients.length != 1 || !body.equals(operation.opt("body"))) return false;
    JSONObject target = operation.optJSONObject("target");
    if (target == null) return operation.opt("query") instanceof String && contactNumber.test(recipients[0]);
    if ("number".equals(target.optString("kind"))) return recipients[0].equals(normalized(target.opt("number")));
    return "contact".equals(target.optString("kind")) && contactNumber.test(recipients[0]);
   }
   default: return false;
  }
 }

 /** The renderer's dialable form of a number ({@code normalizePhoneNumber} in the shared telephony contract), or null. */
 static String normalized(Object value) {
  if (!(value instanceof String)) return null;
  String trimmed = ((String) value).trim();
  if (!DIALABLE.matcher(trimmed).matches()) return null;
  String digits = trimmed.replaceAll("[\\s().-]", "");
  return DIGITS.matcher(digits).matches() ? digits : null;
 }
}
