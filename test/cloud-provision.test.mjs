import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {ALPHA_CLOUD_DEPLOYMENT} from '../scripts/cloud-deployment-policy.ts';
import {reconcileCloudResources,writeProvisionedResources} from '../scripts/cloud-provision.ts';

const resources = JSON.parse(fs.readFileSync(new URL('../cloud/resources.json', import.meta.url), 'utf8'));
const id = digit => digit.repeat(32);
const accountId = id('a'), zoneId = id('b'), kvId = id('c'), hyperId = id('d');
const apiHost = new URL(ALPHA_CLOUD_DEPLOYMENT.staging.api).host;
const webHost = new URL(ALPHA_CLOUD_DEPLOYMENT.staging.web).host;
const inputs = {ids: resources.staging, sibling: resources.production, apiHost, webHost, accountId,
  databaseUrl: 'postgresql://fixture%2Duser:fixture%40password@db.example.invalid/alpha%2Dfixture?sslmode=require', token: 'synthetic-cloudflare-token'};
const origin = {host: 'db.example.invalid', port: 5432, database: 'alpha-fixture', user: 'fixture-user', scheme: 'postgresql'};
const zone = {id: zoneId, name: inputs.ids.zone, account: {id: accountId}};
const kv = {id: kvId, title: `${inputs.ids.workerName}-cache`, supports_url_encoding: true};
const hyperdrive = {id: hyperId, name: `${inputs.ids.workerName}-db`, origin, caching: {disabled: true}};
const bucket = {name: inputs.ids.r2Bucket, creation_date: '2026-01-01T00:00:00Z', location: 'ENAM', storage_class: 'Standard'};
const dnsRow = name => ({id: name === apiHost ? id('e') : id('f'), name, type: 'AAAA', content: '100::', proxied: true});
const domain = (hostname, service) => ({id: hostname === apiHost ? id('7') : id('8'), hostname, service, environment: 'production', zone_id: zoneId});
const known = {...inputs.ids, accountId, kvNamespaceId: kvId, hyperdriveId: hyperId};

