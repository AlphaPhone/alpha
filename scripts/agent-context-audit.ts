#!/usr/bin/env bun
/**
 * Reports what a phone's resident agent sent to its text model, from a copy of the
 * on-device database (`files/.eliza/workspace/.elizadb`). It measures recorded requests;
 * it does not call a model and proves nothing about replies or action choice.
 *
 *   bun scripts/agent-context-audit.ts <copied .elizadb> [--since <ISO time>] [--tpm <limit>]
 *       [--cache-minutes <n>] [--json <file>] [--show-text]
 *
 * Token counts are estimates (see estimateTokens) unless the recorded call carries the
 * provider's own usage. Runtimes before the usage record store the messages only: no
 * tool schemas, no output cap and no provider counts, so those figures are lower bounds.
 */
import type { PGliteOptions } from '@electric-sql/pglite';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type RecordedCall = {
  id: string;
  type: string;
  at: number;
  room: string;
  runId: string;
  ms: number;
  system: string;
  prompt: string;
  /** Tool schemas sent with the call, by size. Absent on runtimes that do not record them. */
  tools?: { name: string; chars: number }[];
  maxTokens?: number;
  usage?: ProviderUsage;
};
export type ProviderUsage = { input: number; output: number; cached: number };

/**
 * Dependency-free estimate of byte-pair tokens. Fitted on recorded phone calls against a
 * 200k-vocabulary tokenizer: within about 4% per call. Identifiers, hashes and JSON
 * punctuation cost far more tokens per character than prose, which a flat
 * characters-per-token ratio misses by up to 50%.
 */
export function estimateTokens(text: string): number {
  let pieces = 0;
  for (const match of text.matchAll(/[A-Za-z]+|[0-9]+|[^A-Za-z0-9\s]+/g)) {
    const run = match[0];
    const code = run.charCodeAt(0);
    if (code >= 48 && code <= 57) pieces += Math.ceil(run.length / 3);
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) pieces += run.length <= 10 ? 1 : Math.ceil(run.length / 5);
    else pieces += Math.ceil(run.length / 2);
  }
  return Math.round(pieces / 1.1);
}

type Message = { role?: string; content?: unknown; tool_calls?: unknown };
const messagesOf = (prompt: string): Message[] | null => {
  try {
    const parsed = JSON.parse(prompt) as { messages?: Message[] };
    return Array.isArray(parsed.messages) ? parsed.messages : null;
  } catch {
    return null;
  }
};
const contentOf = (message: Message) => (typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? ''));

/** The text the provider tokenizes for a recorded call: system prompt, then each message. */
export function wireText(call: Pick<RecordedCall, 'system' | 'prompt'>): string {
  const messages = messagesOf(call.prompt);
  if (!messages) return `${call.system}\n${call.prompt}`;
  return [call.system, ...messages.map(m => contentOf(m) + (m.tool_calls ? JSON.stringify(m.tool_calls) : ''))].join('\n');
}

/** Which stage of a turn made the call, read from the stage block the runtime writes into the system prompt. */
export function stageOf(call: Pick<RecordedCall, 'type' | 'system'>): string {
  const stage = /\n(evaluator_stage|planner_stage):\ntask: ([^\n]*)/.exec(call.system);
  if (stage) return stage[1] === 'evaluator_stage' ? 'evaluator' : /final reply/i.test(stage[2]) ? 'planner-final-reply' : 'planner';
  if (call.type === 'RESPONSE_HANDLER') return 'stage1';
  return call.type.toLowerCase();
}

