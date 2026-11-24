import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { scaledTimeout } from '../specs/quint/refinement/timeouts.mjs';
import { javaBinary, jsonJar, nativeSource } from './fixtures/jvm-tools.mjs';

test('failed native navigation diagnostics correlate phases without exposing request values', () => {
  assert.ok(jsonJar, 'Pinned JSON dependency required');
  const output = mkdtempSync(join(tmpdir(), 'alpha-view-diagnostic-'));
  try {
    const source = join(output, 'ViewRequestDiagnosticTest.java');
    writeFileSync(source, String.raw`package ai.alphacompute.alphaphone;
import org.json.JSONObject;

public class ViewRequestDiagnosticTest {
  public static void main(String[] args) throws Exception {
    String id = "12345678-1234-4234-9234-123456789012";
    String body = new JSONObject().put("requestId", id).put("text", "private content").toString();
    String claim = ViewRequestDiagnostic.failedPostSuffix("POST", "/api/views/interact-claim", body);
    if (!claim.matches(" navigation=claim navigation_ref=[0-9a-f]{16}")) throw new AssertionError();
    String fingerprint = claim.substring(" navigation=claim".length());
    String result = ViewRequestDiagnostic.failedPostSuffix("POST", "/api/views/interact-result", body);
    String prepare = ViewRequestDiagnostic.failedPostSuffix("POST", "/api/views/private-view/navigate",
        body.replace("requestId", "completedActionHandoffId"));
    if (!result.equals(" navigation=result" + fingerprint) || !prepare.equals(" navigation=prepare" + fingerprint))
      throw new AssertionError();
    for (String invalid : new String[]{null, "not JSON", "x".repeat(4097), body.replace(id, "private content")}) {
      if (!ViewRequestDiagnostic.failedPostSuffix("POST", "/api/views/interact-claim", invalid).equals(" navigation=claim"))
        throw new AssertionError();
    }
    if (!ViewRequestDiagnostic.failedPostSuffix("GET", "/api/views/interact-claim", body).isEmpty() ||
        !ViewRequestDiagnostic.failedPostSuffix("POST", "/api/views/private-view/navigate?token=private", body).isEmpty())
      throw new AssertionError();
  }
}`);
    const timeout = scaledTimeout(30_000);
    execFileSync(javaBinary('javac'), ['--release', '11', '-cp', jsonJar, '-d', output,
      nativeSource('ViewRequestDiagnostic.java'), source], { timeout });
    execFileSync(javaBinary('java'), ['-cp', [output, jsonJar].join(delimiter),
      'ai.alphacompute.alphaphone.ViewRequestDiagnosticTest'], { timeout });
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
