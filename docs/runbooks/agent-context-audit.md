# Measuring what the phone's agent sends its text model

Updated November 18, 2026. The resident agent's text model is `qwen-3.8-27b` on
Cerebras, reached through Eliza Cloud or the owner's own key. Cerebras admits a
request against two per-minute token limits for the whole account: 150K tokens that
missed its prompt cache and 750K in total. A request reserves its output cap before it
runs, and tokens served from the prompt cache do not count against the first limit.

Measured on that model with `scripts/agent-cache-probe.ts`, and different from its
documentation: the cache reuses a request's leading text in units of 1,024 tokens, and
reads it as tool definitions, then the system prompt, then the messages. One changed
byte in a tool definition makes the rest of the request a miss.

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
tokens, the uncached and total tokens in any 60 seconds against `--uncached-tpm` and
`--total-tpm` (default 150K and 750K), and the turns in which this phone alone goes
over one. `--reserve planner=8192` counts an output cap for a stage whose calls record
none.

Where a call carries the provider's own counts, those are used, and the rule-derived
cached count is shown beside the provider's. A runtime that records them also stores
each tool definition's name, size and digest and the output cap. Older runtimes store
messages only: token counts are estimates, cached tokens are what the measured rules
give for the recorded text, and tool definitions (about 14K characters for Stage 1 and
26K to 29K for the device tool on a planner call) are not counted or compared.

Run the probe again when the provider or model changes. It sends about 20 synthetic
requests and fails if the unit or the order no longer match what the audit assumes:

```sh
bun scripts/agent-cache-probe.ts
```

### Baseline, Pixel, November 18, 2026

One conversation of 283 messages; 323 model calls in 129 turns that day; runtime pin
`f17ac0ccc45`, Eliza Cloud route. Estimated from recorded messages; tool definitions
were not recorded.

| Measure | Value |
| --- | --- |
| Stage 1 input per call | 21K tokens median, 34K maximum |
| Planner input per call | 17K median, 37K maximum |
| Evaluator input per call | 9K median, 27K maximum |
| Input per turn | 34K median, 79K at the 90th percentile, 158K maximum |
| Share of a Stage 1 request already sent by the previous one | 6% |
| Tokens the cache rules give as reused | 14% (Stage 1 2%, planner 22%, evaluator 38%) |
| Uncached tokens in any 60 seconds | 56K median, 126K at the 90th percentile, 196K maximum |
| Turns in which this phone alone exceeds 150K uncached per minute | 7 of 129 |
| Turns that ended in HTTP 429, one 38-turn log | 12 |

Three causes:

- **No history limit.** Every call carried the conversation's whole lifetime and a
  receipt for every past action, about three quarters of a Stage 1 request. The
  reviewer that thins history does not run on a phone.
- **A fresh reference every turn.** Each phone number and credential was sent under a
  new reference on every turn, and the system prompt ended in a list of them.
- **Tool definitions that changed every turn.** The device tool documents its number
  format with an example, and the example was rewritten as one of those references. The
  provider reads tools first, so on every planner call it read the rest of the request
  again.

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
each turn that planned on the phone (205 requests for the 128 turns of November 18).
The harness loads none of the phone's apps, so the device tool and the phone's Stage 1
fields are counted at their recorded sizes, and the view and capability text the phone
adds after the history is absent.

| Measure | Pin | Branch, references not stable | Branch, stable references |
| --- | --- | --- | --- |
| Stage 1 input per call | 18.5K median, 28.9K max | 10.8K, 13.1K | 10.8K, 13.1K |
| Planner input per call | 21.5K median, 34.8K max | 15.6K, 19.0K | 15.7K, 19.1K |
| Input per turn | 27.4K median, 56.1K p90 | 21.0K, 29.4K | 21.2K, 29.5K |
| All input | 4.07M | 2.51M | 2.52M |
| Tokens reused by the rules | 9% | 45% | 76% |
| Uncached tokens in any 60 seconds | 40K median, 101K p90, 168K max | 16K, 36K, 56K | 7K, 17K, 30K |

