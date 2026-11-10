// Maintains specs/quint/coverage.json after a reviewed source or model change.
//
//   node scripts/quint-ledger.mjs status
//   node scripts/quint-ledger.mjs refresh [--assign=assignments.json] [--remove-missing]
//
// `refresh` recomputes hashes and change anchors for sources that already have an allocation, and adds the
// model links that manifests declare in `sources`. It never invents an allocation: a new source is admitted only
// when an assignments file names its models, scope and treatment, and a removed source is dropped only with
// `--remove-missing`. The reviewer still owns the decision that the allocated models describe the changed code.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCoverage, loadModels, readJson, repositoryRoot, sha256, sourcePaths } from './quint-lib.mjs';

const args = process.argv.slice(2);
const command = args.shift() || 'status';
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = name => args.includes(`--${name}`);
for (const arg of args) if (!/^--(assign=.+|remove-missing)$/.test(arg)) throw Error(`Unknown option ${arg}`);
if (!['status', 'refresh'].includes(command)) throw Error(`Unknown ledger command ${command}`);

const ledgerPath = join(repositoryRoot, 'specs/quint/coverage.json');
const ledger = readJson(ledgerPath);
const models = loadModels();
const modelNames = new Set(models.map(model => model.module));

// Lexical navigation aids only. Existing anchors are kept by text when the line still exists; mutable
// declarations that appear in a changed file are added.
const declaration = /^\s*(?:(?:export\s+)?(?:let|var)\s|(?:private|protected|public)?\s*(?:static\s+)?(?:volatile\s+)?(?!final\b)[A-Za-z_][\w<>\[\], .?]*\s+[a-z_]\w*\s*(?:=[^=].*)?;\s*$)/;
function anchors(path, previous) {
  if (!/\.(?:ts|tsx|js|java|kt)$/.test(path)) return previous || [];
  const lines = readFileSync(join(repositoryRoot, path), 'utf8').split('\n');
  const wanted = new Set((previous || []).map(anchor => anchor.text));
  const result = [];
  lines.forEach((raw, index) => {
    const text = raw.trim();
    if (!text || text.length > 400) return;
    const java = /\.(?:java|kt)$/.test(path);
    const declared = java ? /^\s{2,4}(?:private|protected|public|static|volatile)\b/.test(raw) && declaration.test(raw) && !/\bfinal\b/.test(raw) && !/[({]\s*$/.test(raw)
      : /^\s*(?:export\s+)?(?:let|var)\s/.test(raw);
    if (wanted.has(text) || declared) result.push({ line: index + 1, text });
  });
  return result;
}

if (command === 'status') {
  const errors = checkCoverage(models, ledger);
  console.log(errors.length ? errors.join('\n') : `Ledger current for ${ledger.files.length} sources and ${models.length} models.`);
  process.exitCode = errors.length ? 1 : 0;
} else {
  const assignments = option('assign') ? readJson(option('assign')) : {};
  const sources = new Set(sourcePaths());
  const report = { refreshed: [], added: [], removed: [], linked: [], unassigned: [], missing: [] };
  const kept = [];
  for (const entry of ledger.files) {
    if (!sources.has(entry.path)) {
      if (flag('remove-missing')) { report.removed.push(entry.path); continue; }
      report.missing.push(entry.path);
      kept.push(entry);
      continue;
    }
    const hash = sha256(readFileSync(join(repositoryRoot, entry.path)));
    const assigned = assignments[entry.path];
    if (assigned?.models) entry.models = [...new Set([...entry.models, ...assigned.models])];
    if (hash !== entry.sha256) {
      entry.stateAnchors = anchors(entry.path, entry.stateAnchors);
      entry.sha256 = hash;
      report.refreshed.push(entry.path);
    }
    kept.push(entry);
  }
  const recorded = new Set(kept.map(entry => entry.path));
  for (const path of sources) {
    if (recorded.has(path)) continue;
    const assigned = assignments[path];
    if (!assigned?.models?.length || !assigned.scope || !assigned.treatment) { report.unassigned.push(path); continue; }
    kept.push({ path, sha256: sha256(readFileSync(join(repositoryRoot, path))), models: assigned.models,
      scope: assigned.scope, treatment: assigned.treatment, stateAnchors: anchors(path, []) });
    report.added.push(path);
  }
  for (const model of models) for (const source of model.sources || []) {
    const entry = kept.find(candidate => candidate.path === source);
    if (entry && !entry.models.includes(model.module)) { entry.models.push(model.module); report.linked.push(`${model.module}: ${source}`); }
  }
  for (const entry of kept) for (const name of entry.models) if (!modelNames.has(name)) throw Error(`Unknown model ${name} for ${entry.path}`);
  ledger.files = kept.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const input of ledger.configurationInputs || []) input.sha256 = sha256(readFileSync(join(repositoryRoot, input.path)));
  ledger.reviewDate = new Date().toISOString().slice(0, 10);
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  for (const [name, list] of Object.entries(report)) if (list.length) console.log(`${name} (${list.length})\n  ${list.join('\n  ')}`);
  const errors = checkCoverage(models, ledger);
  if (errors.length) console.error(`Ledger still needs review\n${errors.join('\n')}`);
  process.exitCode = errors.length ? 1 : 0;
}
