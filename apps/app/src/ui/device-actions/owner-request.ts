import { normalizePhoneNumber } from "@elizaos/contracts/native-telephony";
import type { DeviceContextEnvelope, ReviewableDeviceOperation } from "@elizaos/plugin-assistant/device-actions/client-coordinator";

/** Read the authored turn only. An agent's proposed body or arguments never supply missing consent. */
export function ownerCommand(text?: string): string {
  return (text ?? "").trim().replace(/^(?:(?:hey )?alpha[,\s]+)?(?:(?:could|can|would) you\s+)?(?:please\s+)?/i, "");
}

function unquote(text: string) {
  return text.trim().replace(/^(?:"([\s\S]*)"|“([\s\S]*)”)$/, (_match, straight, curly) => straight ?? curly);
}

function word(value: string) {
  return unquote(value).replace(/\.$/, "").toLowerCase();
}

/** A local editor navigation request. An app name alone or an unspecified note stays in chat. */
export function namedNoteOpenRequest(text: string): string | undefined {
  const request = ownerCommand(text).replace(/[.!?]+$/, "").trim();
  const command = request.replace(/^(?:(?:in|from) (?:the )?notes(?: app)?[, ]+|(?:go|switch) to (?:the )?notes(?: app)? and )/i, "");
  const named = /^(?:open|show)(?: me)? (?:the |my )?note (?:called|named|titled) (.+?)(?: in (?:the )?notes(?: app)?)?$/i.exec(command);
  const quoted = /^(?:open|show)(?: me)? ((?:the |my )?note )?(".+"|“.+”)( in (?:the )?notes(?: app)?)?$/i.exec(command);
  const quotedTitle = quoted && (request !== command || quoted[1] || quoted[3]) ? quoted[2] : undefined;
  const target = named?.[1] ?? quotedTitle;
  if (!target) return;
  const title = unquote(target).trim();
  if (title && !/[\r\n]/.test(title)) return title;
}

// Punctuation from dictation can separate the end of the instruction from its
// message. Accept familiar lead-ins and delimiters while keeping the body exact.
const smsBodySeparator = String.raw`(?::\s*|\s+(?:saying|that says|to say|and (?:just )?say|with (?:the )?message)(?:\s*[:,]\s*|\s+))`;
const explicitSms = new RegExp(
  String.raw`^(send|draft|write)\s+(?:(?:an?|this|the)\s+)?(?:text(?: message)?|sms|message)\s+to\s+(.+?)(?:${smsBodySeparator}([\s\S]+))?$`,
  "i",
);
const textSms = new RegExp(String.raw`^text\s+(.+?)${smsBodySeparator}([\s\S]+)$`, "i");

export function smsOwnerRequest(text: string) {
  const command = ownerCommand(text.trim().replace(/^(?:(?:thanks|thank you|okay|ok|sure|hmm+|um+|uh)[,.!]\s+)*/i, ""));
  const explicit = explicitSms.exec(command);
  const textCommand = textSms.exec(command);
  if (explicit) return {send: explicit[1].toLowerCase() === "send", recipient: word(explicit[2]), body: explicit[3] === undefined ? undefined : unquote(explicit[3])};
  if (textCommand) return {send: true, recipient: word(textCommand[1]), body: unquote(textCommand[2])};
}

export function samePhoneRecipient(requested: string, expected: string, numeric: boolean) {
  return numeric ? normalizePhoneNumber(requested) === expected : requested === word(expected);
}

export function emailOwnerRequest(text: string) {
  const command = ownerCommand(text);
  const send = /^send\s+(?:an?\s+)?(?:email|mail)\s+to\s+(.+?)\s+(?:with (?:the )?subject|subject|titled)\s+(.+?)(?:\s+and\s+(?:the\s+)?body\s+|\s+saying\s+|\s+with\s+(?:the\s+)?body\s+)\s*([\s\S]+)$/i.exec(command);
  if (send) return {recipient: word(send[1]), subject: unquote(send[2]), body: unquote(send[3])};
}

