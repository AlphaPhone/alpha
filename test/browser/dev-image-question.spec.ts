import {choosePhotoAction} from './helpers/owned-photo';
import {test,expect} from '@playwright/test';
test('camera question stages an unsaved frame and removing it leaves Photos unchanged',async({page})=>{
 await page.addInitScript(()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const context=canvas.getContext('2d')!;const paint=()=>{context.fillStyle='white';context.fillRect(0,0,320,240);context.fillStyle='black';context.font='36px sans-serif';context.fillText('ALPHA',30,100);};paint();setInterval(paint,50);const devices=navigator.mediaDevices;devices.getUserMedia=async()=>canvas.captureStream(20);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices});});
 await page.goto('/?mode=dev');await page.getByRole('button',{name:'Camera',exact:true}).click();await expect.poll(()=>page.locator('[data-alpha-camera="viewfinder"] video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.getByRole('button',{name:'Type',exact:true}).click();
 const input=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
 await input.fill('What am I looking at?');await input.press('Enter');
 const frame=page.getByRole('button',{name:'Preview attached Camera frame.jpg',exact:true});
 await expect(frame.locator('img')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('What am I looking at?');
 await expect(page.getByRole('button',{name:'Message actions: What am I looking at?',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Remove Camera frame.jpg',exact:true}).click();
 await expect(frame).toHaveCount(0);
 expect(await page.evaluate(async()=>{const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');return (await browserPhotoLibrary.list()).items.length;})).toBe(0);
});
test('imported photo opens a compact image attachment without a review dialog',async({page})=>{
 test.setTimeout(90000);await page.goto('/?mode=dev');await page.evaluate(async()=>{const {importBrowserPhoto}=await import('/src/prototype/browser-camera.ts');const canvas=document.createElement('canvas');canvas.width=800;canvas.height=300;const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,800,300);context.fillStyle='black';context.font='bold 70px sans-serif';context.fillText('ALPHA 42',60,170);await importBrowserPhoto({image:canvas.toDataURL('image/jpeg'),width:800,height:300},new AbortController().signal);});
 await page.getByRole('button',{name:'Photos',exact:true}).click();await page.getByRole('button',{name:/^Photo, /}).first().click();await choosePhotoAction(page,'Ask Alpha');await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);await expect(page.getByAltText('Captured photo')).toBeVisible();await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('');
});
