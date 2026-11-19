# Measuring what the phone's agent sends its text model

Updated November 18, 2026. The resident agent's text model is `qwen-3.8-27b` on
Cerebras, reached through Eliza Cloud or the owner's own key. Cerebras admits a
request against two per-minute token limits for the whole account: 150K tokens that
missed its prompt cache and 750K in total. A request reserves its output cap before it
runs, and tokens served from the prompt cache do not count against the first limit.
The cache matches a request's leading bytes: system prompt, then tool definitions,
then messages. One changed byte makes everything after it a miss.

This runbook covers two host tools. Neither is an APK, emulator, image or device
acceptance result.

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

It ends with the provider's two limits applied to the recorded requests: the tokens its
prefix cache would reuse (whole 128-token blocks of a prefix that an earlier request,
finished within the cache lifetime, also began with), the uncached and total tokens in
any 60 seconds against `--uncached-tpm` and `--total-tpm` (default 150K and 750K), and
the turns in which this phone alone goes over one. `--reserve planner=8192` counts an
output cap for a stage whose calls record none. This is what the documented rules give
for the recorded text, not a provider measurement.

Runtimes from the pin that records provider usage also store the provider's own
counts, the tool definitions' sizes and the output cap. The report then uses those
counts, prints the measured cache hit rate, and shows the provider's cached tokens
beside the rule-derived ones. Older runtimes store messages only: token counts are
estimates, and tool definitions (about 14K characters for Stage 1 and 26K to 29K for
the device tool on a planner call) are not included.

### Baseline, Pixel, November 18, 2026

One conversation of 283 messages; 323 model calls in 129 turns that day; runtime pin
`f17ac0ccc45`, Eliza Cloud route. Estimated from recorded messages; tool definitions
excluded.

| Measure | Value |
| --- | --- |
| Stage 1 input per call | 21K tokens median, 34K maximum |
| Planner input per call | 17K median, 37K maximum |
| Evaluator input per call | 9K median, 27K maximum |
| Input per turn | 34K median, 79K at the 90th percentile, 158K maximum |
| Share of a Stage 1 request already sent by the previous one | 6% |
| Tokens the provider's cache rules would reuse | 17% (Stage 1 4%, planner 26%, evaluator 42%) |
| Uncached tokens in any 60 seconds | 53K median, 124K at the 90th percentile, 193K maximum |
| Turns in which this phone alone exceeds 150K uncached per minute | 7 of 129 |
| Turns that ended in HTTP 429, one 38-turn log | 12 |

History caused the size: every call carried the conversation's whole lifetime and a
receipt for every past action, about three quarters of a Stage 1 request. The system
prompt caused the cache misses: it ended in a list of fresh references to each phone
number in the request, so every request differed before its tool definitions began.

### The same conversation replayed through the runtime

A host replay, not a phone result. Every turn of the recorded conversation was sent
through the upstream Stage 1 and planner code with a scripted model, then through the
runtime's model dispatch with reference substitution on, and the provider's rules were
applied to the requests that came out. It covers Stage 1 and the first planner call of
each turn that planned on the phone (205 requests for the 128 turns of November 18).
The harness loads none of the phone's apps, so the device tool and the phone's Stage 1
fields are counted as constant sizes, and the view and capability text the phone adds
after the history is absent.

| Measure | Pin `f17ac0ccc45` | History window | Window and stable references |
| --- | --- | --- | --- |
| Stage 1 input per call | 18.6K median, 28.9K max | 10.7K, 13.0K | 10.8K, 13.1K |
| Planner input per call | 21.5K median, 34.7K max | 15.6K, 19.0K | 15.7K, 19.1K |
| Input per turn | 27.5K median, 56.1K p90 | 20.9K, 29.3K | 21.2K, 29.5K |
| All input | 4.07M | 2.50M | 2.52M |
| Tokens the cache rules would reuse | 3% | 23% | 80% |
| Uncached tokens in any 60 seconds | 46K median, 109K p90, 172K max | 23K, 53K, 88K | 5K, 16K, 32K |
| Turns over 150K uncached per minute | 3 | 0 | 0 |

For turns with fewer than 40 earlier messages, which the window leaves alone, the
branch's planner request is byte-identical to the pin's when references are not stable:
same system prompt, same tool definitions, same paragraphs in the same order. Its
Stage 1 request has the same paragraphs in another order and a tool definition without
two fields nothing on a phone reads. Stable references add one line after the newest
user message and the same guidance sentence to every system prompt.

What the replay leaves: on the stable-reference requests, a Stage 1 request re-sends
27% of its text and a planner request 18%. Most of that is one cause. The outcome
tables sit before the transcript, so a turn that records an action re-sends the
transcript after it.

### What the replay says about a smaller device tool

The device tool is about 7K tokens on every planner call that carries it. Tool
definitions sit between the system prompt and the messages in the cached prefix, so a
tool that differs from the previous turn's also makes the messages a miss. The same
replayed requests, with the device tool swapped for three measured prototypes:

| Device tool on a planner call | All input | Planner tokens reused | Uncached in any 60 s (median, p90, max) |
| --- | --- | --- | --- |
| Whole tool, same every turn (today, 28.8K characters) | 2.52M | 82% | 5K, 16K, 32K |
| Whole tool with duplication removed, same every turn (21.8K) | 2.38M | 82% | 5K, 15K, 28K |
| Operations chosen per request (14.4K), differing on half the turns | 2.24M | 45% | 10K, 20K, 37K |
| The same, differing on every turn | 2.24M | 11% | 14K, 26K, 47K |
| One tool per family (6.5K), differing on half the turns | 2.09M | 45% | 9K, 18K, 33K |
| The same, differing on every turn | 2.09M | 14% | 12K, 22K, 42K |

A tool chosen per request sends fewer tokens and more of them uncached, and the
uncached limit is the one a phone reaches. Only the tool that stays the same and gets
shorter improves both. Its wording changes still need the routing eval below before
they ship; none of the three is in the runtime.

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

- The audit on a phone running the change: input per turn, the 60-second maximum and,
  where usage is recorded, the cache hit rate.
- The eval on the same resident before and after: no family's pass rate lower.
- On a long conversation: a request that depends on something older than the inline
  history ("text her the same thing as last week") still resolves, by a history read.
