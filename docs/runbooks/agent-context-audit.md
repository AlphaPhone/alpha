# Measuring what the phone's agent sends its text model

Updated November 20, 2026. The resident agent's text model is `qwen-3.8-27b` on
Cerebras, reached through Eliza Cloud or the owner's own key. Cerebras limits the whole
account to 150K tokens a minute that missed its prompt cache, and 750K in all.

Measured on that model with `scripts/agent-cache-probe.ts`, and different from its
documentation:

- **The limit is an allowance that refills.** It holds 150K tokens and comes back at
  2,500 a second, never above 150K. It is not a count over the last 60 seconds. After
  one request of 18,947 uncached tokens the reported allowance was full again 7.6
  seconds later.
- **A request holds more than it uses.** When it is admitted it holds its whole input,
  cached or not, estimated about a quarter high (1.24 times), plus its output cap up to
  16,384; a request that sends no cap, or a larger one, holds 16,384 for the output. It
  is refused (HTTP 429) when the allowance left is smaller than that. When it finishes
  it gives the hold back and is charged the input that missed the cache plus the output
  it actually wrote. Cached input is never charged.
- **The model's limits.** The context window is 131,072 tokens and the most a call can
  write is 40,960, which is also the limit when no cap is sent (an uncapped call stopped
  at exactly 40,960). Reasoning tokens count inside the cap; the model reasons by default
  unless the request says `reasoning_effort: none`. Since one request's hold must fit in
  the 150K allowance, the largest input an uncapped request can ever carry is about 107K.
- **A refusal asks for a longer wait than is needed.** It carries `Retry-After: 59`.
  Three requests of 36K tokens refused together and re-sent each second were admitted
  5, 14 and 27 seconds later, as the allowance refilled. A refused request is not
  charged.
- **The cache reuses a request's leading text in units of 1,024 tokens**, read as tool
  definitions, then the system prompt, then the messages. One changed byte in a tool
  definition makes the rest of the request a miss.
- **A stored prefix is kept for between 10 and 20 minutes.** Eight requests were stored
  and each read back once: those read at 5 and 10 minutes were reused, those read at 20,
  30, 45, 60 and 90 minutes were not. One sample per interval; the audit assumes 10.
- **A digit costs about one token.** Ids and timestamps cost several times what prose
  does per character.

So three things cost allowance: input that misses the cache, the size of a request while
it runs, and a missing output cap. Output itself is small, about 2% of a turn's input.

This runbook covers host tools. None is an APK, emulator, image or device acceptance
result.

### The route a phone uses

A phone signed in to the Cloud does not call Cerebras itself. Its runtime posts each
call to the Cloud, which sends it to Cerebras with one key shared by every phone. This
was read from the code and rendered offline with the network stubbed; no Cloud turn was
sent. Every live figure below was taken on the direct route.

- The Cloud adds no text. Tool definitions arrive in the phone's order and bytes, the
  system prompt is unchanged, and the output cap, the conversation's cache key and the
  provider's cached count all pass through. The runtime changes therefore apply.
