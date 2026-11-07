/* The chat keeps only the newest stored messages mounted. A closed chat renders enough rows for
   the bar's peek and a streaming reply; an open chat starts with one page and mounts another page
   of older rows each time the owner scrolls to the top. Stored messages are never trimmed. */
export var CLOSED_TRANSCRIPT_ROWS = 20;
export var TRANSCRIPT_PAGE_ROWS = 100;
/** Pixels from the top of the transcript that count as reaching it. */
var TOP_SLACK = 40;

/** The rows to render. A new conversation (its first message changed) starts again at one page. */
export function transcriptWindow(shell, msgs, open) {
  var first = msgs.length ? msgs[0].id : null;
  if (!shell.transcriptRows || shell.transcriptFirst !== first) { shell.transcriptRows = TRANSCRIPT_PAGE_ROWS; shell.transcriptFirst = first; }
  var rows = open ? shell.transcriptRows : CLOSED_TRANSCRIPT_ROWS;
  return msgs.length > rows ? msgs.slice(msgs.length - rows) : msgs;
}

/** Scroll listener (capture phase): reaching the top of an open transcript mounts one more page. */
export function growTranscriptAtTop(shell, event) {
  var list = event.target;
  if (!list || typeof list.matches !== "function" || !list.matches("[data-alpha-transcript]") || list.scrollTop > TOP_SLACK) return;
  var S = shell.S();
  if (!["sheet", "full"].includes(S.chat) || (S.msgs || []).length <= (shell.transcriptRows || TRANSCRIPT_PAGE_ROWS)) return;
  shell.transcriptRows = (shell.transcriptRows || TRANSCRIPT_PAGE_ROWS) + TRANSCRIPT_PAGE_ROWS;
  shell.setState({});
}
