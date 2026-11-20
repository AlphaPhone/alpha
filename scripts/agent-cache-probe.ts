#!/usr/bin/env bun
/**
 * Measures how the hosted text model treats a request: the size of the unit its prompt
 * cache reuses, the order in which it reads tool definitions, the system prompt and the
 * messages, and how many tokens a request holds against the per-minute limit when it is
 * admitted. scripts/agent-context-audit.ts applies those facts to recorded requests
 * (CEREBRAS_QWEN), so run this again when the provider or the model changes.
 *
 *   bun scripts/agent-cache-probe.ts [--key-file <path>] [--model <id>] [--base <url>]
 *
 * It sends about 25 synthetic requests, roughly 75K tokens in all, with the key in the
 * owner-only file ~/.config/alphaphone/cerebras-key, and takes about two minutes because
 * the admission measurements each start from a refilled limit. Nothing from a phone is
 * sent, and each run marks its requests so an earlier run cannot answer for it.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CEREBRAS_QWEN } from './agent-context-audit.ts';

export type Sample = { prompt: number; cached: number };
export type Part = 'tools' | 'system' | 'messages';

const SENTENCE = 'The quick brown fox jumps over the lazy dog near the quiet river bank while seven small birds circle above. ';

/** The unit of reuse: the largest size every reported cached count is a whole multiple of. */
export function unitOf(samples: Sample[]): number | null {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const cached = samples.map(sample => sample.cached).filter(count => count > 0);
  return cached.length ? cached.reduce(gcd) : null;
}

/**
 * The order the provider reads a request in. `cached` is what it reused when only that
 * part changed, at its first character: nothing from the changed part onwards can match,
 * so the part read first gives the smallest count.
 */
export function orderOf(cached: Record<Part, number>): Part[] | null {
  const order = (Object.keys(cached) as Part[]).sort((a, b) => cached[a] - cached[b]);
  return cached[order[0]] < cached[order[1]] && cached[order[1]] < cached[order[2]] ? order : null;
}

/** What the provider held when it admitted a request, from the rate-limit headers that precede the body. */
export type Admission = { cap: number | null; prompt: number; held: number };

/**
 * The two admission facts the audit uses. A capped request holds its estimated input plus
 * its cap, so the smallest cap gives the input estimate; an uncapped one holds the same
 * input plus a fixed amount.
 */
export function admissionOf(samples: Admission[]): { inputFactor: number; uncappedHold: number } | null {
  const capped = samples.filter((sample): sample is Admission & { cap: number } => sample.cap !== null).sort((a, b) => a.cap - b.cap)[0];
  const uncapped = samples.find(sample => sample.cap === null);
  if (!capped || !uncapped || capped.prompt <= 0) return null;
  const input = capped.held - capped.cap;
  return { inputFactor: input / capped.prompt, uncappedHold: uncapped.held - input };
}

type Body = { model: string; messages: { role: string; content: string }[]; tools?: unknown[]; tool_choice?: string; reasoning_effort: string; max_tokens?: number; stream: boolean; stream_options?: { include_usage: boolean } };

/** One request of about 6,500 tokens: three tools, a system prompt and a user message, each marked. */
export function probeRequest(model: string, marks: Record<Part, string>): Body {
  const tool = (name: string, lead: string) => ({
    type: 'function',
    function: { name, description: `${lead}${SENTENCE.repeat(28)}`, parameters: { type: 'object', properties: { value: { type: 'string', description: SENTENCE } }, required: ['value'] } },
  });
  return {
    model,
    messages: [
      { role: 'system', content: `[${marks.system}] ${SENTENCE.repeat(90)}` },
      { role: 'user', content: `[${marks.messages}] ${SENTENCE.repeat(90)}Say ok.` },
    ],
    tools: [tool('FIRST', `[${marks.tools}] `), tool('SECOND', ''), tool('THIRD', '')],
    tool_choice: 'auto',
    reasoning_effort: 'none',
    max_tokens: 16,
    stream: false,
  };
}