- Planner tools go out non-strict with their schemas as written. The direct route sends
  them strict with rewritten schemas, which are larger where a schema has an open map
  (a Calendar read is 7.8K characters on the phone's route and 16.9K on the direct one).
  The routing evals in section 1 send the phone's form; the whole-turn runs in section 2
  send the direct form.
- A refusal comes back with no wait. The phone re-sends once per model type, up to ten
  uploads for one refused step, and then waits five seconds. The hold setting
  `OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS` belongs to the direct route and does nothing here.
- Nothing in the Cloud counts tokens or paces a phone. One phone's holds can refuse
  another phone's call.

## 1. Read a phone's recorded requests

The agent records every text-model call in its on-device database. Copy the database
from a phone you own, then audit the copy:

```sh
adb exec-out "su 0 tar -cf - -C /data/data/ai.alphacompute.alphaphone/files/.eliza/workspace .elizadb" > elizadb.tar
mkdir phone-db && tar -xf elizadb.tar -C phone-db
bun scripts/agent-context-audit.ts phone-db/.elizadb --since 2026-11-18T12:00:00Z --tpm 150000 --json audit.json
```

The copy holds the owner's conversations. Keep it out of the repository and delete it
when done. The report prints sizes and section names only; `--show-text` adds short
excerpts around each point where two requests stop matching.

The report gives, per stage (Stage 1, planner, evaluator, side calls): call counts and
input tokens; calls and tokens per turn; input tokens in any 60 seconds against
`--tpm`; where each stage's characters go; the share of each request that an earlier
request of the same stage, within `--cache-minutes` (default 10), already contained;
and the text at which requests most often diverge.

It ends with the provider's cache and limits applied to the recorded requests: cached
tokens, what was charged in any 60 seconds, and the allowance left once each call holds
its share, against `--uncached-tpm` and `--total-tpm` (default 150K and 750K). A call
that starts with less allowance than it holds is one the provider would have refused
had this phone been alone on the account. `--reserve planner=8192` counts an output cap
for a stage whose calls record none.

Where a call carries the provider's own counts, those are used, and the rule-derived
cached count is shown beside the provider's. A runtime that records them also stores
each tool definition's name, size and digest and the output cap. Older runtimes store
messages only: token counts are estimates and tool definitions are not counted or
compared, which makes such a phone look better than it was. Give them their size, in
characters, with `--assume-tools stage1=14000,planner=29000`, and add
`--assumed-tools-change` when that runtime sent a different definition on every call.

Run the probe again when the provider or model changes, while nothing else uses the
key. It sends about 40 synthetic requests and fails if the unit, the order, the hold or
the refill rate no longer match what the audit assumes:

```sh
bun scripts/agent-cache-probe.ts
```

On three local resident runs that ended in refusals (section 2) the audit's allowance
is within 5% of empty at the last call each run completed: 2,823 and 1,304 tokens short
and 7,182 left, of 150,000.

### Baseline, Pixel, November 18, 2026

One conversation of 283 messages; 323 model calls in 129 turns that day; runtime pin
`f17ac0ccc45`, Eliza Cloud route. Estimated from recorded messages. That runtime did not
record tool definitions, so they are counted at their sizes as it sent them: 14K
characters with Stage 1, the second of its two tools different on every turn, and the
29K-character device tool with the planner, different on every call
(`--assume-tools stage1=10900+3100,planner=29000 --assumed-tools-change`).

| Measure | Value |
| --- | --- |
| Stage 1 input per call | 29K tokens median, 44K maximum |
| Planner input per call | 27K median, 52K maximum |
| Evaluator input per call | 10K median, 32K maximum |
| Input per turn | 53K median, 119K at the 90th percentile, 222K maximum |
| Input that day | 7.9M tokens |
| Tokens the cache rules give as reused | 6% (Stage 1 7%, planner 0%, evaluator 38%) |
| Uncached tokens charged in any 60 seconds | 93K median, 170K at the 90th percentile, 294K maximum |
| Allowance left once a call holds its share | 84K median, 14K at the 10th percentile, 62K short at the lowest |
| Turns with a call a 150K allowance would not cover | 18 of 129 |
| Turns that ended in HTTP 429, one 38-turn log on the shared Cloud key | 12 |

A Stage 1 call of 29K tokens with no output cap held about 52K while it ran, a third of
a 150K allowance. One call in ten left less than 14K, which is less than any other
phone's next call would hold.

The last two allowance rows apply the test key's measured limit (150K, refilled 2,500
tokens a second) to calls the phone did complete. The phone sends through the Cloud;
whether the Cloud's account has that same limit is not confirmed, and a refused call
leaves no record. Read them as how far these requests are from fitting that limit, not
as a count of failures.

Token counts before November 20 in this file's history used an estimate that read about
10% low, and 20% low on the requests with the most ids and timestamps. The figures here
use the estimate fitted to the provider's counts (`estimateTokens`).

Four causes:

- **No history limit.** Every call carried the conversation's whole lifetime and a
  receipt for every past action, about three quarters of a Stage 1 request. The
  reviewer that thins history does not run on a phone.
- **A fresh reference every turn.** Each phone number and credential was sent under a
  new reference on every turn, and the system prompt ended in a list of them.
- **Tool definitions that changed every turn.** The device tool documents its number
  format with an example, and the example was rewritten as one of those references. The
  provider reads tools first, so on every planner call it read the rest of the request
  again.
- **No output cap on the first step of a turn or on its check.** Each held 16,384
  tokens for an answer of about 150.

### The same Pixel two days later, and the same turns through the branch

The Pixel's log was read again on November 20 (launcher build 617, the same runtime
behaviour). The conversation had grown from 283 to 580 messages, and with no history
limit its requests had doubled. The right-hand column is a host replay, not a phone
result: the same turns of November 19 and 20 sent through the upstream branch's Stage 1
and planner code as in the replay section below, with the reworked device tool and the
phone's output caps. It covers Stage 1 and the first planner call of each turn.

| November 19 and 20 | Pixel as recorded, tools counted | Same turns through the branch |
| --- | --- | --- |
| Stage 1 input per call | 62K tokens median, 78K maximum | 19K, 23K |
| Planner input per call | 69K median, 87K maximum | 24K, 28K |
| Input per turn | 126K median, 164K p90, 248K maximum | 42K, 49K, 51K |
| Tokens the cache rules give as reused | 3% | 78% |
| Uncached tokens charged in any 60 seconds | 122K median, 177K p90, 246K maximum | 3K, 25K, 53K |
| Allowance left once a call holds its share | 38K median, 112K short at the lowest | 119K median, 92K at the lowest |
| Turns with a call a 150K allowance would not cover | 75 of 145 | 0 of 158 |

One first step of 62K tokens with no output cap holds about 94K of a 150K allowance
while it runs, and the planner call that follows is larger. As above, the last row is
the test key's limit applied to calls the phone completed through the Cloud. The phone's
log shows it sending such calls in the minutes when the probe on the first test key's
account read another device's calls (section 2).

### What the provider counted, before and after

A synthetic conversation of 72 messages was replayed through the upstream Stage 1 and
planner code at the pin and on upstream branch `claude/agent-context-budget`, and the
70 requests of each were sent to Cerebras in order, with the phone's device tool on
every planner request. These are the provider's own `cached_tokens`.

