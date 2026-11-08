import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifySource} from '../../../../../scripts/local-agent-source.mjs';

const source = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const pin = JSON.parse(fs.readFileSync('upstream.lock.json')).commit;
verifySource(source, pin);
const captures = [];
const inputHashes = new Map();
const original = Bun.build;
try {
  Bun.build = async options => {
    const result = await original({...options, metafile: true});
    if (!result.success || !result.metafile) throw Error('Worker graph compilation failed');
    const meta = typeof result.metafile === 'string' ? JSON.parse(result.metafile) : result.metafile;
    for (const name of Object.keys(meta.inputs)) inputHashes.set(name, createHash('sha256').update(fs.readFileSync(path.resolve(name))).digest('hex'));
    captures.push(meta);
    return result;
  };
  const producer = await import(pathToFileURL(path.join(source, 'packages/scripts/plugins/plugin-workflow/build-workflow-artifact.ts')).href);
  await producer.buildWorkflowArtifact({sourceRoot: source, outputDir: output,
    sourceIdentity: createHash('sha256').update(fs.readFileSync(path.join(source, '.alpha-runtime-source.json'))).digest('hex')});
} finally { Bun.build = original; }
verifySource(source, pin);
if (!captures.length) throw Error('No actual worker build observed');
const inputs = [...new Set(captures.flatMap(meta => Object.keys(meta.inputs)))].sort();
const selected = inputs.filter(name => /(?:^|\/)packages\/core\/src\//.test(name));
if (selected.length) throw Error('Worker selected core source; shared transform must be installed');
const report = {pin, bunVersion: Bun.version, bunRevision: Bun.revision, builds: captures.length,
  inputs: Object.fromEntries([...inputHashes].sort(([a], [b]) => a.localeCompare(b))),
  selectedCoreInputs: selected};
fs.writeFileSync('test-results/quint-workflow-tasks/worker-core-absence.json', JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({builds: captures.length, inputs: inputs.length, selectedCoreInputs: selected.length}));