On the phone the device tool differed between consecutive planner turns about one time
in eight, when the view changed. With that, the last column reads 70% reused and 7K,
24K, 35K.

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
| Window, first notice wording | 39 of 40 | 30 of 40 |
| Notice says to read before denying or promising to check | 40 of 40 | 35 of 40 |
| Plus exchanges recalled by the request's distinctive words, and search by words | 80 of 80 | 78 of 80 |

Before the last step the model had to notice the gap and read. It sometimes replied
that it had no record, and three of five of its searches ("cabin wifi password")
matched nothing literally. With recall the answer usually comes in one model call and
fewer tokens than the whole history. The requests that need nothing earlier caused no
extra read in any row. The standing instruction ("end every reply with Noted") was
followed in about half the runs with the whole history and with the window alike.

On the phone's conversation recall adds messages on 5 of 125 windowed turns and lowers
reuse by about one point.

### The device tool

The device tool is about 7K tokens on every planner call that carries it. Three smaller
forms were measured on the replay, and the first also on the model:

| Device tool on a planner call | All input | Planner tokens reused | Uncached in any 60 s (median, p90, max) |
| --- | --- | --- | --- |
| Per view, same every turn (28.8K characters) | 2.52M | 78% | 7K, 17K, 30K |
| Per view, changing on one turn in eight (the phone today) | 2.52M | 66% | 7K, 24K, 35K |
| Duplication removed (21.8K), changing on one turn in eight | 2.38M | 64% | 8K, 22K, 32K |
| One tool for every view (41.6K), never changing | 2.77M | 80% | 7K, 18K, 33K |
| Operations chosen per request (14.4K), differing on half the turns | 2.24M | 35% | 12K, 22K, 41K |
| One tool per family (6.5K), differing on half the turns | 2.09M | 33% | 11K, 20K, 38K |

A tool chosen per request sends fewer tokens and more of them uncached, and the
uncached limit is the one a phone reaches. Once the tool is cached, making it shorter
saves little against that limit. With duplication removed, 168 of 175 device requests
were routed correctly on the model against 170 of 175 for the whole tool. None of
these forms is in the runtime.

### Routing on the model, before and after

39 phone requests, each rendered as the planner's request at the pin and on the branch
in the order and bytes each sends, were put to the model five times, interleaved. A
request passes when the device operation it calls is the expected one.

| | Pin | Branch |
| --- | --- | --- |
| Device requests routed correctly | 169 of 175 | 170 of 175 |
| Every operation of a two-step request | 162 of 175 | 163 of 175 |

"Ping my brother" fails in both: the model calls where a text is expected. This covers
the planner step with the device tool only. Other apps' tools, the evaluator and a
whole turn on a phone are not covered.

## 2. Compare action routing before and after a change

`scripts/eval-phone-actions.ts` sends 36 fixed requests to a loopback resident that has
a hosted model, as an enrolled synthetic Alpha-image phone, and scores which device
operation each turn proposes. Every proposal is rejected at once; nothing runs.

```sh
bun run dev    # or another loopback resident with a provider key
bun scripts/eval-phone-actions.ts --origin http://127.0.0.1:47849 --token-file <owner token file> \
  --output test-results/phone-actions.json --runs 3 --pause-ms 4000 \
  --database ~/.local/share/alphaphone/<profile>/.eliza/workspace/.elizadb
```

Run it on the base revision and on the change, with the same case-set revision and
profile. Compare `passRate`, `byFamily`, `failingCases` and, with `--database`, the
tokens the run used. Cases that pass on some runs and fail on others are listed as
unstable; settle those before reading a difference. A pass covers device proposals
only: it does not judge reply wording, Maps, Notes or Calendar record actions, or a
real phone.

The requests made from another app's screen ("Ring the dentist for me" in Maps) are
the ones a narrower tool surface loses first.

## 3. What a change must show

- The audit on a phone running the change: input per turn, the uncached tokens in any
  60 seconds and the provider's cached share. No figure in this runbook comes from a
  phone running the branch.
- The eval on the same resident before and after: no family's pass rate lower.
- On a long conversation: a request that depends on something older than the inline
  history ("text her the same thing as last week") still resolves, by recall or by a
  history read.
- No tool definition that differs between two turns of a conversation: in the audit,
  the same digest for the same tool name.
