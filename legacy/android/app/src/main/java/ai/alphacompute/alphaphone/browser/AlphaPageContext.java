package ai.alphacompute.alphaphone.browser;

import java.net.URI;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The open Browser page for a chat turn (Settings, Privacy, Browser page for Alpha). Alpha runs
 * {@link #SCRIPT} only in the selected tab's isolated JavaScript world (the shared
 * BrowserReadingWorld), never in the page's own world, and only for a non-private tab with a
 * committed HTTPS page whose address the shared sensitive-address policy did not refuse.
 *
 * <p>The script reads visible text of the page's main content as lines (headings and list items
 * marked), the owner's selection and up to {@link #LINKS_MAX} visible links, headline-like links
 * first and never a link to an action endpoint such as hide or vote. It reads no field
 * values, cookies, storage, editable regions or frame documents. A visible password, one-time-code
 * or card field, or credential-looking text, withholds the page: only its address and title go to
 * the agent. Six-to-eight digit runs are replaced with "[number]". Text over {@link #TEXT_MAX}
 * characters keeps its head and tail, and the part on screen when the owner has scrolled past the
 * head, with "[...]" marking each cut. The walk stops after 400 ms. The agent treats everything here
 * as untrusted web content; {@link #accept} only bounds its shape.
 */
public final class AlphaPageContext {
 private AlphaPageContext() {}
 public static final int TEXT_MAX = 6000, SELECTION_MAX = 1000, LINKS_MAX = 20, LINK_TEXT_MAX = 120, URL_MAX = 2048, TITLE_MAX = 300;
 public static final String SENSITIVE_PAGE = "sensitive-page", UNREADABLE = "unreadable";
 private static final Set<String> KEYS = Set.of("text", "truncated", "selection", "links", "withheld");

 /** The address the agent may see: HTTPS without credentials or fragment, or null. */
 public static String address(String value) {
  try {
   if (value == null || value.length() > 8192) return null;
   URI uri = new URI(value);
   if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null) return null;
   String result = new URI(uri.getScheme().toLowerCase(Locale.ROOT), uri.getRawAuthority(), uri.getRawPath(), null, null).toString();
   if (uri.getRawQuery() != null) result = result + "?" + uri.getRawQuery();
   return result.length() <= URL_MAX ? result : null;
  } catch (Exception error) {
   return null;
  }
 }

 /** The address without its query, for a page whose text is withheld. */
 public static String origin(String value) {
  try {
   String safe = address(value);
   if (safe == null) return null;
   URI uri = new URI(safe);
   return new URI(uri.getScheme(), uri.getRawAuthority(), uri.getRawPath(), null, null).toString();
  } catch (Exception error) {
   return null;
  }
 }

 /** A page title as one bounded line. */
 public static String title(String value) {
  String line = value == null ? "" : value.replaceAll("[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]", " ").replaceAll("\\s+", " ").trim();
  if (line.length() > TITLE_MAX) line = line.substring(0, TITLE_MAX);
  if (!line.isEmpty() && Character.isHighSurrogate(line.charAt(line.length() - 1))) line = line.substring(0, line.length() - 1);
  return line;
 }

 /**
  * The script's result reduced to the fields the renderer sends, or null when it is not the
  * shape the script returns. Content limits are the shared contract's; it validates again.
  */
 public static JSONObject accept(Object decoded) {
  try {
   if (!(decoded instanceof JSONObject)) return null;
   JSONObject result = (JSONObject) decoded;
   for (Iterator<String> keys = result.keys(); keys.hasNext(); ) if (!KEYS.contains(keys.next())) return null;
   if (result.has("withheld")) {
    String reason = result.optString("withheld", "");
    if (result.length() != 1 || !(SENSITIVE_PAGE.equals(reason) || UNREADABLE.equals(reason))) return null;
    return new JSONObject().put("withheld", reason);
   }
   Object text = result.opt("text"), truncated = result.opt("truncated");
   if (!(text instanceof String) || ((String) text).length() > TEXT_MAX || !(truncated instanceof Boolean)) return null;
   JSONObject out = new JSONObject().put("text", text).put("truncated", truncated);
   if (result.has("selection")) {
    Object selection = result.get("selection");
    if (!(selection instanceof String) || ((String) selection).isEmpty() || ((String) selection).length() > SELECTION_MAX) return null;
    out.put("selection", selection);
   }
   if (result.has("links")) {
    Object value = result.get("links");
    if (!(value instanceof JSONArray) || ((JSONArray) value).length() > LINKS_MAX) return null;
    JSONArray links = (JSONArray) value, kept = new JSONArray();
    for (int i = 0; i < links.length(); i++) {
     Object entry = links.get(i);
     if (!(entry instanceof JSONObject) || ((JSONObject) entry).length() != 2) return null;
     Object words = ((JSONObject) entry).opt("text"), url = ((JSONObject) entry).opt("url");
     if (!(words instanceof String) || ((String) words).isBlank() || ((String) words).length() > LINK_TEXT_MAX || !(url instanceof String)) return null;
     String safe = address((String) url);
     if (safe == null || !safe.equals(url)) return null;
     kept.put(new JSONObject().put("text", words).put("url", safe));
    }
    if (kept.length() > 0) out.put("links", kept);
   }
   return out;
  } catch (Exception error) {
   return null;
  }
 }

 /** The page-context script. Its JavaScript source is test/browser/page-context fixtures' subject. */
 public static final String SCRIPT = """
    (()=>{
    const deadline=performance.now()+400,late=()=>performance.now()>deadline;
    const TEXT_MAX=6000,LINKS_MAX=20,LINK_TEXT_MAX=120,SELECTION_MAX=1000,NODE_MAX=40000,RAW_MAX=120000,CUT='\\n[...]\\n';
    if(!['text/html','application/xhtml+xml','text/plain'].includes(document.contentType))return {withheld:'unreadable'};
    const clean=v=>String(v||'').normalize('NFKC').replace(/[\\u200B-\\u200D\\u2060\\uFEFF\\u00AD]/g,'').replace(/[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f\\u2028\\u2029]/g,' ');
    const line=v=>clean(v).replace(/\\s+/g,' ').trim();
    const whole=v=>v.replace(/^[\\uDC00-\\uDFFF]/,'').replace(/[\\uD800-\\uDBFF]$/,'');
    const shown=e=>{
     if(e.checkVisibility&&!e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;
     const s=getComputedStyle(e);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)===0||s.contentVisibility==='hidden')return false;
     if(s.display==='contents')return true;
     if(s.clipPath!=='none'&&/inset\\(\\s*50%|circle\\(\\s*0/.test(s.clipPath))return false;
     return Array.from(e.getClientRects()).some(r=>r.width>1&&r.height>1);
    };
    // A visible password, one-time-code or card field anywhere withholds the page. Values are never read.
    const field=/(?:^|[^a-z0-9])(?:otp|totp|mfa|2fa|cvc|cvv|csc)(?:$|[^a-z0-9])|password|passcode|one[\\s_-]*time|verification[\\s_-]*code|security[\\s_-]*code|auth(?:entication)?[\\s_-]*code|cc-(?:number|csc|exp)|card[\\s_-]*number/i;
    let inputs=0;
    for(const input of document.querySelectorAll('input')){
     if(++inputs>2000||late())return {withheld:'sensitive-page'};
     const type=(input.getAttribute('type')||'text').toLowerCase();if(type==='hidden')continue;
     const labels=['autocomplete','id','name','aria-label','placeholder'].map(a=>clean(input.getAttribute(a))).join(' ');
     if((type==='password'||field.test(labels))&&shown(input))return {withheld:'sensitive-page'};
    }
    // Credential values shown as page text withhold it too.
    const secret=/(?:api[\\s_-]*key|access[\\s_-]*token|refresh[\\s_-]*token|bearer[\\s_-]*token|client[\\s_-]*secret|secret[\\s_-]*key|private[\\s_-]*key|seed[\\s_-]*phrase|recovery[\\s_-]*(?:code|key|phrase)s?|backup[\\s_-]*codes?|one[\\s-]*time[\\s-]*(?:password|code)|verification[\\s-]*code|security[\\s-]*code|password|passcode)\\s*(?:is\\s*)?[:=]\\s*\\S|-----BEGIN [A-Z ]*PRIVATE KEY-----|\\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{12,}|\\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}|\\bxox[abprs]-[A-Za-z0-9-]{10,}|\\bAKIA[0-9A-Z]{16}\\b|\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\./i;
    const redact=v=>v.replace(/(?<![\\d.,:/-])\\d{6,8}(?![\\d.,:/-])/g,'[number]');
    const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG','CANVAS','IFRAME','FRAME','OBJECT','EMBED','INPUT','TEXTAREA','SELECT','OPTION','BUTTON','NAV','FOOTER','ASIDE','DIALOG','FORM','MAP','AUDIO','VIDEO']);
    const block=new Set(['P','DIV','LI','UL','OL','DL','DT','DD','H1','H2','H3','H4','H5','H6','TR','TABLE','SECTION','ARTICLE','HEADER','MAIN','BLOCKQUOTE','PRE','FIGURE','FIGCAPTION','BR','HR','ADDRESS','DETAILS','SUMMARY']);
    // Rendered order: an open shadow root's tree, and a slot's assigned nodes.
    const kids=n=>n.shadowRoot?n.shadowRoot.childNodes:n.tagName==='SLOT'&&n.assignedNodes().length?n.assignedNodes():n.childNodes;
    // Cheap per-element visibility for the walk: hidden, transparent, or collapsed to nothing.
    const rendered=e=>{
     if(!e.checkVisibility)return shown(e);
     // No box of its own (a slot, display: contents): its children are checked one by one.
     if(!e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return e.tagName==='SLOT'||getComputedStyle(e).display==='contents';
     // A box collapsed to nothing hides its text unless that text overflows visibly.
     if(e.offsetWidth<=1&&e.offsetHeight<=1&&e.getClientRects().length<2){const s=getComputedStyle(e);return s.display==='contents'||s.overflow==='visible';}
     return true;
    };
    const excluded=e=>skip.has(e.tagName.toUpperCase())||e.hidden||e.getAttribute('aria-hidden')==='true'||e.isContentEditable||/^(?:navigation|textbox|searchbox|dialog|alertdialog|banner|contentinfo|complementary|menu|menubar)$/.test(e.getAttribute('role')||'');
    // The main content: one main region, else one article, else the body.
    const regions=[...document.querySelectorAll('main,[role="main"]')].filter(shown);
    let root=regions.length===1?regions[0]:document.body;
    const articles=[...root.querySelectorAll('article')].filter(shown);
    if(articles.length===1&&(articles[0].textContent||'').length>600)root=articles[0];
    if(!root)return {withheld:'unreadable'};
    const scrolled=scrollY>8,height=innerHeight;
    let out='',nodes=0,truncated=false,anchor;
    const push=v=>{out+=v;if(out.length>RAW_MAX){truncated=true;return false;}return true;};
    const walk=n=>{
     if(++nodes>NODE_MAX||((nodes&255)===0&&late())){truncated=true;return false;}
     if(n.nodeType===3)return push(n.nodeValue||'');
     if(n.nodeType!==1)return true;
     if(excluded(n)||!rendered(n))return true;
     const tag=n.tagName.toUpperCase(),isBlock=block.has(tag);
     if(isBlock){
      if(scrolled&&anchor===undefined&&tag!=='DIV'){const r=n.getBoundingClientRect();if(r.bottom>0&&r.top<height&&r.top>-height/2)anchor=out.length;}
      if(!push('\\n'))return false;
      if(/^H[1-6]$/.test(tag)&&!push('#'.repeat(Number(tag[1]))+' '))return false;
      if(tag==='LI'&&!push('- '))return false;
     }else if(tag==='TD'||tag==='TH'){if(!push(' '))return false;}
     else if(tag==='IMG'){const alt=line(n.getAttribute('alt'));if(alt&&alt.length>3&&n.closest('figure')&&!push(` [image: ${alt.slice(0,80)}] `))return false;return true;}
     for(const child of kids(n))if(!walk(child))return false;
     if(isBlock&&!push('\\n'))return false;
     return true;
    };
    walk(root);
    // One line per block, whitespace collapsed, repeated blank lines and exact repeats dropped. A short
    // label ("Kingdom:") joins the value after it, and runs of one-to-three-character cells join.
    const lines=[];let offset=0,anchorLine,short=false;
    for(const raw of clean(out).split('\\n')){
     if(anchor!==undefined&&anchorLine===undefined&&offset>=anchor)anchorLine=lines.length;
     offset+=raw.length+1;
     const text=raw.replace(/\\s+/g,' ').replace(/^(#+|-) $/,'').trim();
     if(!text||text===lines[lines.length-1])continue;
     const last=lines[lines.length-1];
     if(last!==undefined&&!/^(#|- )/.test(text)&&((short&&text.length<=3)||(last.length<=40&&last.endsWith(':')&&last[0]!=='#'&&text.length<=120))){lines[lines.length-1]=last+' '+text;short=short&&text.length<=3;continue;}
     short=text.length<=3;lines.push(text);
    }
    let text=redact(lines.join('\\n'));
    if(secret.test(text))return {withheld:'sensitive-page'};
    let viewAt;if(anchorLine!==undefined)viewAt=lines.slice(0,anchorLine).join('\\n').length;
    // Head and tail, and the part on screen when the owner has scrolled past the head.
    if(text.length>TEXT_MAX){
     truncated=true;
     if(viewAt===undefined||viewAt<TEXT_MAX*0.6){
      const head=Math.floor(TEXT_MAX*0.8),tail=TEXT_MAX-head-CUT.length;
      text=whole(text.slice(0,head))+CUT+whole(text.slice(-tail));
     }else{
      const head=1200,tail=600,mid=TEXT_MAX-head-tail-2*CUT.length;
      const start=Math.max(head,Math.min(viewAt-200,text.length-tail-mid));
      text=whole(text.slice(0,head))+CUT+whole(text.slice(start,start+mid))+CUT+whole(text.slice(-tail));
     }
    }
    const result={text,truncated};
    // The owner's selection, unless it is in a field or holds a credential.
    const selection=getSelection();
    if(selection&&!selection.isCollapsed&&selection.rangeCount){
     const at=selection.anchorNode&&(selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement);
     const value=whole(redact(line(selection.toString())).slice(0,SELECTION_MAX));
     if(value&&!(at&&at.closest('input,textarea,[contenteditable]:not([contenteditable="false"])'))&&!secret.test(value))result.selection=value;
    }
    // Links the page shows. Headline-like links come first, then short ones (names, times, glosses);
    // within each, those on screen first, then in page order. A link to an action endpoint (hide, vote,
    // delete, ...) changes something when opened, so it is never offered.
    const action=/^(?:hide|unhide|vote|upvote|downvote|flag|unflag|fave|favorite|favourite|like|unlike|delete|remove|edit|reply|follow|unfollow|subscribe|share|print|logout|signout)$/i;
    const route=/(?:^|[^a-z0-9])(?:signin|sign-in|login|log-in|logout|log-out|signout|sign-out|auth|oauth|sso|account|accounts|password|reset|recovery|token|session|checkout|cart|unsubscribe)(?:$|[^a-z0-9])/i;
    const here=location.href.replace(/#.*$/,''),seen=new Set([here]),buckets=[[],[],[],[]];let anchors=0;
    for(const a of root.querySelectorAll('a[href]')){
     if(++anchors>3000||buckets[0].length>=LINKS_MAX||(buckets[0].length+buckets[1].length>=LINKS_MAX&&late()))break;
     let url;try{url=new URL(a.href);}catch{continue;}
     if(url.protocol!=='https:'||url.username||url.password)continue;
     url.hash='';const href=url.href;
     if(href.length>2048||seen.has(href))continue;
     let decoded;try{decoded=decodeURIComponent(href);}catch{continue;}
     if(route.test(decoded)||url.pathname.split('/').some(part=>action.test(part.replace(/\\.[a-z0-9]{1,5}$/i,''))))continue;
     if(a.closest('nav,footer,aside,[role="navigation"],[aria-hidden="true"]')||!shown(a))continue;
     let words=whole(redact(line(a.innerText||a.getAttribute('aria-label')||a.getAttribute('title')||'')));
     if(!words||words.length<2)continue;
     if(words.length>LINK_TEXT_MAX)words=whole(words.slice(0,LINK_TEXT_MAX-1)).replace(/\\s+\\S*$/,'')+'\\u2026';
     if(secret.test(words))continue;
     seen.add(href);
     const r=a.getBoundingClientRect(),visible=r.bottom>0&&r.top<height,headline=words.length>=24||words.split(' ').length>=4;
     buckets[(headline?0:2)+(visible?0:1)].push({text:words,url:href});
    }
    const links=buckets.flat().slice(0,LINKS_MAX);
    if(links.length)result.links=links;
    return result;
    })()
    """;
}
