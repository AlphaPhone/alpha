import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stageLauncherAgentIpcPolicy, LAUNCHER_POLICY_SOURCE, LAUNCHER_POLICY_PRODUCT_INCLUDE } from '../scripts/aosp-launcher-policy.ts';

const policy = fs.readFileSync(LAUNCHER_POLICY_SOURCE, 'utf8');

test('the privileged launcher policy grants only socket files in its own private data', () => {
  const rules = policy.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  assert.deepEqual(rules, ['allow priv_app_all privapp_data_file:sock_file { create unlink getattr setattr write rename };']);
});

test('staging writes the reviewed policy beside the product and includes it once', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-launcher-policy-'));
  fs.writeFileSync(path.join(output, 'product.mk'), 'PRODUCT_PACKAGES += AlphaPhone\n');
  stageLauncherAgentIpcPolicy(output);
  assert.equal(fs.readFileSync(path.join(output, 'sepolicy', 'alpha_launcher_agent_ipc.te'), 'utf8'), policy);
  const product = fs.readFileSync(path.join(output, 'product.mk'), 'utf8');
  assert.ok(product.endsWith(LAUNCHER_POLICY_PRODUCT_INCLUDE));
  assert.equal(product.match(/SEPOLICY_DIRS/g).length, 1);
  assert.match(product, /SYSTEM_EXT_PRIVATE_SEPOLICY_DIRS \+= \$\(patsubst %\/,%,\$\(dir \$\(lastword \$\(MAKEFILE_LIST\)\)\)\)\/sepolicy/);
  // A second stage into the same output is refused rather than merged.
  assert.throws(() => stageLauncherAgentIpcPolicy(output));
  fs.rmSync(output, { recursive: true, force: true });
});