| Measure | Pin `f17ac0ccc45` | Branch, stable references |
| --- | --- | --- |
| Prompt tokens | 588K | 556K |
| Cached | 29% | 79% |
| Uncached tokens per request | 5,989 | 1,692 |
| Stage 1, cached | 22% | 61% |
| Planner, cached | 31% | 85% |

For the same requests the audit's rules give 13% and 82%. It treats a changed tool
definition as wholly missed, where the provider still reuses the units before the
change, so it reads low when a tool changes late in its text.

### The phone's conversation replayed through the runtime

A host replay, not a phone result. Every turn of the recorded conversation was sent
through the upstream Stage 1 and planner code with a scripted model, then through the
runtime's model dispatch with reference substitution on, and the audit's rules were
applied to the requests that came out. It covers Stage 1 and the first planner call of
each turn that planned on the phone (205 requests for the 128 turns of November 18), so
it carries less load than the phone's whole day did. The harness loads none of the phone's apps, so the
device tool and the phone's Stage 1 fields are counted at their recorded sizes, and the
view and capability text the phone adds after the history is absent.

| Measure | Pin | Branch, references not stable | Branch, stable references |
| --- | --- | --- | --- |
| Stage 1 input per call | 18.5K median, 28.9K max | 10.8K, 13.1K | 10.8K, 13.1K |
| Planner input per call | 21.5K median, 34.8K max | 15.6K, 19.0K | 15.7K, 19.1K |
| Input per turn | 27.4K median, 56.1K p90 | 21.0K, 29.4K | 21.2K, 29.5K |
| All input | 4.07M | 2.51M | 2.52M |
| Tokens reused by the rules | 9% | 45% | 76% |
| Uncached tokens charged in any 60 seconds | 40K median, 101K p90, 168K max | 16K, 36K, 56K | 7K, 17K, 30K |

On the phone the device tool differed between consecutive planner turns about one time
in eight, when the view changed. With that, the last column reads 70% reused and 7K,
24K, 35K. With the output caps the phone now sets, the allowance left at the tightest
moment of that replay is 119K of 150K on the branch and 75K at the pin.

For turns with fewer than 40 earlier messages, which the history window leaves alone,
the branch's planner request has the same system prompt and the same paragraphs in the
same order as the pin's when references are not stable. Its tools are the same
definitions as written, in a different order. Its Stage 1 request has the same
paragraphs in another order and a tool definition without two fields nothing on a phone
reads.

### History the window does not show