function cloudflareFixture({existing = false} = {}) {
  const state = {zone, kv: existing ? [kv] : [], hyper: existing ? [hyperdrive] : [],
    bucket: existing ? bucket : null, dns: existing ? [dnsRow(inputs.ids.blobHost)] : [], domains: []};
  const writes = [], reads = [], onWrite = new Map();
  const ok = (result, extra = {}) => Response.json({success: true, errors: [], messages: [], result, ...extra});
  const error = (status, code) => Response.json({success: false, errors: [{code, message: inputs.databaseUrl}], result: null}, {status});
  const paged = (url, items) => {
    const page = Number(url.searchParams.get('page'));
    assert.equal(url.searchParams.get('per_page'), '50');
    return ok(items.slice(page - 1, page), {result_info: {page, per_page: 1, total_count: items.length}});
  };
  const fetcher = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://api.cloudflare.com');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.authorization, `Bearer ${inputs.token}`);
    const path = url.pathname.replace(/^\/client\/v4/, '');
    if (options.method === 'GET') reads.push([path, url.search]);
    if (path === '/zones') {
      assert.equal(options.method, 'GET');
      assert.equal(url.searchParams.get('name'), inputs.ids.zone);
      assert.equal(url.searchParams.get('account.id'), accountId);
      assert.equal(url.searchParams.get('match'), 'all');
      assert.equal(url.searchParams.get('per_page'), '50');
      return ok([state.zone], {result_info: {page: 1, per_page: 50, total_count: 25}});
    }
    if (path.startsWith('/accounts/')) assert.ok(path.startsWith(`/accounts/${accountId}/`));
    if (path.startsWith('/zones/')) assert.ok(path.startsWith(`/zones/${zoneId}/`));
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      writes.push([path, body]);
      if (path.endsWith('/storage/kv/namespaces')) {
        assert.deepEqual(body, {title: kv.title});
        const create = () => { state.kv.push(kv); return ok(kv); };
        return onWrite.get('kv')?.(create, error) ?? create();
      }
      if (path.endsWith('/hyperdrive/configs')) {
        assert.deepEqual(body, {name: hyperdrive.name, origin: {...origin, password: 'fixture@password'}, caching: {disabled: true}});
        const create = () => { state.hyper.push(hyperdrive); return ok(hyperdrive); };
        return onWrite.get('hyper')?.(create, error) ?? create();
      }
      if (path.endsWith('/r2/buckets')) {
        assert.deepEqual(body, {name: bucket.name});
        const create = () => { state.bucket = bucket; return ok(bucket); };
        return onWrite.get('bucket')?.(create, error) ?? create();
      }
      if (path.endsWith('/dns_records')) {
        assert.equal(body.name, inputs.ids.blobHost);
        assert.deepEqual(body, {name: body.name, type: 'AAAA', content: '100::', proxied: true, comment: 'Alpha Cloud Worker route'});
        const created = dnsRow(body.name);
        state.dns.push(created);
        return ok(created);
      }
    } else if (path.endsWith('/storage/kv/namespaces')) return paged(url, state.kv);
    else if (path.endsWith('/hyperdrive/configs')) return paged(url, state.hyper);
    else if (path.endsWith(`/r2/buckets/${bucket.name}`)) return state.bucket instanceof Response ? state.bucket.clone() : state.bucket ? ok(state.bucket) : error(404, 10006);
    else if (path.endsWith('/workers/domains')) {
      const hostname = url.searchParams.get('hostname');
      assert.ok([apiHost, webHost].includes(hostname));
      assert.equal(url.searchParams.get('zone_id'), zoneId);
      return paged(url, state.domains.filter(row => row.hostname === hostname));
    }
    else if (path.endsWith('/dns_records')) {
      const name = url.searchParams.get('name.exact');
      assert.ok([apiHost, webHost, inputs.ids.blobHost].includes(name));
      return paged(url, state.dns.filter(row => row.name === name));
    }
    throw new Error(`Unexpected synthetic Cloudflare request ${options.method} ${path}`);
  };
  return {state, writes, reads, onWrite, fetcher, ok, error};
}

test('provision and repeat reconcile the exact account, resource names, and database origin', async () => {
  const fixture = cloudflareFixture();
  fixture.state.kv.push({id: id('1'), title: 'another-namespace'});
  const source = {...inputs, fetcher: fixture.fetcher, create: true};
  assert.deepEqual(await reconcileCloudResources(source), known);
  assert.equal(fixture.writes.length, 4);
  assert.ok(fixture.reads.some(([path, search]) => path.endsWith('/storage/kv/namespaces') && search.includes('page=2')));
  fixture.state.dns.push({id: id('3'), name: apiHost, type: 'TXT', content: 'fixture-verification'});
  assert.deepEqual(await reconcileCloudResources(source), known);
  assert.deepEqual(await reconcileCloudResources({...source, ids: known, create: false}), known);
  assert.equal(fixture.writes.length, 4);
});

test('preflight follows both Workers custom domains after deployment and admits the previous API placeholder', async () => {
  const fixture = cloudflareFixture({existing: true});
  const source = {...inputs, ids: known, fetcher: fixture.fetcher};
  fixture.state.dns.push({...dnsRow(apiHost), comment: 'Alpha Cloud Worker route'});
  assert.deepEqual(await reconcileCloudResources(source), known);
  fixture.state.dns.pop();
  fixture.state.dns.push({...dnsRow(apiHost), type: 'Worker'}, {...dnsRow(webHost), type: 'Worker'});
  fixture.state.domains = [domain(apiHost, known.workerName), domain(webHost, known.workerName + '-edge')];
  assert.deepEqual(await reconcileCloudResources(source), known);
  assert.deepEqual(fixture.writes, []);
});