/** A request with no tools whose system prompt is `sentences` long, to find the unit. */
export function sizedRequest(model: string, mark: string, sentences: number): Body {
  return { model, messages: [{ role: 'system', content: `[${mark}] ${SENTENCE.repeat(sentences)}` }, { role: 'user', content: 'Say ok.' }], reasoning_effort: 'none', max_tokens: 8, stream: false };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const at = args.indexOf(name);
    return at < 0 ? undefined : args[at + 1];
  };
  const keyFile = value('--key-file') ?? join(homedir(), '.config/alphaphone/cerebras-key');
  if ((statSync(keyFile).mode & 0o077) !== 0) throw new Error('Provider key must be owner-only');
  const key = readFileSync(keyFile, 'utf8').trim();
  const model = value('--model') ?? 'qwen-3.8-27b';
  const base = (value('--base') ?? 'https://api.cerebras.ai/v1').replace(/\/$/, '');
  const send = async (body: Body): Promise<Sample> => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (response.status === 429 && attempt < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.min(60, Number(response.headers.get('retry-after')) || 5 * (attempt + 1))));
        continue;
      }
      if (!response.ok) throw new Error(`Provider answered ${response.status}`);
      const usage = ((await response.json()) as { usage?: { prompt_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } }).usage;
      return { prompt: usage?.prompt_tokens ?? 0, cached: usage?.prompt_tokens_details?.cached_tokens ?? 0 };
    }
  };
  const pause = () => new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Unit of reuse: the same request sent twice, by length');
  const sized: Sample[] = [];
  for (const sentences of [25, 45, 52, 60, 90, 100, 135]) {
    const body = sizedRequest(model, randomUUID(), sentences);
    await send(body);
    await pause();
    const again = await send(body);
    sized.push(again);
    console.log(`  prompt ${String(again.prompt).padStart(6)}  cached ${String(again.cached).padStart(6)}`);
  }

  console.log('Order of parts: one part changed at its first character');
  const run = randomUUID().slice(0, 8);
  const marks = (changed?: Part): Record<Part, string> => ({ tools: `${run}-t${changed === 'tools' ? 'x' : ''}`, system: `${run}-s${changed === 'system' ? 'x' : ''}`, messages: `${run}-m${changed === 'messages' ? 'x' : ''}` });
  await send(probeRequest(model, marks()));
  await pause();
  const same = await send(probeRequest(model, marks()));
  console.log(`  ${'nothing changed'.padEnd(18)} prompt ${String(same.prompt).padStart(6)}  cached ${String(same.cached).padStart(6)}`);
  const changed = {} as Record<Part, number>;
  for (const part of ['tools', 'system', 'messages'] as const) {
    await pause();
    const sample = await send(probeRequest(model, marks(part)));
    changed[part] = sample.cached;
    sized.push(sample);
    console.log(`  ${`${part} changed`.padEnd(18)} prompt ${String(sample.prompt).padStart(6)}  cached ${String(sample.cached).padStart(6)}`);
  }
  sized.push(same);

  console.log('Held at admission: one fresh request per output cap, each after the limit has refilled');
  const admit = async (cap: number | null): Promise<Admission> => {
    await new Promise(resolve => setTimeout(resolve, 20_000));
    const body: Body = { ...sizedRequest(model, randomUUID(), 40), stream: true, stream_options: { include_usage: true } };
    if (cap === null) delete body.max_tokens;
    else body.max_tokens = cap;
    const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Provider answered ${response.status}`);
    const limit = Number(response.headers.get('x-ratelimit-limit-tokens-minute'));
    const remaining = Number(response.headers.get('x-ratelimit-remaining-tokens-minute'));
    const prompt = Number(/"prompt_tokens":\s*(\d+)/.exec(await response.text())?.[1] ?? 0);
    console.log(`  cap ${String(cap ?? 'none').padStart(5)}  prompt ${String(prompt).padStart(6)}  held ${String(limit - remaining).padStart(6)}`);
    return { cap, prompt, held: limit - remaining };
  };
  const admission = admissionOf([await admit(16), await admit(4096), await admit(null)]);

  const unit = unitOf(sized);
  const order = orderOf(changed);
  console.log(`\nUnit of reuse: ${unit ?? 'not shown (nothing was reused)'} tokens; the audit assumes ${CEREBRAS_QWEN.cacheBlockTokens}`);
  console.log(`Order read: ${order ? order.join(', ') : 'not shown'}; the audit assumes tools, system, messages`);
  console.log(`Held with no cap: ${admission?.uncappedHold ?? 'not shown'} output tokens; the audit assumes ${CEREBRAS_QWEN.uncappedOutputHold}`);
  console.log(`Input held per prompt token: ${admission ? admission.inputFactor.toFixed(2) : 'not shown'}; the audit assumes ${CEREBRAS_QWEN.admissionInputFactor}`);
  const admissionMatches = admission !== null && admission.uncappedHold === CEREBRAS_QWEN.uncappedOutputHold && Math.abs(admission.inputFactor - CEREBRAS_QWEN.admissionInputFactor) <= 0.1;
  if (unit !== CEREBRAS_QWEN.cacheBlockTokens || order?.join() !== 'tools,system,messages' || !admissionMatches) {
    console.log('The provider no longer matches what scripts/agent-context-audit.ts assumes. Update CEREBRAS_QWEN and simulateProvider.');
    process.exit(1);
  }
}
