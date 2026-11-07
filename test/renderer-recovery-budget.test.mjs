// Renderer recovery (AP-02). Host-JVM run of the extracted budget and its decision: HOME vs not,
// crash vs system reclaim, visible vs background. Not emulator evidence: killing the renderer on a
// device is the separate instrumented task (renderer-recovery-emulator), and the escape view has
// not been seen on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSource,fixture,runJvm} from './fixtures/jvm-tools.mjs';

test('three immediate recoveries per 60 s, then a 5 s backoff, or the escape view while HOME; background reclaims are not counted',()=>{
 assert.match(runJvm([nativeSource('RendererRecoveryBudget.java'),fixture('RendererRecoveryBudgetTest.java')],'ai.elizaresearch.alphaphone.RendererRecoveryBudgetTest'),/^PASS renderer recovery budget/);
});