test('ambiguous create responses recover by exact readback without a second create', async () => {
  const fixture = cloudflareFixture();
  fixture.onWrite.set('kv', (create, error) => { create(); return error(400, 10014); });
  fixture.onWrite.set('hyper', create => { create(); throw new Error(inputs.databaseUrl); });
  fixture.onWrite.set('bucket', (create, error) => { create(); return error(409, 10004); });
  assert.deepEqual(await reconcileCloudResources({...inputs, fetcher: fixture.fetcher, create: true}), known);
  assert.equal(fixture.writes.length, 4);
});

test('an unconfirmed R2 write fails without exposing provider text and resumes on the next run', async () => {
  const fixture = cloudflareFixture();
  fixture.onWrite.set('bucket', (_create, error) => error(403, 12345));
  await assert.rejects(reconcileCloudResources({...inputs, fetcher: fixture.fetcher, create: true}), error => {
    assert.equal(error.message, 'Cloudflare R2 create failed (HTTP 403)');
    return true;
  });
  assert.equal(fixture.writes.length, 3);
  fixture.onWrite.delete('bucket');
  assert.deepEqual(await reconcileCloudResources({...inputs, fetcher: fixture.fetcher, create: true}), known);
  assert.equal(fixture.writes.length, 5);
});

test('wrong authority, config collisions and missing preflight state fail before writes', async () => {
  const cases = [
    [fixture => { fixture.state.zone = {...zone, account: {id: id('2')}}; }, {}, /not uniquely owned/],
    [fixture => { fixture.state.kv = [kv, {...kv, id: id('1')}]; }, {}, /Multiple KV/],
    [fixture => { fixture.state.kv = [{...kv, id: id('1')}]; }, {ids: known}, /recorded KV namespace ID/],
    [() => {}, {ids: known, accountId: id('2')}, /CLOUDFLARE_ACCOUNT_ID/],
    // Only an existing staging Hyperdrive can collide with the sibling's before a write; a newly created
    // one that collides is refused at its create receipt (the next test covers receipts).
    [() => {}, {sibling: {...inputs.sibling, hyperdriveId: hyperId}}, /Conflicting Hyperdrive identity/, 'existing only'],
    [fixture => { fixture.state.hyper = [{...hyperdrive, origin: {...origin, database: 'wrong'}}]; }, {}, /Hyperdrive origin/],
    [fixture => { fixture.state.hyper = [{...hyperdrive, caching: {disabled: false}}]; }, {}, /Hyperdrive query caching must be disabled/],
    [fixture => { fixture.state.bucket = fixture.error(401, 10000); }, {}, /R2 lookup failed \(HTTP 401\)/],
    [fixture => { fixture.state.dns.push(dnsRow(apiHost)); }, {}, /Conflicting DNS record/],
    [fixture => { fixture.state.dns.push({...dnsRow(webHost), type: 'CNAME', content: 'other.pages.dev'}); }, {}, /Conflicting DNS record/],
    [fixture => { fixture.state.domains = [domain(apiHost, 'another-worker')]; }, {}, /Conflicting Worker custom domain/],
    [fixture => { fixture.state.domains = [{...domain(webHost, known.workerName + '-edge'), environment: 'another-environment'}]; }, {}, /Conflicting Worker custom domain/],
    [() => {}, {webHost: 'outside.example'}, /not in zone/],
    // With nothing provisioned, the recorded IDs no longer name anything: still refused before any write.
    [fixture => { fixture.state.bucket = null; }, {create: false, ids: known}, /resources are missing/, null, /recorded KV namespace ID does not match/],
    [() => {}, {create: false}, /Record the selected account/],
  ];
  // Each case runs with every other resource present, and again with every other resource missing:
  // a run that would create something must still refuse before its first write.
  for (const existing of [true, false]) for (const [change, options, expected, only, whenMissing] of cases) {
    if (!existing && only) continue;
    const error = !existing && whenMissing ? whenMissing : expected;
    const fixture = cloudflareFixture({existing});
    change(fixture);
    await assert.rejects(reconcileCloudResources({...inputs, fetcher: fixture.fetcher, create: true, ...options}), error, `${error} existing=${existing}`);
    assert.deepEqual(fixture.writes, [], `${error} existing=${existing}`);
  }
});