With the window, a request that depends on an early message ("what's my gate code
again?") no longer has it in view. Ten such requests, ten that need nothing earlier
and one standing instruction were put to the phone's model against a 60-message
conversation, four runs each, with the model's own history reads replayed through the
runtime until it answered.

| Dependent requests answered with the fact | Whole history | Window |
| --- | --- | --- |
| First notice wording | 39 of 40 | 30 of 40 |
| Notice says to read before denying or promising to check | 40 of 40 | 35 of 40 |
| Plus exchanges recalled by the request's distinctive words, and search by words (as shipped on the branch, two rounds) | 78 of 80 | 80 of 80 |

Before the last step the model had to notice the gap and read. It sometimes replied
that it had no record, and three of five of its searches ("cabin wifi password")
matched nothing literally. With recall the answer usually comes in one model call and
fewer tokens than the whole history. In the last row one windowed answer gave the time
in words and one whole-history run returned no reply. The requests that need nothing
earlier caused no extra read in any row. A question about something never said costs
one read before the model says so. The standing instruction ("end every reply with
Noted") was followed in about half the runs with the whole history and with the window
alike.

Recall matches words, not meaning: a correction that shares no word with the request
("it changed to 9920") is not recalled with the message it corrects, and a fact whose
words appear in three or more messages is left to the model's own read. On the phone's
conversation recall adds messages on 6 of 125 windowed turns and lowers reuse by less
than one point.

### The device tool

`PROPOSE_DEVICE_ACTION` is the largest thing a phone's planner request carries. On the
upstream branch it says each rule once, lets its schema carry what a schema can, and
shares a branch between operations that take the same arguments.

| Phone's capabilities, characters | Before | After |
| --- | --- | --- |
| Device tool, Home turn | 30,129 | 23,661 |
| Device tool, Maps turn | 27,774 | 21,950 |
| Planner's phone instruction | 9,340 | 7,058 |

The same operations are offered and the same arguments accepted: over 1.18 million
generated operations the old and new schemas gave the same verdict, and two requests in
one view get the same bytes. The rule for a number the owner wrote stays in full on
each of the six fields that take one.

On the model, the same 39 requests five times each, interleaved, with the planner's
request as each tree renders it:

| | Before the rework | After |
| --- | --- | --- |
| Device requests routed correctly | 169 of 175 | 168 of 175 |
| Prompt tokens per request | 11,676 | 9,670 |
| References copied exactly | 195 of 195 | 194 of 195 |
| Three two-step requests, both steps in the first reply, 12 runs each | 14 of 36 | 14 of 36 |

In the five-run sample the two-step requests read 163 and 157 of 175, which the
twelve-run sample did not bear out. A two-step request that gets only its first step in
the planner's first reply is common before and after, and in whole turns (section 2) a
text with an alarm in one request proposed only the text in every arm.

Other forms were measured on the replay and not built:

| Device tool on a planner call | All input | Planner tokens reused |
| --- | --- | --- |
| Per view, same every turn (28.8K characters) | 2.52M | 78% |
| Per view, changing on one turn in eight (the phone before the rework) | 2.52M | 66% |
| One tool for every view (41.6K), never changing | 2.77M | 80% |
| Operations chosen per request (14.4K), differing on half the turns | 2.24M | 35% |
| One tool per family (6.5K), differing on half the turns | 2.09M | 33% |

A tool chosen per request sends fewer tokens and more of them uncached, because the
provider reads tool definitions first: a different tool makes the system prompt and the
history after it a miss. That is why the tool stays one per view.

### Routing on the model, before and after

39 phone requests, each rendered as the planner's request at the pin and on the branch
in the order and bytes each sends, were put to the model five times, interleaved. A
request passes when the device operation it calls is the expected one.

| | Pin `f17ac0ccc45` | Branch, before the device-tool rework |
| --- | --- | --- |
| Device requests routed correctly | 169 of 175 | 170 of 175 |
| Every operation of a two-step request | 162 of 175 | 163 of 175 |

"Ping my brother" fails in both: the model calls where a text is expected. This covers
the planner step with the device tool only.

### Where a request's tokens go after the change

One conversation of 36 turns on a local resident in Android mode (section 2), branch
`a5a361580a3`, average characters per call:

| Part | Stage 1 (34.6K) | Planner (62.0K) | Evaluator (39.2K) |
| --- | --- | --- | --- |
| Tool definitions | 34% | 47% | none |
| System prompt | 9% | 17% | 34% |
| Instructions | 10% | 12% | 11% |
| Recorded outcomes of earlier requests | 18% | 10% | 22% |
| Earlier messages | 10% | 4% | 6% |
| Phone capabilities | 12% | 2% | 7% |

Output is about 2% of input. Over 295 calls the provider counted, Stage 1 wrote 196
tokens at the median and 342 at most, the planner 103 and 263, the evaluator 180 and
540. What output costs is its cap, which a call holds while it runs: at most 16,384,
which is also what a call that sends no cap holds. Calls that reason write far more: a
first step that reads history back reasons with 700 to 3,600 output tokens, and the
personal assistant's planning call used more than 4,096.

## 2. Whole turns on a local resident

`scripts/eval-phone-actions.ts` sends 36 fixed requests to a loopback resident that has
a hosted model, as an enrolled synthetic Alpha-image phone, and scores which device
operation each turn proposes. Every proposal is rejected at once; nothing runs.

```sh
bun run dev    # or another loopback resident with a provider key
bun scripts/eval-phone-actions.ts --origin http://127.0.0.1:47849 --token-file <paired machine token file> \
  --output test-results/phone-actions.json --runs 3 --pause-ms 4000 [--one-conversation] \
  --database ~/.local/share/alphaphone/<profile>/.eliza/workspace/.elizadb
```

The device routes need a paired machine session, not the owner token. By default each
case has its own conversation. `--one-conversation` sends a run's cases in one
conversation, the way an owner uses a phone for a while: each request then carries the
turns before it.

Run it on the base revision and on the change, with the same case-set revision and
profile. Compare `passRate`, `byFamily`, `failingCases` and, with `--database`, the
tokens the run used. Cases that pass on some runs and fail on others are listed as
unstable; settle those before reading a difference. A pass covers device proposals
only: it does not judge reply wording, Maps, Notes or Calendar record actions, or a
real phone.

A resident told it is a phone (`ELIZA_PLATFORM=android` and
`ELIZA_ANDROID_APP_DATA_DIR` set to the parent of its state directory) takes the
phone's paths: the history window, no post-turn review, the phone's Stage 1 fields. It
is still a desktop process with a desktop's plugins. It is not an APK or a device.

### Results, November 20, 2026

Direct Cerebras key, references swapped as on the phone, one run of the case set per
arm. "Base" is the product pin `de690c72f9b`. "Branch" is upstream `a5a361580a3` with
the settings the phone launches with: stable references and output caps of 4,096.
"Rework" is upstream `274e719ac37`: the same with the device-tool rework and the device
tool offered to requests routed as files tasks. "Tip" is upstream `5b885c53d06` with the
phone's full settings: a re-send for a refused first step, caps on the side calls, a
four-second model hold and the Clock route sentence. The base runtime does not record
tool definitions or the provider's counts.

Scores use case set revision 3, in which three expectations were corrected: a phone has
no timer, free/busy from Home belongs to the Calendar service, and opening a view may be
a device proposal. Earlier runs are re-scored from the proposals they recorded; the tip
runs have one more case, a plain reminder.

Desktop mode:

| | Base | Branch |
| --- | --- | --- |
| Turns 1.5 s apart: answered before the provider refused | 9 of 36 | 26 of 36 |
| Turns 15 s apart: cases passing | 30 of 36 | 32 of 36 |
| Turns 15 s apart: device requests routed correctly | 20 of 25 | 21 of 25 |
| Provider's cached share, 15 s apart | not recorded | 66% |

Android mode:

| | Base | Branch | Rework | Tip |
| --- | --- | --- | --- | --- |
| Turns 1.5 s apart: answered before the provider refused | 8 of 36 | 36 of 36 | 36 of 36 | 37 of 37 |
| Turns 1.5 s apart: cases passing, of those asked | 7 of 8 | 31 of 36 | 30 of 36 | 32 of 37 |
| Turns 1.5 s apart: input, cached share, lowest allowance | not recorded | 845K, 55%, 32K | 685K, 55%, 84K | 1,059K, 68%, 63K |
| One conversation, 5 s apart: turns answered | 24 of 36, refused at turn 19 | 36 of 36 | 36 of 36 | 37 of 37 |
| One conversation: cases passing, of those asked | 21 of 24 | 31 of 36 | 34 of 36 | 35 of 37 |
| One conversation: input per turn | 25K median, 30K p90 over its 24 turns (estimated) | 33K, 57K | 30K, 42K | 33K, 52K |
| One conversation: cached share, lowest allowance | 2% by the rules, 7K | 58%, 82K | 54%, 90K | 55%, 42K |
| Turns 10 s apart: cases passing, of those asked | 32 of 36 | 27 of 31 | 34 of 36 | 33 of 37 |
| Turns 10 s apart: device requests routed correctly, of those asked | 21 of 25 | 17 of 21 | 23 of 25 | 22 of 25 |

In the tip's 1.5-second arm one request ("Show my contacts") went through tool search
for 14 model calls and 305K tokens, which is why that arm's input is the largest. The
same request took one to three planner rounds in other arms.

### The Clock route sentence

The alarm, timer, reminder and free/busy cases, five runs each in Android mode, at
upstream `217b4a92be9` (before the sentence) and at the tip, same settings:

| Request | Before | After |
| --- | --- | --- |
| "Set an alarm for 7am." proposes an alarm | 4 of 5 | 5 of 5 |
| "Wake me at 6:30 tomorrow." proposes an alarm | 1 of 5 | 5 of 5 |
| "Set a timer for 10 minutes." proposes no alarm | 5 of 5 | 4 of 5 |
| "Remind me to call mom at 5pm." proposes no alarm | 5 of 5 | 5 of 5 |
| Free/busy from Home proposes no device read | 5 of 5 | 5 of 5 |
| A text and an alarm in one request proposes both | 0 of 5 | 0 of 5 |

### What a refusal costs, before and after

The same thirty turns ran twice while other jobs were using the same account. At
upstream `274e719ac37`, with the provider's whole hold and no re-send of a first step,
the provider refused one call, the runtime held the model for 59 seconds, and 17 of the
30 turns were answered in a sixth of a second without asking the model. At the tip, with
a four-second hold and one re-send at every step, the provider refused eleven calls and
all 30 turns were answered by the model; six of them took five seconds longer.

Read with these in mind:

- **One run per arm.** Two or three cases move between runs of the same arm. The same
  cases fail at the base and on the branch: a vague text ("Ping my brother") and a text
  with an alarm in one request. "Show my PDFs in Files" failed in every arm before the
  rework and passes in every arm since.
- **A refusal stops more than one turn.** On this route the runtime held a refused
  model for the provider's `Retry-After`, 59 seconds, and answered every turn in that
  time without asking the model. "Answered before the provider refused" is therefore
  the turn at which the account's allowance ran out. In the branch's 10-second arm a
  side call was refused while the run itself had used a tenth of the allowance:
  something else on the account had used the rest, and five turns were lost to the
  hold. Upstream `217b4a92be9` lets a host cap the hold. The base, branch and rework
  arms ran without it; the tip arms ran with the phone's four seconds.
- **The account is shared.** While the probe ran on an otherwise idle key, another
  device's calls appeared as allowance held and then drained to 5K. The Pixel's own log
  shows it sending first steps of 61K tokens in those minutes. Every count of refusals
  here includes whatever else was using the account.
- **The audit's allowance agrees with the refusals.** At the last call each refused
  run completed, the audit puts the allowance at 2,823 and 1,304 tokens short and at
  7,182 left, of 150,000.
- **The branch does not make a short conversation's requests smaller.** Turn by turn
  its Stage 1 and planner requests are the size of the base's until the history window
  starts, at about 40 messages. What changes is that most of each request is a cache
  hit, which is not charged, and that each call holds 4,096 for its output and not
  16,384.
- **The evaluator ran in these turns.** 5 to 12 calls per Android-mode arm on the
  branch, capped, about half cached, every turn answered.
- **The side calls are capped at the tip.** Its logs record 4,096 on the large text
  calls that recorded none before.

### Phone-like runs: the merged runtime and the follow-ups

The phone loads the personal-assistant plugin and sends its requests in direct-request
mode; the desktop launcher turns the plugin off and the eval sent no mode. From case set
revision 5 the eval sends the phone's mode, and `resident-launch3.sh` in the work cache
turns the plugin on. With it a reminder request carries the reminder tools (19.6K
characters for the reminder create tool alone).

One conversation, 5 s apart, Android mode, plugin loaded, case set revision 7 (46 turns:
41 cases and 5 follow-ups). "Merged" is upstream `6e2a094775` as pinned by the product.
"Follow-ups" adds the history-window rebind, Calendar descriptions, the role-word
contact query, the constant evaluator schema and the device-turn tool surface. Both
with the phone's 4,096 output caps. No provider refusal in either run.

| | Merged | Follow-ups |
| --- | --- | --- |
| Cases passing | 38 of 46 | 42 of 46 |
| Device requests routed correctly | 24 of 31 | 28 of 31 |
| Input per turn, median and p90 | 31K, 59K | 34K, 60K |
| Provider's cached share | 37% (planner 30%) | 46% (planner 43%) |
| Uncached tokens charged in any 60 s, median | 130K | 135K |
| Lowest allowance once a call holds its share | 50K | 48K |

The follow-ups fix the vague call and text that became a contact lookup, "Open a new
tab" (a stalled request on the merged run), find-in-page, and a text with a Calendar
event. "Open example.com" proposed `open_view` once in place of the browser open (one
run; the tool list was the same as the merged run's). A text and an alarm, and a photo
and a text, still propose only the first operation.

The follow-ups' requests are not smaller: more of the run's proposals were made and
then rejected, so the recorded outcomes of earlier requests grew (proposal end states
4.8K to 8.5K characters per Stage 1 call, effect receipts 3.2K to 4.7K). That is the
text the one-line outcome rendering under review folds, one line per outcome. On the
merged run, 48 of 49 Stage 1 requests carried the resident's "needs attention" notice
rows (the rig has no embedding provider); the follow-ups keep those out of prompt
history.

### Output caps of 4,096 cut off reasoning

The personal assistant plans a reminder with a separate large text call (core
`runExtractorPipeline` from `extract-task-plan.ts`). It is sent with reasoning on, and
under the 4,096 cap the model used all of it reasoning and wrote nothing
(`finishReason: length`, 4,096 completion tokens, 4,096 of them reasoning). On the
merged run "Remind me to call mom at 5pm" replied that it "ran into a hiccup". On the
follow-ups run "Remind me to take out the trash before bed, at 10pm" was retried by
the planner three times in one turn, each attempt cut off, and replied "It's not
saved" after 24 seconds and 153K input tokens. A call cut off this way writes no usage
row, so earlier logs cannot show how often it happened. Before revision 7 the eval
scored these turns as passes.

Creating a workflow fails the same way. Its authoring call (`WORKFLOW`, one large text
call per attempt) sends no output limit of its own and reasons at "high", so on a phone
launched with the caps `TEXT_LARGE_MAX_TOKENS=4096` is its only limit. On the pinned
prompt, sent straight to the provider, 10 of 10 capped calls stopped at the limit with
nothing written, and the turn replied with a failure. Uncapped, 10 of 10 finished in
5.6K to 11.7K tokens (4 to 8 s), and every draft passed the workflow's own parse and
TypeScript checks. A cap of 8,192 still cut off 2 of 5. On the Pixel's v618 build
(caps of 4,096) "create a workflow called Alpha device test" failed on both tries. A
cut-off shows in the turn's trajectory record (`finishReason: length`), not in the
agent log.

The owner's decision is that there is no 4,096 cap: output may use the model's maximum
and input its context window. The phone now launches with no output cap on any call (the
five `*_MAX_TOKENS` lines are gone from `AlphaLocalAgentPlugin.java`): a call that sends
none may write 40,960 tokens and holds the same as an explicit 40,960. The planner's
upstream default of 8,192 stays until the runtime accepts `ELIZA_PLANNER_MAX_TOKENS=model`
(a follow-up change); no recorded planner call wrote more than 301 tokens. What each policy costs, on the Pixel's own turns of
November 19 and 20 replayed through the branch (Stage 1 and the first planner call of
158 turns at the phone's real spacing; a host replay, nothing sent):

| Output cap on Stage 1 and the planner | Lowest allowance, 1 phone | 2 phones | 3 phones |
| --- | --- | --- | --- |
| 4,096 | 92K | 64K | 45K |
| None sent, or the model's 40,960 | 80K | 52K | 33K |

No call of these replays starts without enough allowance under either policy, even with
three phones. A cap costs allowance only while its call runs: the model's maximum holds
12,288 more per running call than 4,096, and nothing more is charged unless more is
written. On the recorded synthetic conversations, which send turns every 5 to 10
seconds, one phone never runs short either way, while two or three phones on one key
run short under every policy: there the uncached input alone exceeds the refill, and
the output cap changes the count of short calls by 1% to 4%.

### No output cap, merged and follow-ups

The same one-conversation run (46 turns, 5 s apart, case set revision 8, which fails a
reply that says a create did not take effect), with and without the 4,096 caps. "No
cap" sends none on Stage 1, the evaluator and the side calls; the planner sends its
runtime default of 8,192. Follow-ups are upstream `b943a738c5`: the earlier follow-ups
plus the Cloud refusal change, the Stage 1 re-send after a `parser_error` and minute
stamps.

| | Merged, 4,096 | Merged, no cap | Follow-ups, 4,096 | Follow-ups, no cap |
| --- | --- | --- | --- | --- |
| Cases passing | 38 of 46 | 38 of 46 | 42 of 46 | 42 of 46 |
| Calls cut off at the cap | 1 | 0 | 3 (one turn) | 0 |
| Reminders saved | 2 of 3 | 0 of 3 (refused) | 2 of 3 | 3 of 3 |
| Provider refusals | 0 | 16 | 0 | 0 |
| Planner input, median and p90 | 18K, 34K | 23K, 36K | 20K, 30K | 19K, 23K |
| Uncached tokens charged in any 60 s, p90 | 183K | 234K | 185K | 165K |
| Lowest allowance once a call holds its share | 50K | -35K | 48K | 68K |

The merged runtime is close to the limit at this pace even with caps: its planner
requests carry tools guessed from the request. Without caps each running call holds
12,288 more and it ran short on its own: the audit of its own calls agrees with the
refusals. The follow-ups send smaller planner requests and stay clear without caps.
At the Pixel's real spacing both fit either way (section 1). So the cap removal
belongs with the follow-ups.

The follow-up tip `516c7e8a56` (adds the planner's `model` value, the parser re-send,
the idle limit, reminder planning at low reasoning and every review proposal of one
reply recorded), same run, no cap: 43 of 46, device requests 30 of 31; text plus alarm
now proposes both. Input per turn is the same (34K median), but turns are faster
(median 2.6 s against 3.9 s; the reminder's planning call 1.1 s against 6.4 s), so at a
fixed 5-second pause the same tokens land in less time: uncached tokens in any 60 s rose
to 149K median and the run was refused 12 times; two reminders failed when the planning
call itself was refused, which a side call did not re-send (`d0fac57d11` now re-sends an
extractor call once after a refusal).

The tip with that re-send, `d0fac57d11`, and a control run of `516c7e8a56`, back to back
on November 21 with the key to themselves:

| | `516c7e8a56` (control) | `d0fac57d11` |
| --- | --- | --- |
| Cases passing | 42 of 46 | 40 of 46 |
| Provider refusals | 0 | 5, all at turns 10 to 12, each with a 60 s wait |
| Input, cached share | 1.61M, 50% | 1.58M, 42% |
| Output | 16.7K | 18.4K |
| Median turn | 2.9 s | 2.8 s |

Two of the tip's failures are those refusals: the reminder's extractor was refused, re-sent
and refused again inside the same 60-second window, and a text with a Calendar event lost
its reply. The others move between runs of one arm (reading a number from notes, a timer,
a new tab). Output is about 1% of all tokens in every run: input is the lever.

### Recorded outcomes without ids and times

Upstream `1627967c86` prints recorded outcomes in the same record format without the
fields no later step reads (request and receipt UUIDs, the redacted idempotency key, ISO
times, resource versions), names each request by its history key, keeps the legend fixed
and folds a proposal's later state into its row. `6cc102a735` then says each legend rule
once. Same run on November 21, the first two back to back:

| | `d0fac57d11` | `1627967c86` | `6cc102a735` |
| --- | --- | --- | --- |
| Cases passing | 42 of 46 | 44 of 46 | 44 of 46 |
| Provider refusals | 0 | 0 | 0 |
| Input | 1.61M | 1.20M | 1.13M |
| Charged: uncached input plus output | 894K | 579K | 528K |
| Provider's cached share | 46% | 54% | 55% |
| Input per turn, median and p90 | 33K, 64K | 24K, 40K | 23K, 32K |
| Stage 1, planner, evaluator median | 12.5K, 18.0K, 14.2K | 8.4K, 14.8K, 8.3K | 8.3K, 14.6K, 8.6K |
| Output | 17K | 24K | 17K |
| Median turn | 3.1 s | 2.6 s | 2.3 s |

Charged tokens fall by 41%. On synthetic rows the planner routed as well as before (19
of 20 in both forms, then 19 against 17 for the shorter legend), and a line in another
person's text in the form's own record format misled the model no more often than
today's (6 of 10 against 8 of 10; 1 of 5 against 4 of 5 for the shorter legend). A room
with one record is now below the old form in provider tokens (532 against 589). The keys
are positions in the dialogue window, so rows stay append-only only inside it (100
messages by default).

### The phone's decode mode

On the Cloud route planner tools go out non-strict with their schemas as written; every
whole-turn run here used the direct route, which sends them strict, rewritten and
wrapped in one `arguments` object. The 39 routing requests in the four forms, live,
three runs of the phone's form and the direct form:

| | Phone's form | Direct form |
| --- | --- | --- |
| Expected operation proposed | 104 of 117 | 107 of 117 |
| Device requests routed right | 100 of 105 | 101 of 105 |
| Operation object failing its schema | 5 of 117 | 0 of 117 |
| Prompt tokens per request | 9,671 | 9,783 |

Routing is the same within noise. The phone's form produced an operation that fails its
schema in about 4% of answers (a rejected call and a planner retry on the phone); the
strict forms never did. Strict costs about 110 tokens more per request.

## 3. What a change must show

- The audit on a phone running the change: input per turn, the allowance left and the
  provider's cached share. No figure in this runbook comes from a phone running the
  branch.
- The eval on the same resident before and after, in Android mode: no family's pass
  rate lower.
- On a long conversation: a request that depends on something older than the inline
  history ("text her the same thing as last week") still resolves, by recall or by a
  history read.
- No tool definition that differs between two turns of a conversation in one view: in
  the audit, the same digest for the same tool name.

### Follow-ups after the merge

Upstream branch `claude/agent-context-followups` (local, on upstream develop
`0fc3586dce`), each change reviewed by an independent verifier before it was committed:

| Change | What it fixes | Measured |
| --- | --- | --- |
| History window kept when a message or outcome lands mid-turn; failure notices out of prompt history | Planner and evaluator calls that carried the whole room | 580-message room: planner request 374K to 53K characters |
| Calendar details described once | Repeated descriptions on alternate spellings | CALENDAR 21.5K to 19.4K characters |
| Role-word contact query | "Ping my brother" becoming a contact lookup | Lookups first 0 of 15 (3 of 8 recorded before) |
| Constant evaluator schema, no planner routing text | Evaluator bytes changing every turn | One request: 3,072 to 17,408 of 17.5K reused |
| Guessed tools left behind tool search on device turns | Tool lists changing every turn | 9.4 to 6.2 tools per request, definitions down 26% |
| Typed Cloud refusal, canonical form for a product Cloud | Up to ten uploads per refused step | One upload per refusal |
| Stage 1 re-send on `parser_error`; cut-off Stage 1 replies "cut off" | "I hit a snag" after a cut-off reasoning call | Re-send answered 20 of 20 |
| Minute stamps | 25 tokens per stamp | 4% at Stage 1 and the planner, 9% at the evaluator |
| `ELIZA_PLANNER_MAX_TOKENS=model`; no re-call after a model-maximum stop | The planner's 8,192 default; three retries of a cut-off | |
| Streamed idle limit (60 s) on the direct route; `parser_error` never transient | A silent re-send waiting for the 180 s deadline | |
| Reminder planning at low reasoning, both routes | Reasoning at "high" by default | Correct 36 of 40 against 21 of 25; about two thirds fewer output tokens |
| Every review proposal of one reply recorded | Text plus alarm proposing only the text | Both calls in the first reply 10 of 10 |
| Extractor call re-sent once after a refusal (wait hint up to 5 s) | A reminder lost when its planning call was refused | |
| Recorded outcomes without unread ids and times; legend rules said once | UUIDs and ISO times at about a token per digit | Whole turn: charged tokens 894K to 528K, 44 of 46 |

Parked after ten rounds: a compact one-line rendering of recorded outcomes. It made
requests with recorded outcomes 20% to 30% smaller (one probe 17.2K to 12.0K tokens), but
a line in another person's text shaped like a record misled the model. A secret per-room
marker on the runtime's own lines helped (forged lines: 0 of 65 false "sent" claims
against 9 of 65 for today's form) but did not close it. A forged line with a wrong or
stale marker still misled the model in 3 of 5 runs, against 5 of 5 for a forgery of
today's format. Keeping the marker secret meant stripping it from every outgoing path
or rotating it on every leak, and each round found another way out. The patch and the
round reports are kept in the work cache (`parked/outcome-lines-v10`). Today's record
format with the unread fields dropped (section 2) took most of the saving instead and
adds no new shape to forge.

Dropped: narrowing a reminder's retrieval to the reminder tools when Stage 1 names a
reminder operation. It would cut a time-clause reminder's tool definitions from about
100K to 24K characters, but four rounds of rules (word lists, then allow-lists of
moments and asides) each dropped a second tool the owner asked for in some wording: the
last, in 447 of about 3,600 adversarial decisions (a run-on second request with a verb
outside its lists, a misspelt verb, no verb, or a joiner typo such as "an"). A safe version would need to recognise the reminder's own
words, not exclude other verbs.

## 4. Known and open

- **No phone measurement yet.** The first changes are merged (upstream
  `6e2a094775`, product `983f47b18e`); everything above is a host measurement until a
  build on a phone is audited.
- **Fixed upstream on develop, not yet on a phone pin:** a photo and a text in one
  request now get a card each (`c1590fda6f`, `1a28b1578b`; only a request that is
  nothing but a photo opens the camera without a card, and the Phone, Messages and
  Contacts screens still hold one card at a time). The Cloud route carries a provider
  400's `code`, `param` and provider message (`f60b554307`, `c962ce990d`), so the Stage 1
  re-send after a `parser_error` applies there too. A calendar delete or move whose
  target lookup Stage 1 bound as a requested search no longer replies "I couldn't look
  up that event" (`b9c462d368`).
- **Tools chosen per request sit before the system prompt** in the provider's read
  order: Calendar (18K characters), reminders (20K), messaging (13K). A turn whose tool
  set differs from the last one's re-reads the system prompt and the history. In the
  one-conversation run the planner reused 51% for that reason.
- **The account's limit is close even after the change.** In one conversation that
  changes subject every turn, a phone on the branch is charged about 14K uncached tokens
  a turn, and the account regains 2,500 a second. One phone sending a turn every nine
  seconds uses about two thirds of that; the base used more than all of it. A
  conversation that stays on a subject reuses more (70% to 78% in the replays of the
  Pixel's own).
- **Recall is lexical** and standing instructions older than the window survive only
  by an English keyword floor (section 1).
- **The device tool still differs by view,** and by two wordings: asking for an
  address in a new tab, and naming the phone's own calendar.
- **Re-sends stack on the direct route.** After a refusal with no wait hint (the
  provider's "high traffic" 429) the OpenAI plugin's own retries and the turn's re-send
  multiply: 4 and then 4 more requests for one step on the generate lane in a November 20
  resident run (16 of its 22 refusals had no hint). The stream lanes' budget allows 12
  (loopback, not seen live). The no-cap runs' refusals all carried `Retry-After: 60`
  and were each sent once. A refused request is not charged, so this costs time and
  request count, not tokens.

