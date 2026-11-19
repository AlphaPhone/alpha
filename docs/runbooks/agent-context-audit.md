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

Runtimes from the pin that records provider usage also store the provider's own
counts, the tool definitions' sizes and the output cap. The report then uses those
counts and prints the measured cache hit rate. Older runtimes store messages only:
token counts are estimates, and tool definitions (about 14K characters for Stage 1 and
up to 41.6K for the device tool on a planner call) are not included.

### Baseline, Pixel, November 17 to 18, 2026

One conversation of 283 messages, 146 turns, runtime pin `f17ac0ccc45`, Eliza Cloud
route. Estimated from recorded messages; tool definitions excluded.

| Measure | Value |
| --- | --- |
| Stage 1 input per call, last day | 26K tokens median, 34K maximum |
| Planner input per call, last day | 26K median, 37K maximum |
| Input per turn | 38K median, 79K at the 90th percentile, 154K maximum |
| Input in any 60 seconds | 79K median, 214K maximum |
| Share of a Stage 1 request already sent by the previous one | 6% |
| Turns that ended in HTTP 429, one 38-turn log | 12 |

History caused it. Every call carried the conversation's whole lifetime and a receipt
for every past action (about 65% of each request), and a fresh reference for each
phone number and credential on every turn left nothing for the provider's cache to
match.

### The same conversation replayed with a history window

A host replay, not a phone result. The recorded conversation was rendered turn by turn
through the upstream Stage 1 renderer, once whole and once with the history window that
upstream branch `claude/agent-context-budget` adds for hosts where no history reviewer
runs. The figures cover the Stage 1 user message only: no system prompt, no tool
definitions, no planner or evaluator, and no reference substitution.

| Measure | Whole history | With the window |
| --- | --- | --- |
| Last turn (272 earlier messages) | 29.7K tokens | 5.5K |
| Average over the 115 turns with 60 or more earlier messages | 18.2K | 5.6K |
| Largest turn | 29.7K | 8.1K |
| All 144 turns | 2.17M | 0.71M |
| Share of a turn's text the previous turn already sent | 67% | 69% |

The last row is not comparable with the 6% in the baseline, which includes the changing
references. With the window, about 6 turns in 10 still stop matching in the receipt
tables, which sit before the transcript and change whenever an action adds a row.

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