test('a created ID that disagrees with named readback fails closed', async () => {
  const fixture = cloudflareFixture();
  fixture.onWrite.set('hyper', create => { create(); return fixture.ok({...hyperdrive, id: id('2')}); });
  await assert.rejects(reconcileCloudResources({...inputs, fetcher: fixture.fetcher, create: true}), /conflicting Hyperdrive create receipt/);
  assert.equal(fixture.writes.length, 2);
});

test('resource write preserves a sibling update and rejects stale writes to the same environment', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-cloud-resource-write-'));
  const file = path.join(scratch, 'resources.json');
  const production = {...resources.production, accountId, kvNamespaceId: id('2'), hyperdriveId: id('3')};
  try {
    fs.writeFileSync(file, JSON.stringify({...resources, production}));
    writeProvisionedResources(file, 'staging', resources.staging, known);
    writeProvisionedResources(file, 'staging', resources.staging, known);
    assert.throws(() => writeProvisionedResources(file, 'staging', resources.staging, {...known, kvNamespaceId: id('4')}), /resources changed for staging/);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), {production, staging: known});
    fs.writeFileSync(`${file}.alpha-cloud-write-lock`, '');
    assert.throws(() => writeProvisionedResources(file, 'production', production, {...production, hyperdriveId: id('5')}), {code: 'EEXIST'});
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), {production, staging: known});
  } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
});

test('the preflight command checks the env file origin using only scoped reads', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-cloud-cli-preflight-'));
  try {
    const config = path.join(directory, 'resources.json');
    const envFile = path.join(directory, 'staging.env');
    const trace = path.join(directory, 'requests.jsonl');
    const mockFetch = path.join(directory, 'cloudflare.mjs');
    fs.writeFileSync(config, JSON.stringify({...resources, staging: known}));
    fs.writeFileSync(envFile, `DATABASE_URL=${inputs.databaseUrl}\n`, {mode: 0o600});
    fs.writeFileSync(mockFetch, `
      import {appendFileSync} from 'node:fs';
      globalThis.fetch = async (input, options) => {
        const url = new URL(input);
        if (options.method !== 'GET' || url.origin !== 'https://api.cloudflare.com') throw new Error('unexpected request');
        appendFileSync(${JSON.stringify(trace)}, JSON.stringify(url.pathname)+'\\n');
        const responses = ${JSON.stringify({
          '/client/v4/zones': [zone],
          [`/client/v4/accounts/${accountId}/storage/kv/namespaces`]: [kv],
          [`/client/v4/accounts/${accountId}/hyperdrive/configs`]: [hyperdrive],
          [`/client/v4/accounts/${accountId}/r2/buckets/${known.r2Bucket}`]: bucket,
          [`/client/v4/accounts/${accountId}/workers/domains`]: [],
        })};
        const name = url.searchParams.get('name.exact');
        const dns = ${JSON.stringify({[known.blobHost]: [dnsRow(known.blobHost)], [apiHost]: [], [webHost]: []})};
        const result = url.pathname === '/client/v4/zones/${zoneId}/dns_records' ? dns[name] : responses[url.pathname];
        if (!result) throw new Error('unexpected request path');
        return Response.json({success: true, result});
      };`);
    const run = () => spawnSync(process.execPath, ['--import', mockFetch, 'scripts/cloud-worker.ts', 'preflight',
      '--environment', 'staging', '--resources', config, '--env-file', envFile], {encoding: 'utf8', env: {
      ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: inputs.token,
    }});
    const admitted = run();
    assert.equal(admitted.status, 0, admitted.stderr);
    assert.match(admitted.stdout, /preflight: staging resources verified/);
    assert.equal(fs.readFileSync(trace, 'utf8').trim().split('\n').length, 9);
    fs.writeFileSync(envFile, 'DATABASE_URL=postgresql://fixture:synthetic@wrong.example.invalid/cloud\n');
    const refused = run();
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /Hyperdrive origin does not match DATABASE_URL/);
    assert.doesNotMatch(refused.stderr, /wrong\.example\.invalid/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