export function sendsSavedEmail(text:string) {
  return /^send (?:this|the|that) email[.!]?$/i.test(ownerCommand(text));
}

function reviewedWindow(command: string, fields: {title:string;description:string;location:string;start:string;end:string;timeZone:string}, zone?:string) {
  if (fields.description || fields.location) return false;
  const event = /^(?:create|add|schedule|update|reschedule)\s+(?:an?\s+|the\s+)?(?:calendar\s+)?event\s+(?:called\s+|titled\s+)?(.+?)\s+from\s+(\S+)\s+to\s+(\S+)\.?$/i.exec(command);
  if(event) return word(event[1]) === word(fields.title) &&
    explicitInstant(event[2], Date.parse(fields.start)) &&
    explicitInstant(event[3].replace(/\.$/, ""), Date.parse(fields.end));
  const local = /^(?:create|add|schedule|update|reschedule)\s+(?:an?\s+|the\s+)?(?:calendar\s+)?event\s+(?:called\s+|titled\s+)?(.+?)\s+(today|tomorrow)\s+from\s+(\d{1,2}(?::\d\d)?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d\d)?\s*(?:am|pm))\.?$/i.exec(command);
  return !!local&&zone===fields.timeZone&&word(local[1])===word(fields.title)&&
    localInstant(local[2],local[3],Date.parse(fields.start),zone)&&localInstant(local[2],local[4],Date.parse(fields.end),zone);
}

function explicitInstant(input:string, instant:number) {
  return /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:Z|[+-]\d\d:\d\d)$/i.test(input) &&
    Date.parse(input) === instant;
}

function localInstant(day:string, clock:string, instant:number, zone:string) {
  const time=/^(\d{1,2})(?::(\d\d))?\s*(am|pm)$/i.exec(clock);
  if(!time||!Number.isFinite(instant))return false;
  const hour=Number(time[1]),minute=Number(time[2]??0);
  if(hour<1||hour>12||minute>59)return false;
  try{
    const format=new Intl.DateTimeFormat('en-CA',{
      timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
    });
    const at=(value:number)=>Object.fromEntries(format.formatToParts(value).map(part=>[part.type,Number(part.value)]));
    const current=at(Date.now()),target=at(instant);
    const date=new Date(Date.UTC(current.year,current.month-1,current.day+(day.toLowerCase()==='tomorrow'?1:0)));
    const hour24=hour%12+(time[3].toLowerCase()==='pm'?12:0);
    const matches=(parts:ReturnType<typeof at>)=>parts.year===date.getUTCFullYear()&&parts.month===date.getUTCMonth()+1&&
      parts.day===date.getUTCDate()&&parts.hour===hour24&&parts.minute===minute;
    // A repeated wall clock hour does not name a unique instant.
    return matches(target)&&![-120,-60,-30,30,60,120].some(offset=>matches(at(instant+offset*60000)));
  }catch{return false;}
}

