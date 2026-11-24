import type {Page} from '@playwright/test';
export async function preloadPageModules(page:Page,paths:readonly string[]){
 for(const path of paths)if(!/^\/src\/[A-Za-z0-9/_.-]+\.(ts|tsx|js)$/.test(path))throw Error('Unexpected module path');
 const content=paths.map((path,index)=>`import * as m${index} from ${JSON.stringify(path)};`).join('\n')
  +`\nwindow.__alphaModules=Object.assign(window.__alphaModules||{},{${paths.map((path,index)=>`${JSON.stringify(path)}:m${index}`).join(',')}});`;
 await page.addScriptTag({type:'module',content});
 await page.waitForFunction(paths=>paths.every(path=>!!(window as any).__alphaModules?.[path]),paths);
}
