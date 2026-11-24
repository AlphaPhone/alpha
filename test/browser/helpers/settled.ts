import type { Page } from '@playwright/test';

export async function settled(page: Page, timeout = 15_000) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const done = await page.evaluate(limit => {
    const moving = document.getAnimations().filter(animation => {
      if (animation.playState !== 'running') return false;
      const end = Number(animation.effect?.getComputedTiming().endTime);
      return Number.isFinite(end) && end <= 2_000;
    });
    const finished = Promise.all(moving.map(animation => animation.finished.then(() => undefined, () => undefined)));
    return Promise.race([finished.then(() => true), new Promise<boolean>(resolve => setTimeout(() => resolve(false), limit))]);
  }, timeout);
  if (!done) throw new Error(`Screen motion did not finish within ${timeout}ms`);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

export async function frames(page: Page, count = 16) {
  await page.evaluate(count => new Promise<void>(resolve => {
    let left = count;
    const next = () => (--left <= 0 ? resolve() : requestAnimationFrame(next));
    requestAnimationFrame(next);
  }), count);
}
