import type { Page } from '@playwright/test';

export async function stubOcr(page: Page, text: string) {
  const result = JSON.stringify({ text, confidence: 90, blocks: null });
  await page.route('**/ocr/worker.min.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `self.onmessage=({data})=>self.postMessage({workerId:data.workerId,jobId:data.jobId,action:data.action,status:'resolve',data:data.action==='recognize'?${result}:{}});`,
  }));
}
