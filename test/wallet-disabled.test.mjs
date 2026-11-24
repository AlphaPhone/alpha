import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {nativeViewDeclarationsJson} from '../scripts/native-view-policy.ts';
import {STAGED_AGENT_ASSETS} from '../scripts/agent-payload.ts';
// AP-13 / #422: Wallet is not in Alpha in either distribution or on the Alpha AOSP image. Its
// views, deep links, native/payment adapters and agent actions stay unavailable; no payment, card
// or pass-wallet effect can be reached from a product build.
const root=resolve(import.meta.dirname,'..');

// The resident runtime payload carries no browser wallet-connector closure (wagmi, RainbowKit,
// the MetaMask SDK, whose licence is not open source). The upstream bundle build records every
// package it emitted bytes from in the staged manifest (packages[].name, @elizaos/agent/bundle),
// so none of them may appear there (#674).
const WALLET_CONNECTOR=/^(?:wagmi|@wagmi\/[^/]+|@rainbow-me\/[^/]+|@metamask\/[^/]+)$/;
test('a staged resident runtime inventory lists no @metamask/*, wagmi or @rainbow-me/* package',t=>{
 const file=join(root,STAGED_AGENT_ASSETS,'manifest.json');
 if(!existsSync(file)){t.skip('no staged resident runtime (pnpm agent:stage-android writes it)');return;}
 const {packages}=JSON.parse(readFileSync(file,'utf8'));
 assert.ok(Array.isArray(packages)&&packages.length>0,'staged manifest lists packages');
 assert.deepEqual(packages.filter(row=>WALLET_CONNECTOR.test(row.name)).map(row=>`${row.name}@${row.version}`),[]);
});

test('the resident agent profile used by Alpha loads no Wallet actions in either distribution',()=>{
 // Product view launch policy names no Wallet view.
 const views=JSON.parse(nativeViewDeclarationsJson);
 assert.ok(Array.isArray(views)&&views.length>0);
 for(const view of views)assert.doesNotMatch(`${view.id} ${view.path} ${view.fallbackFor}`,/wallet|payment/i);
 // The upstream agent loads exactly the launch policy's plugins and admits only its allowlisted
 // actions (vendor/eliza spec/agent/plugins/profile.md), for the stock APK and the AOSP image alike.
 const policy=JSON.parse(readFileSync(join(root,'android/agent/policy.json'),'utf8'));
 assert.ok(Array.isArray(policy.plugins?.load)&&policy.plugins.load.length>0,'policy.plugins.load');
 for(const plugin of policy.plugins.load)assert.doesNotMatch(plugin,/wallet|payment|solana|evm/i,`the launch loads ${plugin}`);
 assert.ok(Array.isArray(policy.actions?.allowed)&&policy.actions.allowed.length>0,'policy.actions.allowed');
 for(const action of policy.actions.allowed)assert.doesNotMatch(action,/wallet|payment|swap|transfer|solana|evm/i,`the launch allows ${action}`);
});
