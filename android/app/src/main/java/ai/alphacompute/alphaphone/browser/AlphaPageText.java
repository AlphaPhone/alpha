package ai.alphacompute.alphaphone.browser;

import com.getcapacitor.JSObject;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * The readable text of the page in a Browser tab, for the one Browser page block every agent turn
 * carries while the page applies (apps/app/src/browser/page-context.ts, which also keeps password
 * managers' sites from being read). {@link #SCRIPT} runs only in the tab's isolated reading world
 * ({@code BrowserReadingWorld}); the page cannot reach it. It applies the rules of
 * apps/app/src/browser/readable-page.ts to the live document and also skips elements that are not
 * rendered (test/readable-page.test.mjs runs both on the same fixtures).
 *
 * <p>Main content first, then the rest of the body; navigation, menus, form controls and hidden
 * elements are skipped. A page with a shown password or one-time-code field gives no text. No
 * input value, cookie, storage or frame is read, and nothing is shown to the owner: the text goes
 * into the owner's own turn to their own agent.
 */
public final class AlphaPageText {
 private AlphaPageText() {}
 /** The renderer's PAGE_TEXT_MAX_CHARS (test/readable-page.test.mjs keeps them equal). */
 public static final int MAX_CHARS = 4000;

 /** The expression the reading world evaluates. */
 public static String expression() {
  return "(" + SCRIPT + ")(" + MAX_CHARS + ")";
 }

 /** The plugin's answer from the script's JSON result, on top of the tab's address and title. */
 public static JSObject result(String encoded, JSObject page) throws Exception {
  Object decoded = new JSONTokener(encoded).nextValue();
  if (!(decoded instanceof JSONObject)) throw new IllegalStateException("Unreadable page text");
  JSONObject read = (JSONObject) decoded;
  JSObject out = new JSObject();
  out.put("url", page.getString("url"));
  String title = read.optString("title", "");
  out.put("title", title.isEmpty() ? page.getString("title", "") : title);
  String description = read.optString("description", "");
  if (!description.isEmpty()) out.put("description", description);
  String unavailable = read.optString("textUnavailable", "");
  if (!unavailable.isEmpty()) { out.put("textUnavailable", unavailable); return out; }
  String text = read.optString("text", "");
  if (text.length() > MAX_CHARS) throw new IllegalStateException("Page text over its limit");
  out.put("text", text);
  if (read.optBoolean("truncated")) out.put("truncated", true);
  return out;
 }

 /** Keep in step with apps/app/src/browser/readable-page.ts. */
 static final String SCRIPT = """
  (max)=>{
  const type=document.contentType;
  if(!['text/html','application/xhtml+xml','text/plain'].includes(type))return {textUnavailable:'not readable'};
  const SKIPPED='script,style,noscript,template,svg,canvas,iframe,object,embed,nav,[role=navigation],[role=menu],[role=menubar],input,textarea,select,option,button,[hidden]';
  const SIGN_IN='input[type=password i],[autocomplete*=one-time-code i],[autocomplete*=current-password i],[autocomplete*=new-password i]';
  const BLOCK=/^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BR|CAPTION|DD|DETAILS|DIALOG|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HGROUP|HR|LEGEND|LI|MAIN|MENU|OL|P|PRE|SECTION|SUMMARY|TABLE|TBODY|TD|TFOOT|TH|THEAD|TR|UL)$/;
  const NODE_LIMIT=20000,TIME_LIMIT_MS=300;
  const lineWriter=()=>{
   const lines=[];let length=0,full=false;
   return {
    get full(){return full;},
    add(raw){const line=raw.replace(/\\s+/g,' ').trim();if(!line||full||line===lines[lines.length-1])return;lines.push(line);length+=line.length+1;if(length-1>max)full=true;},
    result(truncated){let text=lines.join('\\n');if(text.length>max){const cut=text.slice(0,max),space=cut.search(/\\s\\S*$/);text=(space>max*0.8?cut.slice(0,space):cut).replace(/[\\uD800-\\uDBFF]$/,'').trimEnd();truncated=true;}return truncated?{text,truncated:true}:{text};},
   };
  };
  if(type==='text/plain'){const writer=lineWriter();for(const line of (document.body?document.body.textContent:'').split(/\\r?\\n/)){writer.add(line);if(writer.full)break;}return writer.result(false);}
  const meta=document.querySelector('meta[name=description i]')||document.querySelector('meta[property="og:description" i]');
  const description=(meta&&meta.getAttribute('content'))||'';
  const page={title:document.title,...(description.trim()?{description}:{})};
  const shown=e=>typeof e.checkVisibility!=='function'||e.checkVisibility({checkVisibilityCSS:true})||getComputedStyle(e).display==='contents';
  if([...document.querySelectorAll(SIGN_IN)].some(field=>!field.closest('[hidden]')&&shown(field)))return {...page,textUnavailable:'sign-in form on this page'};
  const body=document.body;
  if(!body)return {...page,text:''};
  const main=document.querySelector('main,[role=main],article');
  const writer=lineWriter(),started=Date.now();
  let line='',nodes=0,truncated=false;
  const exit={};
  for(const root of main&&main!==body?[main,body]:[body]){
   const stack=[root];
   while(stack.length&&!writer.full){
    if(++nodes>NODE_LIMIT||Date.now()-started>TIME_LIMIT_MS){truncated=true;break;}
    const next=stack.pop();
    if(next===exit){writer.add(line);line='';continue;}
    const node=next;
    if(node.nodeType===3){line+=node.nodeValue||'';continue;}
    if(node.nodeType!==1)continue;
    const element=node;
    if((root===body&&element===main)||element.matches(SKIPPED)||!shown(element))continue;
    if(BLOCK.test(element.tagName.toUpperCase())){writer.add(line);line='';stack.push(exit);}
    for(let index=element.childNodes.length-1;index>=0;index--)stack.push(element.childNodes[index]);
   }
   writer.add(line);line='';
   if(truncated||writer.full)break;
  }
  return {...page,...writer.result(truncated)};
  }
  """;
}