/** Only compare actions with all effect-driving fields in the owner's turn or bound selection. */
export function directOwnerAction(operation:ReviewableDeviceOperation, text:string, context:DeviceContextEnvelope):boolean {
  const command=ownerCommand(text);
  switch (operation.type) {
    case "files_trash":
    case "files_share": {
      const match = /^(delete|trash|share)\s+(?:the\s+)?file\s+(.+)$/i.exec(command);
      const action = match?.[1].toLowerCase();
      return !!match && operation.paths.length===1 &&
        (operation.type==="files_share" ? action==="share" : action!=="share") &&
        unquote(match[2])===operation.paths[0];
    }
    case "files_move": {
      const move=/^move\s+(?:the\s+)?file\s+(.+?)\s+to\s+(.+)$/i.exec(command);
      return !!move&&operation.paths.length===1&&unquote(move[1])===operation.paths[0]&&unquote(move[2])===operation.dest;
    }
    case "notes_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) note\.?$/i.test(command);
    case "notes_delete":
      return /^(?:delete|trash) (?:this|the open|the selected) note\.?$/i.test(command);
    case "calendar_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) (?:calendar )?event\.?$/i.test(command);
    case "calendar_delete":
      return /^(?:delete|cancel) (?:this|the open|the selected) (?:calendar )?event\.?$/i.test(command);
    case "calendar_update":
      return /^(?:update|reschedule)\b/i.test(command) && context.selectedObject?.id===operation.target.eventId && reviewedWindow(command,operation.fields,context.timeZone);
    case "calendar_create_local":
    case "calendar_create":
      return /^(?:create|add|schedule)\b/i.test(command) && reviewedWindow(command,operation.fields,context.timeZone);
    case "reminder_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) reminder\.?$/i.test(command);
    case "reminder_cancel":
      return /^(?:cancel|delete) (?:this|the open|the selected) reminder\.?$/i.test(command);
    case "reminder_complete":
      return /^(?:complete (?:this|the open|the selected) reminder|mark this reminder (?:done|complete))\.?$/i.test(command);
    case "reminder_create":
    case "reminder_update": {
      const next = /^(create|add|update|reschedule)\s+(?:a\s+|the\s+)?reminder\s+(?:called\s+|titled\s+)?(.+?)\s+at\s+(\S+)\.?$/i.exec(command);
      const local = /^(create|add|update|reschedule)\s+(?:a\s+|the\s+)?reminder\s+(?:called\s+|titled\s+)?(.+?)\s+(today|tomorrow)\s+at\s+(\d{1,2}(?::\d\d)?\s*(?:am|pm))\.?$/i.exec(command);
      const request=local??next;
      const schedule = operation.fields.schedule;
      return !!request && !!schedule && !operation.fields.body && !schedule.recurrence &&
        schedule.alertMinutes == null &&
        (/^(?:create|add)$/i.test(request[1]) ? operation.type==="reminder_create"
          : operation.type==="reminder_update" && context.selectedObject?.id===operation.target.reminderId) &&
        word(request[2])===word(operation.fields.title) && schedule.at===(schedule.dueAt??schedule.at) &&
        (local ? !!context.timeZone&&localInstant(local[3],local[4],schedule.at,context.timeZone)
          : !!next&&explicitInstant(next[3].replace(/\.$/, ""),schedule.at));
    }
    case "contact_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) contact\.?$/i.test(command);
    case "contact_delete": {
      const name=/^delete\s+(?:the\s+)?contact\s+(.+)$/i.exec(command);
      return !!name&&word(name[1])===word(operation.query);
    }
    case "messages_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) (?:text )?conversation\.?$/i.test(command);
    case "voicemail_read_selected":
      return /^(?:read|share) (?:this|the open|the selected) voicemail\.?$/i.test(command);
    case "voicemail_delete_selected":
      return /^delete (?:this|the open|the selected) voicemail\.?$/i.test(command);
    default:
      return false;
  }
}

export function callOwnerRecipient(text:string) {
  const match=/^call\s+(.+)$/i.exec(ownerCommand(text));
  return match ? word(match[1]) : undefined;
}

export function ownerActionFollowUp(card:{title:string;smsReview?:string},text:string) {
  if(card.smsReview){
    if(card.smsReview==='addressed-draft'||card.smsReview==='send')return smsOwnerRequest(text)?.body
      ? "I couldn’t verify that the text matched your request."
      : "What exactly should the text say, and who should get it?";
    return smsOwnerRequest(text)?.body
      ? "Which recipient did you mean? Give me their full contact name or phone number."
      : "Who should get the text, and what should it say?";
  }
  if(card.title==="Place call") return "Which number or exact contact should I call?";
  if(/calendar|event|reminder/i.test(card.title))
    return "Which event or reminder should I use? For a time change, give me the date, time and time zone.";
  if(/file|folder/i.test(card.title)) return "Which file or folder should I use? Give me its exact path.";
  if(/notes?|contact|voicemail|conversation/i.test(card.title))
    return "Open the exact item you mean and tell me what to do with it.";
  return "Tell me the exact action and what it should apply to.";
}