const paragraphBucket = (paragraph: string, section: string): string => {
  if (/^runtime:historical_navigation/.test(paragraph)) return 'history: navigation receipts';
  if (/^runtime:historical_effects/.test(paragraph)) return /Authoritative later proposal state/.test(paragraph) ? 'history: proposal end states' : 'history: effect receipts';
  if (/^runtime:historical_observations/.test(paragraph)) return 'history: read receipts';
  if (/^runtime:historical_receipt_encoding/.test(paragraph)) return 'history: receipt legends';
  if (/^runtime:historical_read_continuations/.test(paragraph)) return 'history: read continuations';
  if (/^runtime:interrupted_turn/.test(paragraph)) return 'history: interrupted turns';
  if (/^\[message_at=/.test(paragraph) || /^\[h\d+[;\]]/.test(paragraph)) return 'history: messages';
  if (/^\[[A-Z_]{3,24}\] [[{]/.test(paragraph)) return 'history: message cards';
  if (/^Authenticated phone capabilities/.test(paragraph)) return 'capabilities: phone';
  if (/enabled-view profile/.test(paragraph.slice(0, 160))) return 'capabilities: view profile';
  if (/^current_client_observation/.test(paragraph)) return 'current: client observation';
  return section;
};

const toolChars = (call: Pick<RecordedCall, 'tools'>) => (call.tools ?? []).reduce((total, tool) => total + tool.chars, 0);
/** Tool schemas are JSON: about four characters per token on the phone's device tool. */
const toolTokens = (call: Pick<RecordedCall, 'tools'>) => Math.round(toolChars(call) / 4);

/** Characters of one recorded call by what they carry. Buckets partition the call. */
export function bucketsOf(call: Pick<RecordedCall, 'system' | 'prompt' | 'tools'>): Record<string, number> {
  const buckets: Record<string, number> = {};
  const add = (name: string, size: number) => {
    if (size > 0) buckets[name] = (buckets[name] ?? 0) + size;
  };
  add('system prompt', call.system.length);
  add('tool schemas', toolChars(call));
  const messages = messagesOf(call.prompt);
  if (!messages) {
    add('prompt (unstructured)', call.prompt.length);
    return buckets;
  }
  messages.forEach((message, index) => {
    const content = contentOf(message);
    if (message.role === 'tool') return add('this turn: tool results', content.length);
    if (message.role === 'assistant') return add('this turn: assistant steps', content.length + JSON.stringify(message.tool_calls ?? '').length);
    if (index > 0 && !/(^|\n)# /.test(content)) return add('this turn: runtime follow-ups', content.length);
    const headings = [...content.matchAll(/^# .*$/gm)];
    const parts: [string, string][] = [];
    if (!headings.length || (headings[0].index ?? 0) > 0) parts.push(['', content.slice(0, headings[0]?.index ?? content.length)]);
    headings.forEach((heading, at) => parts.push([heading[0].slice(2).trim(), content.slice(heading.index, headings[at + 1]?.index ?? content.length)]));
    for (const [heading, body] of parts) {
      const section = heading === '' || heading === 'Task' ? 'instructions' : heading === 'Conversation' ? 'history: messages' : `section: ${heading.slice(0, 40)}`;
      for (const paragraph of body.split(/\n\n+/)) add(paragraphBucket(paragraph, section), paragraph.length + 2);
    }
  });
  return buckets;
}

const commonPrefix = (a: string, b: string) => {
  const end = Math.min(a.length, b.length);
  let at = 0;
  while (at < end && a.charCodeAt(at) === b.charCodeAt(at)) at++;
  return at;
};
const quantile = (values: number[], q: number) => (values.length ? [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)] : 0);

export type Audit = ReturnType<typeof audit>;

/**
 * Summarises recorded calls. `cacheMinutes` is how long a provider keeps a prompt prefix:
 * the shareable prefix of a call is its longest common prefix with any call of the same
 * stage inside that window, an upper bound on a prefix cache's hit rate for that text.
 */
export function audit(calls: RecordedCall[], options: { cacheMinutes?: number; tpm?: number } = {}) {
  const cacheMs = (options.cacheMinutes ?? 5) * 60_000;
  const ordered = [...calls].sort((a, b) => a.at - b.at);
  const rows = ordered.map(call => {
    const text = wireText(call);
    return { call, stage: stageOf(call), text, tokens: call.usage?.input ?? estimateTokens(text) + toolTokens(call) };
  });

  const stages: Record<string, { calls: number; tokens: number[]; ms: number; shareable: number; chars: number }> = {};
  const buckets: Record<string, Record<string, number>> = {};
  const breaks: Record<string, { count: number; example: string }> = {};
  rows.forEach((row, index) => {
    const stage = (stages[row.stage] ??= { calls: 0, tokens: [], ms: 0, shareable: 0, chars: 0 });
    stage.calls++;
    stage.tokens.push(row.tokens);
    stage.ms += row.call.ms;
    stage.chars += row.text.length;
    let best = 0;
    let seen = false;
    for (let earlier = index - 1; earlier >= 0 && row.call.at - rows[earlier].call.at <= cacheMs; earlier--) {
      if (rows[earlier].stage !== row.stage) continue;
      seen = true;
      best = Math.max(best, commonPrefix(row.text, rows[earlier].text));
    }
    stage.shareable += best;
    if (seen && best < row.text.length) {
      const where = best <= row.call.system.length ? 'system prompt' : 'messages';
      const before = row.text.slice(Math.max(0, best - 48), best).replace(/\s+/g, ' ');
      const key = `${row.stage}: ${where}, after "${before.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<uuid>').replace(/[0-9a-f]{16,}/g, '<hex>').replace(/\d+/g, 'N').slice(-40)}"`;
      (breaks[key] ??= { count: 0, example: `${before}▮${row.text.slice(best, best + 48).replace(/\s+/g, ' ')}` }).count++;
    }
    const mine = (buckets[row.stage] ??= {});
    for (const [name, size] of Object.entries(bucketsOf(row.call))) mine[name] = (mine[name] ?? 0) + size;
  });

  const turns = new Map<string, { calls: number; tokens: number; shape: string[] }>();
  for (const row of rows) {
    const turn = turns.get(row.call.runId) ?? { calls: 0, tokens: 0, shape: [] };
    turn.calls++;
    turn.tokens += row.tokens;
    turn.shape.push(row.stage);
    turns.set(row.call.runId, turn);
  }
  const shapes: Record<string, number> = {};
  for (const turn of turns.values()) {
    const shape = turn.shape.join(' > ');
    shapes[shape] = (shapes[shape] ?? 0) + 1;
  }

  const windows: number[] = [];
  for (let end = 0, start = 0, sum = 0; end < rows.length; end++) {
    sum += rows[end].tokens;
    while (rows[end].call.at - rows[start].call.at > 60_000) sum -= rows[start++].tokens;
    windows.push(sum);
  }
  const usage = rows.filter(row => row.call.usage);
  const usageTotals = usage.reduce((total, row) => ({ input: total.input + row.call.usage!.input, output: total.output + row.call.usage!.output, cached: total.cached + row.call.usage!.cached }), { input: 0, output: 0, cached: 0 });

  return {
    calls: rows.length,
    from: rows.length ? new Date(rows[0].call.at).toISOString() : null,
    to: rows.length ? new Date(rows[rows.length - 1].call.at).toISOString() : null,
    inputTokens: rows.reduce((total, row) => total + row.tokens, 0),
    toolSchemasRecorded: rows.filter(row => row.call.tools).length,
    largestTools: Object.entries(rows.reduce<Record<string, { calls: number; chars: number }>>((tools, row) => {
      for (const tool of row.call.tools ?? []) {
        const entry = (tools[tool.name] ??= { calls: 0, chars: 0 });
        entry.calls++;
        entry.chars = Math.max(entry.chars, tool.chars);
      }
      return tools;
    }, {})).sort((a, b) => b[1].chars * b[1].calls - a[1].chars * a[1].calls).slice(0, 8).map(([name, tool]) => ({ name, ...tool })),
    outputCaps: rows.reduce<Record<string, number>>((caps, row) => {
      const key = `${row.stage}: ${row.call.maxTokens ?? 'none'}`;
      caps[key] = (caps[key] ?? 0) + 1;
      return caps;
    }, {}),
    providerUsage: usage.length ? { calls: usage.length, ...usageTotals, cacheHitRate: usageTotals.input ? usageTotals.cached / usageTotals.input : 0 } : null,
    stages: Object.fromEntries(Object.entries(stages).map(([name, stage]) => [name, {
      calls: stage.calls,
      tokensP50: quantile(stage.tokens, 0.5),
      tokensP90: quantile(stage.tokens, 0.9),
      tokensMax: quantile(stage.tokens, 1),
      tokensTotal: stage.tokens.reduce((a, b) => a + b, 0),
      averageMs: Math.round(stage.ms / stage.calls),
      shareablePrefix: stage.chars ? stage.shareable / stage.chars : 0,
    }])),
    turns: {
      count: turns.size,
      callsP50: quantile([...turns.values()].map(t => t.calls), 0.5),
      callsP90: quantile([...turns.values()].map(t => t.calls), 0.9),
      callsMax: quantile([...turns.values()].map(t => t.calls), 1),
      tokensP50: quantile([...turns.values()].map(t => t.tokens), 0.5),
      tokensP90: quantile([...turns.values()].map(t => t.tokens), 0.9),
      tokensMax: quantile([...turns.values()].map(t => t.tokens), 1),
      shapes: Object.entries(shapes).sort((a, b) => b[1] - a[1]).slice(0, 12),
    },
    minute: {
      p50: quantile(windows, 0.5),
      p90: quantile(windows, 0.9),
      max: quantile(windows, 1),
      overLimit: options.tpm ? windows.filter(sum => sum > options.tpm!).length / Math.max(1, windows.length) : null,
    },
    buckets: Object.fromEntries(Object.entries(buckets).map(([stage, sizes]) => {
      const total = Object.values(sizes).reduce((a, b) => a + b, 0);
      return [stage, Object.entries(sizes).sort((a, b) => b[1] - a[1]).map(([name, size]) => ({ name, share: size / total, charsPerCall: Math.round(size / stages[stage].calls) }))];
    })),
    prefixBreaks: Object.entries(breaks).sort((a, b) => b[1].count - a[1].count).slice(0, 12).map(([where, value]) => ({ where, ...value })),
  };
}

const readUsage = (body: Record<string, unknown>): ProviderUsage | undefined => {
  const raw = (body.usage ?? (body.response as { usage?: unknown } | undefined)?.usage) as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return undefined;
  const number = (...keys: string[]) => {
    for (const key of keys) if (typeof raw[key] === 'number') return raw[key] as number;
    return undefined;
  };
  const input = number('promptTokens', 'prompt_tokens', 'inputTokens', 'input_tokens');
  if (input === undefined) return undefined;
  const details = (raw.prompt_tokens_details ?? raw.promptTokensDetails) as Record<string, unknown> | undefined;
  const cached = number('cachedInputTokens', 'cachedTokens', 'cached_tokens', 'cacheReadInputTokens', 'cache_read_input_tokens')
    ?? (typeof details?.cached_tokens === 'number' ? details.cached_tokens : typeof details?.cachedTokens === 'number' ? details.cachedTokens : 0);
  return { input, output: number('completionTokens', 'completion_tokens', 'outputTokens', 'output_tokens') ?? 0, cached };
};

/** Reads recorded text-model calls from a private copy of the database directory, never the original. */
export async function loadCalls(databaseDirectory: string): Promise<RecordedCall[]> {
  const scratch = mkdtempSync(join(tmpdir(), 'alpha-context-audit-'));
  try {
    const copy = join(scratch, 'db');
    cpSync(databaseDirectory, copy, { recursive: true });
    for (const stale of ['postmaster.pid', 'eliza-pglite.lock']) rmSync(join(copy, stale), { force: true });
    const { PGlite } = await import('@electric-sql/pglite');
    type Extensions = NonNullable<PGliteOptions['extensions']>;
    const extensions: Extensions = { vector: (await import('@electric-sql/pglite/vector')).vector };
    for (const name of ['fuzzystrmatch', 'pg_trgm']) {
      try {
        extensions[name] = ((await import(`@electric-sql/pglite/contrib/${name}`)) as Extensions)[name];
      } catch {
        // The copy opens without an extension the build did not create.
      }
    }
    const database = await PGlite.create({ dataDir: copy, extensions });
    try {
      const result = await database.query<{ id: string; type: string; created_at: Date | string; room_id: string; body: Record<string, unknown> }>(
        "select id, type, created_at, room_id, body from logs where type like 'useModel:%' and type <> 'useModel:TEXT_EMBEDDING' order by created_at asc",
      );
      return result.rows.map(row => ({
        id: row.id,
        type: row.type.slice('useModel:'.length),
        at: new Date(row.created_at).getTime(),
        room: row.room_id,
        runId: typeof row.body.runId === 'string' && row.body.runId ? row.body.runId : row.id,
        ms: typeof row.body.executionTime === 'number' ? Math.round(row.body.executionTime) : 0,
        system: typeof row.body.systemPrompt === 'string' ? row.body.systemPrompt : '',
        prompt: typeof row.body.prompt === 'string' ? row.body.prompt : JSON.stringify(row.body.prompt ?? ''),
        tools: Array.isArray(row.body.tools)
          ? (row.body.tools as unknown[]).flatMap(tool => {
            const entry = tool as { name?: unknown; chars?: unknown };
            return typeof entry?.name === 'string' && typeof entry.chars === 'number' ? [{ name: entry.name, chars: entry.chars }] : [];
          })
          : undefined,
        maxTokens: typeof row.body.maxTokens === 'number' ? row.body.maxTokens : undefined,
        usage: readUsage(row.body),
      }));
    } finally {
      await database.close();
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const percent = (value: number) => `${(100 * value).toFixed(1)}%`;

export function renderReport(result: Audit, options: { tpm?: number; showText?: boolean } = {}): string {
  const lines: string[] = [];
  lines.push(`Recorded text-model calls: ${result.calls} (${result.from ?? '-'} to ${result.to ?? '-'})`);
  lines.push(`Input tokens, ${result.providerUsage ? 'provider-reported where recorded, otherwise estimated' : 'estimated'}: ${result.inputTokens}`);
  if (result.toolSchemasRecorded < result.calls) lines.push(`Tool schemas are recorded on ${result.toolSchemasRecorded} of ${result.calls} calls; the others are undercounted.`);
  if (result.providerUsage) lines.push(`Provider usage on ${result.providerUsage.calls} calls: input ${result.providerUsage.input}, cached ${result.providerUsage.cached} (${percent(result.providerUsage.cacheHitRate)}), output ${result.providerUsage.output}`);
  lines.push('', 'Per stage              calls   p50 tok   p90 tok   max tok   share   avg ms   shareable prefix');
  for (const [name, stage] of Object.entries(result.stages).sort((a, b) => b[1].tokensTotal - a[1].tokensTotal))
    lines.push(`${name.padEnd(22)}${String(stage.calls).padStart(6)}${String(stage.tokensP50).padStart(10)}${String(stage.tokensP90).padStart(10)}${String(stage.tokensMax).padStart(10)}${percent(stage.tokensTotal / Math.max(1, result.inputTokens)).padStart(8)}${String(stage.averageMs).padStart(9)}${percent(stage.shareablePrefix).padStart(12)}`);
  lines.push('', `Turns: ${result.turns.count}; calls per turn p50 ${result.turns.callsP50}, p90 ${result.turns.callsP90}, max ${result.turns.callsMax}`);
  lines.push(`Input tokens per turn: p50 ${result.turns.tokensP50}, p90 ${result.turns.tokensP90}, max ${result.turns.tokensMax}`);
  for (const [shape, count] of result.turns.shapes) lines.push(`${String(count).padStart(6)}  ${shape}`);
  lines.push('', `Input tokens in any 60 s: p50 ${result.minute.p50}, p90 ${result.minute.p90}, max ${result.minute.max}${result.minute.overLimit === null ? '' : `; ${percent(result.minute.overLimit)} of windows exceed ${options.tpm}`}`);
  for (const [stage, sizes] of Object.entries(result.buckets)) {
    lines.push('', `Where ${stage} characters go (average per call)`);
    for (const bucket of sizes.filter(b => b.share >= 0.005)) lines.push(`${String(bucket.charsPerCall).padStart(8)}${percent(bucket.share).padStart(8)}  ${bucket.name}`);
  }
  if (result.largestTools.length) {
    lines.push('', 'Largest tool schemas   calls   chars');
    for (const tool of result.largestTools) lines.push(`${tool.name.padEnd(28).slice(0, 28)}${String(tool.calls).padStart(6)}${String(tool.chars).padStart(8)}`);
  }
  if (result.toolSchemasRecorded) lines.push('', `Output caps sent: ${Object.entries(result.outputCaps).map(([key, count]) => `${key} (${count})`).join(', ')}`);
  lines.push('', 'Where a call stops matching the previous call of its stage');
  for (const item of result.prefixBreaks) lines.push(`${String(item.count).padStart(6)}  ${item.where}${options.showText ? `\n        ${item.example}` : ''}`);
  return lines.join('\n');
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const at = args.indexOf(name);
    return at < 0 ? undefined : args[at + 1];
  };
  const directory = args.find((arg, at) => !arg.startsWith('--') && !args[at - 1]?.startsWith('--'));
  if (!directory) {
    console.error('Usage: bun scripts/agent-context-audit.ts <copied .elizadb> [--since <ISO time>] [--tpm <limit>] [--cache-minutes <n>] [--json <file>] [--show-text]');
    process.exit(2);
  }
  const since = value('--since') ? Date.parse(value('--since')!) : 0;
  const tpm = value('--tpm') ? Number(value('--tpm')) : undefined;
  if (Number.isNaN(since) || (tpm !== undefined && !(tpm > 0))) {
    console.error('Invalid --since or --tpm');
    process.exit(2);
  }
  const calls = (await loadCalls(directory)).filter(call => call.at >= since);
  const result = audit(calls, { cacheMinutes: value('--cache-minutes') ? Number(value('--cache-minutes')) : undefined, tpm });
  if (value('--json')) writeFileSync(value('--json')!, `${JSON.stringify(result, null, 2)}\n`);
  console.log(renderReport(result, { tpm, showText: args.includes('--show-text') }));
}
