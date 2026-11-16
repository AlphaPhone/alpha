import test from 'node:test';

const selectors = ['ALPHA_ANDROID_APPLICATION_ID', 'ELIZAOS_VERSION_CODE', 'ELIZAOS_VERSION_NAME'];

/** Synthetic products own their configuration. Actual-product checks retain the producer's. */
export function withFixtureBuildContext(run) {
 const saved = selectors.map(name => [name, process.env[name]]);
 const restore = () => {for (const [name, value] of saved) {
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
 }};
 for (const name of selectors) delete process.env[name];
 try {
  const result = run();
  if (result && typeof result.then === 'function') return Promise.resolve(result).finally(restore);
  restore(); return result;
 } catch (error) {restore(); throw error;}
}

// The host runner uses one process per file; these fixture cases remain serial within it.
export function fixtureTest(name, options, run) {
 if (typeof options === 'function') {run = options; options = {};}
 if (options.concurrency) throw Error('Build-environment fixtures must run serially');
 return test(name, options, context => withFixtureBuildContext(() => run(context)));
}
