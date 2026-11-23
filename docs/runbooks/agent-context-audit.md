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
  cached or not, estimated about a quarter high, plus its output cap; a request that
  sends no cap holds 16,384 for the output. It is refused (HTTP 429) when the allowance
  left is smaller than that. When it finishes it gives the hold back and is charged the
  input that missed the cache plus its output. Cached input is never charged.
- **A refusal asks for a longer wait than is needed.** It carries `Retry-After: 59`.
  Three requests of 36K tokens refused together and re-sent each second were admitted
  5, 14 and 27 seconds later, as the allowance refilled. A refused request is not
  charged.
- **The cache reuses a request's leading text in units of 1,024 tokens**, read as tool
  definitions, then the system prompt, then the messages. One changed byte in a tool
  definition makes the rest of the request a miss.

So three things cost allowance: input that misses the cache, the size of a request while
it runs, and a missing output cap. Output itself is small, about 2% of a turn's input.

This runbook covers host tools. None is an APK, emulator, image or device acceptance
result.

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
request of the same stage, within `--cache-minutes` (default 5), already contained;
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
540. What output costs is its cap, which a call holds while it runs: 4,096 with the
phone's settings, 16,384 without one.

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

## 4. Known and open

- **No phone has run the branch.** Everything above is a host measurement. Real
  numbers need the upstream changes merged, the pin advanced and a build on a phone.
- **A text and an alarm in one request proposes only the text.** The planner's first
  reply usually holds both calls; the turn stops at the first approval pause with the
  second still queued.
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

