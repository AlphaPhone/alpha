// Inference pre-warm: when the owner is about to talk, Alpha asks the resident agent (POST /api/cloud/warm) to open
// its Cloud inference connection with one no-model request. Renderer source and the development bridge, in Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.execArgv.some(arg=>arg==='--import=tsx'||arg==='tsx')){const child=spawnSync(process.execPath,['--import','tsx',process.argv[1]],{stdio:'inherit',timeout:60000});process.exit(child.status??1);}
const {localAgentPathAllowed}=await import('../scripts/local-agent-dev-bridge.ts');

test('the development bridge admits exactly the warm route',()=>{
 assert.equal(localAgentPathAllowed('/api/cloud/warm'),true);
 for(const path of ['/api/cloud/warm/x','/api/cloud/warmer','/api/cloud/login','/api/cloud/status','/api/cloud/warm?x=1'])assert.equal(localAgentPathAllowed(path),false,path);
});
