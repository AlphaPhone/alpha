import {findMapsCardRegions,type MapsCardPlace,type MapsCardSpec} from '../ui/components/chat/message-maps-parser.ts';
import {guidanceDistance,guidanceDuration} from '../maps/guidance.ts';
import {browserDestinationMatches,directBrowserDestination} from '../../../../.eliza/client-features/packages/contracts/src/browser-request-grounding.ts';
import {systemNoticeText} from '../../../../.eliza/client-features/packages/core/src/types/system-notice.ts';
import type {BrowserControlOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/browser-contract.ts';
/** Display only. Stored messages, proposals and journal receipts are never rewritten. */
type Message = Record<string, any>;
/** Only the service-authored check-in suffix is presentation markup. */
export function checkinDisplayText(message: {role?:unknown;source?:unknown;text?:unknown}): string | undefined {
  if(message.role!=='assistant'||message.source!=='lifeops-checkin'||typeof message.text!=='string')return;
  const text=message.text;
  const block=/\n\[CHOICE:checkin-([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}) id=\1\]\r?\nAll good=All good\r?\ndetails \1=Show details\r?\nsnooze \1=Snooze\r?\n\[\/CHOICE\][ \t\r\n]*$/i.exec(text);
  if(!block)return;
  const prose=text.slice(0,block.index);
  // Quoted examples and ambiguous repeated blocks remain authored text.
  if(!prose.trim()||/^[ \t]*(?:```|~~~)|\[\/?CHOICE\b/gim.test(prose))return;
  return prose.trimEnd();
}
const REVIEW_TEXT = 'Review on phone';
const REVIEW_INSTRUCTION = 'Review this request on your phone before it can run.';
// A model's instruction to use a live approval control is advisory until this
// turn has an admitted review. Generic explanations such as "if you see an
// approval card..." do not imply there is a live control to use.
const PHONE_APPROVAL_COMMAND = /(?:^|[.!?]\s+)(?:just\s+)?(?:tap|press|click)\s+(?:the\s+)?["“]?(?:approve|confirm)\b(?:["”])?(?=\s|[.!?,]|$)/i;
export function isPhoneReviewInstruction(text: string): boolean {
  const reply=text.trim();
  return reply===REVIEW_TEXT||reply===REVIEW_INSTRUCTION||PHONE_APPROVAL_COMMAND.test(reply);
}
export function phoneReviewReply(text: string, hasReview: boolean): string {
  return !hasReview&&isPhoneReviewInstruction(text)?'I couldn’t open a review card for this request.':text;
}

const LEGACY_BROWSER_RECEIPT = 'Opened an approved HTTPS destination in a new browser tab. Page loading is not verified.';
// The planner settles before Alpha can present a tab from the turn's device receipt.
export const VIEW_OPEN_UNCONFIRMED = 'I couldn’t confirm that the requested screen opened.';
// Presentation only: preserve the journal while explaining uncertainty safely.
export function actionResultText(text: string): string {
  return text === 'The action could not reach a confirmed result.'
    || text === 'Action did not reach a confirmed result. Check action history before requesting it again.'
    ? 'I couldn’t confirm the result.' : text;
}
export function browserNavigationSummary(url: string): string {
  const destination = new URL(url);
  if (destination.protocol !== 'https:') throw Error('Expected an HTTPS destination');
  return `Created a browser tab for ${destination.host}.`;
}
/** The one-sentence completion of a reviewed Browser control: the owner reads it and the agent receives it. */
export function browserControlSummary(operation: BrowserControlOperation): string {
  switch (operation.type) {
    case 'browser_search': return `Searching the web for “${operation.query}”.`;
    case 'browser_tab_new': return operation.private ? 'Opened a private tab.' : 'Opened a new tab.';
    case 'browser_tab_switch': return 'Switched tabs in Browser.';
    case 'browser_tab_close': return 'Closed the tab.';
    case 'browser_find': return `Finding “${operation.text}” in the page.`;
    case 'browser_history': return {back: 'Went back a page.', forward: 'Went forward a page.', reload: 'Reloading the page.', stop: 'Stopped loading the page.'}[operation.action];
  }
}
function legacyBrowserNavigationSummary(url: string): string {
  return `Opened ${new URL(url).host}.`;
}
/** Update the description of an older tab creation while keeping any receipt status. */
function browserReceiptDisplayText(url: string, summary: string): string {
  const legacy = legacyBrowserNavigationSummary(url);
  if (summary === LEGACY_BROWSER_RECEIPT) return browserNavigationSummary(url);
  if (summary === legacy || summary.startsWith(legacy + ' ')) {
    return browserNavigationSummary(url) + summary.slice(legacy.length);
  }
  return summary;
}
function browserCardUrl(description: unknown): string | undefined {
  const prefix = 'Open browser destination ';
  if (typeof description !== 'string' || !description.startsWith(prefix)) return;
  const url = description.slice(prefix.length);
  try { if (new URL(url).protocol === 'https:') return url; } catch { /* Keep unrecognized content intact. */ }
}
/** The destination of a browser proposal whose receipt succeeded with exactly the Browser summary
 * (no pending server receipt or other note), else undefined. */
export function succeededBrowserDestination(card: {description: string} | null | undefined, receipt: {status: string; summary: string}): string | undefined {
  const url = browserCardUrl(card?.description);
  if (url && receipt.status === 'succeeded' &&
      (receipt.summary === browserNavigationSummary(url) || receipt.summary === legacyBrowserNavigationSummary(url))) return url;
}
function cardDestination(message: Message): string | undefined {
  if (message.from === 'agent' && message.card?.proposalId) return browserCardUrl(message.text);
}
export function projectActionMessages(rendered: Message[], source: Message[]): Message[] {
  const byId = new Map(source.map(message => [message.id, message]));
  const hidden = new Set<string>();
  const renderedIds = new Set(rendered.map(message => message.id));
  const completedResults = new Map<string, string>();
  for (const message of source) {
    if (renderedIds.has(message.id) && message.from === 'agent' && message.card?.proposalId && message.card.done && typeof message.card.sub === 'string' && message.card.sub.trim()) {
      completedResults.set(`device-receipt:${message.card.proposalId}`, message.card.sub);
    }
  }
  for (const message of source) {
    // A queued proposal may precede the request and its receipt may follow the reply. Collapse
    // only the same result already shown by that exact proposal in the current rendered history.
    if (message.from === 'agent' && message.deviceReceipt === true && !message.card && completedResults.has(message.id) && completedResults.get(message.id) === message.text) hidden.add(message.id);
  }
  let turn: Message[] = [];
  const finish = () => {
    const visibleActions = turn.filter(message => renderedIds.has(message.id) && message.from === 'agent'
      && (message.card?.proposalId || message.deviceReceipt || message.card?.deviceActionNotice === true));
    if (!visibleActions.length) return;
    // A pending proposal still needs its review instruction. A visible outcome supersedes it.
    const outcomeShown = visibleActions.some(message => message.deviceReceipt
      || message.card?.deviceActionNotice === true || message.card?.done === true);
    for (const message of turn) {
      if (message.from === 'agent' && (message.text === REVIEW_TEXT
        || (outcomeShown && message.text === REVIEW_INSTRUCTION))) hidden.add(message.id);
    }
    const failure=turn.find(message=>message.from==='agent'&&!message.card&&!message.deviceReceipt&&message.text===VIEW_OPEN_UNCONFIRMED);
    if(failure&&turn[0]?.from==='user'&&typeof turn[0].text==='string'){
      const destination=directBrowserDestination(turn[0].text,'Alpha');
      if(visibleActions.some(message=>message.deviceReceipt===true&&!message.card&&
        browserDestinationMatches({type:'browser_navigate',url:message.browserDestination},destination)))hidden.add(failure.id);
    }
    // A shown agent reply already answers a requested Browser open. Only a succeeded browser receipt
    // carries browserDestination; failures and other device receipts stay visible.
    if (!turn.some(message => renderedIds.has(message.id) && !hidden.has(message.id) && message.from === 'agent' && !message.deviceReceipt && !message.card && !message.interrupted && message.text !== REVIEW_TEXT && message.text !== REVIEW_INSTRUCTION && message.text !== VIEW_OPEN_UNCONFIRMED && typeof message.text === 'string' && message.text.trim())) return;
    for (const message of turn) if (message.from === 'agent' && message.deviceReceipt === true && !message.card && message.browserDestination) hidden.add(message.id);
  };
  for (const message of source) { if (message.from === 'user') { finish(); turn = []; } turn.push(message); } finish();
  return rendered.filter(message => !hidden.has(message.id)).map(message => {
    const stored = byId.get(message.id);
    if (!stored || stored.from !== 'agent') return message;
    const destination = cardDestination(stored);
    if (stored.card?.proposalId && stored.card.done) {
      const rawSummary = stored.card.sub;
      if (typeof rawSummary !== 'string' || !rawSummary.trim()) return message;
      // AC-26: a comms proposal card shows its own result ("Done · Completed · summary"); it is the
      // one completion, so its row shows no receipt line beside it.
      if (stored.card.type === 'proposal') return {...message, hasCalendarText:false};
      const summary = actionResultText(rawSummary);
      const displayText = destination && stored.card.title === 'Completed' ? browserReceiptDisplayText(destination, summary) : summary;
      return {...message, cGeneric:false, cDigest:false, displayText, hasCalendarText:true, deviceReceipt:true};
    }
    // A result reported by the phone itself is marked (`deviceReceipt`) so the chat can show it
    // apart from the assistant's own words.
    if (stored.deviceReceipt && stored.browserDestination && typeof stored.text === 'string') {
      try { return {...message, displayText:browserReceiptDisplayText(stored.browserDestination, stored.text), hasCalendarText:true, deviceReceipt:true}; } catch { return {...message, deviceReceipt:true}; }
    }
    if (stored.deviceReceipt === true && !stored.card) return {...message, displayText:actionResultText(stored.text), deviceReceipt:true};
    if (destination && message.cDigest && message.rows?.length) {
      return {...message,hasCalendarText:false,rows:message.rows.map((row:Message,index:number)=>index===0?{...row,who:new URL(destination).host,text:'Open'}:row)};
    }
    return message;
  });
}

/*
 * Upstream escalation notices in Alpha's chat.
 *
 * The agent's escalation service posts a system notice into client chat when the same error
 * repeats (`packages/agent/src/runtime/error-escalation.ts`), and re-posts it on every agent start
 * and retry, each as a new stored message (`client-chat-sender.ts`). Conversation history returns
 * those rows as ordinary assistant text, so the text equal to pinned `systemNoticeText()`
 * (`packages/core/src/types/system-notice.ts`) is the only marker a runtime-error row carries.
 *
 * At most the latest notice is shown, and only until an ordinary agent reply follows it. A
 * runtime-error notice uses Alpha's words, not the upstream host-operator copy ("Check the
 * connected host's diagnostics"): it says a reply may not arrive only when it arrived while the
 * owner's latest message was unanswered; otherwise it says calmly that part of the agent is down.
 */
export type SystemNoticeKind = 'model-unavailable' | 'runtime-error' | 'model-and-runtime-error';

/** Byte-equal to pinned upstream `systemNoticeText()` (test/system-notice-collapse.test.mjs). These
 * recognise stored notice rows only; they are never shown, since they name the shared runtime and
 * a host operator's step. */
export const UPSTREAM_MODEL_UNAVAILABLE_NOTICE = systemNoticeText('model-unavailable');
export const UPSTREAM_RUNTIME_ERROR_NOTICE = systemNoticeText('runtime-error');
const UPSTREAM_COMBINED_NOTICE = `${UPSTREAM_MODEL_UNAVAILABLE_NOTICE}\n---\n${UPSTREAM_RUNTIME_ERROR_NOTICE}`;

/** A model-unavailable notice in Alpha's words: the owner's own recovery step. */
export const MODEL_UNAVAILABLE_NOTICE = 'No AI provider · Open Settings';

/** A runtime-error notice that arrived while the owner's latest message was unanswered. */
export const RUNTIME_ERROR_NOTICE = 'Agent error · Send again';
/** A runtime-error notice that arrived with nothing waiting (a service failing at start, for example). */
export const RUNTIME_ERROR_BACKGROUND_NOTICE = 'Agent degraded';

/** The upstream notice a stored assistant text is, if any. */
export function systemNoticeKind(text: unknown): SystemNoticeKind | undefined {
  if (typeof text !== 'string') return undefined;
  const value = text.trim();
  return value === UPSTREAM_MODEL_UNAVAILABLE_NOTICE ? 'model-unavailable'
    : value === UPSTREAM_RUNTIME_ERROR_NOTICE ? 'runtime-error'
    : value === UPSTREAM_COMBINED_NOTICE ? 'model-and-runtime-error'
    : undefined;
}

/** The owner-facing text of a stored notice row, always in Alpha's words;
 * the combined form keeps both halves with one send-again step. `waiting`: it arrived while the
 * owner's message was unanswered. */
export function systemNoticeDisplayText(kind: SystemNoticeKind, waiting = false): string {
  return kind === 'runtime-error' ? (waiting ? RUNTIME_ERROR_NOTICE : RUNTIME_ERROR_BACKGROUND_NOTICE)
    : kind === 'model-and-runtime-error' ? `${MODEL_UNAVAILABLE_NOTICE}\n${RUNTIME_ERROR_BACKGROUND_NOTICE}`
    : MODEL_UNAVAILABLE_NOTICE;
}

type ChatRow = { from?: unknown; text?: unknown; systemNotice?: unknown; interrupted?: unknown; unfinished?: unknown; streaming?: unknown; card?: unknown; deviceReceipt?: unknown };

/** An agent row that proves the chat answered: a settled text reply, not a notice, a failed or
 * restored-unfinished reply, a stream still in progress, a client-made card (proposals) or a phone
 * action receipt, which records what the phone did, not that chat answered. */
function ordinaryReply(message: ChatRow): boolean {
  return message.from === 'agent' && !message.systemNotice && message.interrupted !== true && message.unfinished !== true
    && message.streaming !== true && !message.card && !message.deviceReceipt && typeof message.text === 'string' && message.text.trim() !== '';
}

/**
 * Collapse upstream notices: keep at most the latest one, drop it once an ordinary reply follows,
 * and word a runtime-error notice for whether it arrived while the owner's latest message was
 * unanswered. Returns the same array when nothing changes, so callers can skip a render.
 */
export function collapseSystemNotices<T extends ChatRow>(messages: T[]): T[] {
  let latest = -1, lastReply = -1, lastUser = -1;
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.systemNotice) latest = index;
    else if (ordinaryReply(message)) lastReply = index;
    else if (message.from === 'user') lastUser = index;
  }
  const keep = latest > lastReply ? latest : -1;
  let changed = false;
  const result: T[] = [];
  messages.forEach((message, index) => {
    if (!message.systemNotice) { result.push(message); return; }
    if (index !== keep) { changed = true; return; }
    const kind = message.systemNotice as SystemNoticeKind;
    const text = systemNoticeDisplayText(kind, lastUser > lastReply && keep > lastUser);
    if (message.text === text) { result.push(message); return; }
    changed = true; result.push({ ...message, text });
  });
  return changed ? result : messages;
}


/** Display-only projection of an agent Maps card. Links are shown as text, never opened. */
export type MapsChatCard={kind:MapsCardSpec['kind'];title:string;lines:string[];attribution:string;mapQuery?:string;
 /** Maps reads the phone's position itself, after the user's tap, and searches around it. Chat never receives it. */
 nearMe?:boolean;
 /** Maps plans directions from the phone's own position, after the user's tap: to `place`, to the closest
  * match of a `nearMe` search, or (an older agent's card, which names no place) to the first match of `mapQuery`. */
 directionsFromHere?:boolean;
 /** The exact place the agent resolved. Maps selects it by its provider id and coordinates, under its own name. */
 place?:MapsCardPlace;
 /** How to travel on a `directionsFromHere` card, when the request named it. */
 travelMode?:MapsCardRoute['travelMode'];
 /** A planned route for Maps to draw: both ends as `latitude, longitude`, and how to travel. */
 route?:{origin:string;destination:string;name:string;travelMode:MapsCardRoute['travelMode']}};
type MapsCardRoute=Extract<MapsCardSpec,{kind:'route'}>;
/** The plugin-maps share gate: exactly two bounded answers that are sent back verbatim. */
export type MapsShareChoice={id:string;options:{label:string;value:string}[]};

const MODES:Record<string,string>={drive:'Driving',walk:'Walking',bicycle:'Cycling',transit:'Transit'};
const placeLine=(place:MapsCardPlace)=>place.formattedAddress?`${place.name}, ${place.formattedAddress}`:place.name;
// Alpha's agent context carries no device position, so the locate card cannot be answered here.
const LOCATE_LINE='Name a start · Location not shared';
// Maps can serve a location request on the phone. plugin-maps names the search or the destination in the card's
// own fields; an older agent names it only in the prompt, which these read.
const NEAR_PROMPT=/^I need your precise location to search near you for “([^”]{1,300})”\.$/;
const ROUTE_PROMPT=/^I need your precise location to start the route to (.{1,300})\.$/;
const point=(place:MapsCardPlace)=>`${place.latitude}, ${place.longitude}`;

function present(card:MapsCardSpec):MapsChatCard{
 switch(card.kind){
  case 'place':return {kind:card.kind,title:card.place.name,lines:card.place.formattedAddress?[card.place.formattedAddress]:[],attribution:card.attribution||'',place:card.place};
  case 'places':return {kind:card.kind,title:`Places for “${card.query}”`,lines:card.places.map(placeLine),attribution:card.attribution||'',mapQuery:card.query};
  case 'route':return {kind:card.kind,title:`Route to ${card.destination.name}`,lines:[`From ${card.origin.name}`,`${MODES[card.travelMode]} · ${guidanceDistance(card.distanceMeters)} · ${guidanceDuration(card.durationSeconds)}`,...card.warnings],attribution:card.attribution||'',mapQuery:point(card.destination),
   route:{origin:point(card.origin),destination:point(card.destination),name:card.destination.name,travelMode:card.travelMode}};
  case 'handoff':return {kind:card.kind,title:card.handoffKind==='share'?`Location link for ${card.place.name}`:`Directions to ${card.place.name}`,lines:[...(card.place.formattedAddress?[card.place.formattedAddress]:[]),card.webUri],attribution:'',place:card.place};
  case 'locate':{
   const mode=card.travelMode?{travelMode:card.travelMode}:{};
   if(card.intent==='place-near'){
    const near=card.query??NEAR_PROMPT.exec(card.prompt)?.[1];
    if(near)return {kind:card.kind,title:`“${near}” near you`,lines:['Map searches around this phone · Location not shared with chat'],attribution:'',mapQuery:near,nearMe:true};
   }else if(card.destination)return {kind:card.kind,title:`Directions to ${card.destination.name}`,lines:['Map plans the route from this phone · Location not shared with chat'],attribution:'',place:card.destination,directionsFromHere:true,...mode};
   // A kind of place, not one place: Maps finds the closest around the phone, then plans the route to it.
   else if(card.query)return {kind:card.kind,title:`Directions to ${card.query}`,lines:['Map finds the closest around this phone · Location not shared with chat'],attribution:'',mapQuery:card.query,nearMe:true,directionsFromHere:true,...mode};
   else{
    const to=ROUTE_PROMPT.exec(card.prompt)?.[1];
    if(to)return {kind:card.kind,title:`Directions to ${to}`,lines:['Map plans the route from this phone · Location not shared with chat'],attribution:'',mapQuery:to,directionsFromHere:true};
   }
   return {kind:card.kind,title:'Location needed',lines:[card.intent==='place-near'?'Pick an area in Maps · Location not shared':LOCATE_LINE],attribution:''};
  }
 }
}

const SHARE_CHOICE=/\[CHOICE:maps-share id=(maps-share-[^\]\s]{1,200})\]\r?\n([\s\S]*?)\r?\n\[\/CHOICE\]/g;
function shareChoice(id:string,body:string):MapsShareChoice|null{
 const options=body.split(/\r?\n/).map(line=>{const at=line.lastIndexOf('=');return at>0?{value:line.slice(0,at).trim(),label:line.slice(at+1).trim()}:{value:'',label:''};});
 if(options.length!==2||options.some(o=>!o.value||!o.label||o.value.length>500||o.label.length>80))return null;
 return {id,options};
}

// Alpha has no form surface. The question the form asks is already in the prose before it
// (plugin-maps missingInput), so a complete form block is dropped and nothing is lost.
const FORM=/\[FORM\]\r?\n(\{[^\r\n]*\})\r?\n\[\/FORM\]/g;
function formBlock(json:string){
 try{const body=JSON.parse(json);return !!body&&typeof body==='object'&&typeof body.id==='string'&&Array.isArray(body.fields);}catch{return false;}
}

/** Replace valid Maps markup with presentation metadata. Malformed markup stays literal text. */
export function mapsChatText(text:string){
 const cards:MapsChatCard[]=[];let choice:MapsShareChoice|null=null,rendered=text;
 const regions=findMapsCardRegions(text);
 for(const region of [...regions].reverse()){cards.unshift(present(region.card));rendered=rendered.slice(0,region.start)+rendered.slice(region.end);}
 rendered=rendered.replace(SHARE_CHOICE,(whole,id,body)=>{
  // The question itself stays in the surrounding prose; only its answers become buttons.
  const parsed=choice?null:shareChoice(id,body);if(!parsed)return whole;choice=parsed;return '';
 });
 let forms=false;
 rendered=rendered.replace(FORM,(whole,json)=>formBlock(json)?(forms=true,''):whole);
 // Ordinary messages keep their exact text, including indentation and trailing paragraphs.
 const displayText=cards.length||choice||forms?rendered.replace(/\n{3,}/g,'\n\n').trim():rendered;
 return {displayText,cards,choice:choice as MapsShareChoice|null};
}

/** A chat-started workflow run replies with a [WORKFLOW] block (plugin-workflow's WORKFLOW run
 * action) that upstream's UI renders and Alpha does not import. Only a block whose tags sit on
 * their own lines counts, so prose that mentions the tag stays as written. A block with valid
 * JSON naming string runId and workflowId becomes a run card; a malformed or unterminated block
 * is removed and never shown or spoken raw. */
export type WorkflowRunCard={workflowId:string;runId:string;title:string};
// String.replace resets a global pattern's lastIndex, so one shared pattern is safe. The body is
// tried empty first, so an empty block ends at its own closing tag, not at the end of the reply.
const blockPattern=/(^|\n)[ \t]*\[WORKFLOW\][ \t]*(?:\r?\n([\s\S]*?))??(?:\r?\n[ \t]*(\[\/WORKFLOW\])[ \t]*(?=\r?\n|$)|$)/g;
const runCard=(body:string):WorkflowRunCard|null=>{
 let value:unknown;try{value=JSON.parse(body);}catch{return null;}
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {runId,workflowId,title}=value as Record<string,unknown>;
 if(typeof runId!=='string'||!runId.trim()||typeof workflowId!=='string'||!workflowId.trim())return null;
 return {workflowId,runId,title:typeof title==='string'&&title.trim()?title.trim():'Workflow run'};
};
export function workflowReplyText(text:string){
 const runs:WorkflowRunCard[]=[];let removed=false;
 const rendered=text.replace(blockPattern,(_whole,lead:string,body:string|undefined,closed:string|undefined)=>{
  removed=true;const card=closed&&body!==undefined?runCard(body):null;
  if(card&&!runs.some(run=>run.runId===card.runId&&run.workflowId===card.workflowId))runs.push(card);
  return lead;
 });
 // Ordinary messages keep their exact text, including indentation and trailing paragraphs.
 return {text:removed?rendered.replace(/\n{3,}/g,'\n\n').trim():rendered,runs};
}

// The owner can ask for technical details, a literal address, or the wording of an email.
const literalSpeech = /\b(?:verbatim|word for word|as written|read it (?:back|aloud)|spell it out|repeat (?:it|that) exactly)\b/i;
const asksForField = /\b(?:read(?: back)?|spell(?: out)?|quote|repeat|recite|give me|tell me|what(?:[’']s| is| are))\s+(?:(?:me|out|aloud|the|this|that|my|its|full|exact|whole|entire|last|four)\s+){0,7}(?:(?:event|request|operation|workflow|run|order|thread|record|confirmation|reference)\s+(?:ID|identifier|number)|receipt|identifier|ID|address|number|digits|code|subject|headers?|body|draft|e-?mail|message|text)\b/i;
// Managed Gmail can prefix the recipient with its connector or account. Model-written
// email copy typically has just the To and Subject lines, sometimes with bold labels.
const mailHeaders = /^(?:[ \t]*(?:\*\*)?From:(?:\*\*)?[^\n]*\r?\n)?[ \t]*(?:\[gmail(?: account [^\]\n]+)?\][ \t]*)?(?:\*\*)?To:(?:\*\*)?[^\n]*\r?\n(?:[ \t]*(?:Cc|Bcc):[^\n]*\r?\n)*[ \t]*(?:\*\*)?Subject:(?:\*\*)?[^\n]*/im;
const introToDraft = /^(?:(?:Got it|Sure|Okay)[.!,:]?\s*)?(?:(?:Here(?:’s|'s| is) (?:the|your|a) (?:email|draft|suggested wording)(?: draft)?|Drafted gmail message to [^\n]+)[.:!]?\s*)?$/i;
const receiptKey = String.raw`(?:(?:request|proposal|receipt|operation|message|event|draft|run|workflow|record|conversation|thread|external|resource)\s+(?:id|identifier)|uuid|id)`;
const opaqueValue = "[`\"']?[a-z0-9_-](?:[a-z0-9_.:-]*[a-z0-9_-])?[`\"']?";
const receiptField = new RegExp(String.raw`(^|\n|[.!?][ \t]+)[ \t]*${receiptKey}\s*[:=#]\s*${opaqueValue}(?:[.;](?=\s|$)|(?=[ \t]*\r?$))[ \t]*`, 'gim');
const receiptAside = new RegExp(String.raw`[ \t]*\([ \t]*${receiptKey}\s*[:=#]\s*${opaqueValue}[ \t]*\)`, 'gi');

/** Presentation for conversation speech. Never mutate the written reply or the action results. */
export function spokenActionReply(request: string, reply: {
  text: string; actionResults?: readonly unknown[]; completedActions?: readonly unknown[];
}, emailCardReady = false): string {
  const text = reply.text;
  if (literalSpeech.test(request) || asksForField.test(request)) return text;
  const results = reply.actionResults ?? [];
  const asksForMail = /\b(?:draft|compose|write|send|reply)\b/i.test(request) && /\b(?:e-?mail|gmail|inbox)\b/i.test(request);
  const envelope = mailHeaders.exec(text);
  if (emailCardReady || (envelope && asksForMail)) {
    const lead = envelope ? text.slice(0,envelope.index).trim() : '';
    const rest = envelope ? text.slice(envelope.index+envelope[0].length).trim() : text;
    const hasMoreWork = /\b(?:and|then|also)\s+(?:check|look up|find|open|create|schedule|book|summarize|tell me|show me)\b/i.test(request);
    const hasLimitation = /\b(?:(?:failed|unable|couldn[’']t|can[’']t|cannot|could not) (?:to )?(?:send|save|prepare|create|deliver|schedule|open|verify|confirm)|not (?:sent|saved|created|scheduled))\b/i.test(rest);
    if (rest && !hasMoreWork && introToDraft.test(lead) && !hasLimitation &&
        results.length <= 1 && !reply.completedActions?.length) {
      const result = results[0] as {success?: unknown; actionName?: unknown; error?: unknown} | null;
      if (result?.success === false || result?.error) {
        if (typeof result.actionName === 'string' && /^MESSAGE(?:_|$)/.test(result.actionName)) {
          return 'The email action failed. The suggested wording is in the chat.';
        }
        return envelope ? (lead+'\n\n'+rest).trim() : text;
      }
      // Only the owner's validated local card can confirm that an editable draft is ready.
      return emailCardReady ? 'Your email draft is ready to review.' : 'The suggested email is in the chat.';
    }
    // A compound reply or a refusal can carry additional information after the preview.
    if (envelope) return (lead+'\n\n'+rest).trim();
  }
  if (!results.length && !reply.completedActions?.length) return text;
  // Only delimited ID fields from action turns. Dates, times, counts, amounts and
  // numbers in the actual answer remain available to the synthesizer.
  const spoken = text.replace(receiptAside,'').replace(receiptField,'$1');
  return spoken === text ? text : spoken.replace(/\n{3,}/g,'\n\n').trim() || 'The details are in the chat.';
}
