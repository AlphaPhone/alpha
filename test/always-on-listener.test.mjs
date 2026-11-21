import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import '../vendor/eliza/packages/app/test/android/sense.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {javaBinary} from './fixtures/jvm-tools.mjs';
import {SHARED,alphaSources,androidJar,vendorSource,writeStubs} from './fixtures/sense-jvm/sources.mjs';
test('Alpha listener components compile with only the shared policy classes and preserve stored identity',()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const product=JSON.parse(fs.readFileSync(path.join(root,'android/aosp/pixel10a-composition.json')));
 assert.equal(product.sense.componentPackage,'ai.alphacompute.alphaphone.sense');assert.equal(product.sense.storageName,'listener-settings');assert.deepEqual(product.sense.wakeNames,['alpha']);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-sense-compat-'));
 try {
  // Alpha owns the listener's components, consent screen, notifications and tile; only the pure
  // policy classes come from the pinned shared source (test/sense-listener-fork.test.mjs).
  execFileSync(javaBinary('javac'),['--release','21','-cp',androidJar,'-d',path.join(temp,'out'),...writeStubs(temp),...SHARED.map(vendorSource),...alphaSources()],{timeout:scaledTimeout(60000)});
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

