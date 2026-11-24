// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"

const fence = /^[ \t]*(?:`{3,}|~{3,})/;
const toolCall = /<tool_call>[\s\S]*?(?:<\/tool_call>|$)|<function=[\s\S]*?(?:<\/function>(?:\s*<\/tool_call>)?|$)|<\/tool_call>|<\/function>/g;

/**
 * Alpha's reply as the owner reads it: a tool call the model wrote out as text, from `<tool_call>` or `<function=` to
 * its closing tag or to the end of a reply that never closes it, is hidden outside a fence; inside a fence every line
 * stays as written. A reply with no such markup is returned unchanged.
 */
export function shownReply(text: string): string {
  if (!text.includes("<tool_call>") && !text.includes("<function=") && !text.includes("</tool_call>") && !text.includes("</function>")) return text;
  const pieces: string[] = [];
  let prose: string[] = [];
  let fenced = false;
  const flush = () => {
    if (prose.length) pieces.push(prose.join("\n").replace(toolCall, ""));
    prose = [];
  };
  for (const line of text.split("\n")) {
    if (fenced || fence.test(line)) {
      flush();
      pieces.push(line);
      if (fence.test(line)) fenced = !fenced;
    } else prose.push(line);
  }
  flush();
  return pieces.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
