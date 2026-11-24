import {test,expect,type Page} from '@playwright/test';
import {setupNativeSpeech} from './native-speech-fixture';
import {installTelephonyFixture} from '../../scripts/fixtures/native-telephony';
import {setTextScale} from './accessibility-states';

test.beforeEach(async({page})=>{
  await page.route('**/src/build-flags.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const testMocksEnabled=false;export const devSurfacesEnabled=false;export const privateLocalPreviewEnabled=false;export const updateChannelCheckEnabled=false;'}));
});

async function setup(page:Page){
  await setupNativeSpeech(page);
  await page.addInitScript({content:`(() => {
    const speech=window.Capacitor, preserved=['AlphaVoiceCloud','AlphaConnection','Agent'];
    const selection=localStorage.getItem('alpha.connection.selection.v1');
    (${installTelephonyFixture.toString()})({mms:true});
    const cap=window.Capacitor, native=cap.nativePromise, callback=cap.nativeCallback;
    if(selection!==null)localStorage.setItem('alpha.connection.selection.v1',selection);
    cap.PluginHeaders=cap.PluginHeaders.map(p=>preserved.includes(p.name)?speech.PluginHeaders.find(h=>h.name===p.name):p);
    cap.nativePromise=(plugin,method,input)=>preserved.includes(plugin)?speech.nativePromise(plugin,method,input):native(plugin,method,input);
    cap.nativeCallback=(plugin,method,input,fn)=>preserved.includes(plugin)?speech.nativeCallback(plugin,method,input,fn):callback(plugin,method,input,fn);
  })();`});
  await page.reload();
  await page.evaluate(async()=>{(await import('/src/runtime/connection-ui.tsx' as string)).connectionController.close();});
  await page.getByRole('button',{name:'Messages',exact:true}).first().click();
  await page.getByRole('button',{name:/^Ada Okafor/}).click();
}
const field=(page:Page)=>page.locator('[data-alpha-bar-field="person"]');
const capture=(page:Page)=>page.locator('[data-alpha-bar-recorder]');
const inputs=(page:Page,method:string)=>page.evaluate(method=>(window as any).telephonyInputs.filter(([name]:any)=>name===method),method);

for(const scale of [1,2])test(`Messages mic fills only the editable unsent draft at ${scale*100}% text`,async({page})=>{
  await setup(page);await setTextScale(page,scale);
  const bar=page.locator('[data-alpha-input-bar]');
  await expect(bar.getByRole('button',{name:'Add picture',exact:true})).toBeVisible();
  await expect(page.locator('[data-alpha-messages-accessories]').getByRole('button',{name:'Add picture',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Dictate a text to Ada',exact:true}).click();
  await expect(capture(page)).toHaveAttribute('data-voice-state','recording');
  await expect(bar).not.toBeVisible();
  await expect(page.getByRole('region',{name:'Voice conversation',exact:true})).toHaveCount(0);
  await expect(capture(page).getByRole('button',{name:'Stop recording',exact:true})).toBeInViewport({ratio:1});
  await capture(page).getByRole('button',{name:'Stop recording',exact:true}).click();
  await expect(capture(page)).toHaveCount(0);
  await expect(field(page)).toHaveValue('Local spoken request');
  await expect(bar.getByRole('button',{name:'Send',exact:true})).toBeEnabled();
  await expect(bar.getByRole('button',{name:'Dictate a text to Ada',exact:true})).toBeInViewport({ratio:1});
  await bar.getByRole('button',{name:'Dictate a text to Ada',exact:true}).click();
  await expect(capture(page)).toHaveAttribute('data-voice-state','recording');
  await capture(page).getByRole('button',{name:'Stop recording',exact:true}).click();
  await expect(field(page)).toHaveValue('Local spoken request Local spoken request');
  expect(await inputs(page,'sendComposedSms')).toEqual([]);
  expect(await page.evaluate(()=>({transcripts:(window as any).nativeSpeech.transcripts,spoken:(window as any).nativeSpeech.spoken,plays:(window as any).nativeSpeech.plays}))).toEqual({transcripts:2,spoken:[],plays:0});
});

test('unavailable Messages dictation restores one keyboard bar and retains its draft',async({page})=>{
  await setup(page);
  await field(page).fill('Keep this draft');
  await page.evaluate(()=>(window as any).nativeSpeech.ready=false);
  await page.getByRole('button',{name:'Dictate a text to Ada',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dictation is unavailable here. You can still type your message.',exact:true})).toBeVisible();
  await expect(capture(page)).toHaveCount(0);
  await expect(field(page)).toBeVisible();
  await expect(field(page)).toHaveValue('Keep this draft');
  expect(await page.evaluate(()=>(window as any).nativeSpeech.starts)).toBe(0);
  expect(await inputs(page,'sendComposedSms')).toEqual([]);
});

test('cancelled Messages dictation keeps the existing draft without a transcript or send',async({page})=>{
  await setup(page);await field(page).fill('Keep my own words');
  await page.getByRole('button',{name:'Dictate a text to Ada',exact:true}).click();
  await expect(capture(page)).toHaveAttribute('data-voice-state','recording');
  await capture(page).getByRole('button',{name:'Discard transcription',exact:true}).click();
  await expect(capture(page)).toHaveCount(0);
  await expect(field(page)).toHaveValue('Keep my own words');
  expect(await page.evaluate(()=>(window as any).nativeSpeech.transcripts)).toBe(0);
  expect(await inputs(page,'sendComposedSms')).toEqual([]);
});

test('late dictation cannot be placed into a different Messages conversation',async({page})=>{
  await setup(page);
  await page.evaluate(()=>(window as any).nativeSpeech.holdTranscript=true);
  await page.getByRole('button',{name:'Dictate a text to Ada',exact:true}).click();
  await expect(capture(page)).toHaveAttribute('data-voice-state','recording');
  await capture(page).getByRole('button',{name:'Stop recording',exact:true}).click();
  await expect(capture(page)).toHaveAttribute('data-voice-state','transcribing');
  await page.locator('[data-alpha-messages]').getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:/^Bao Tran/}).click();
  await page.evaluate(()=>(window as any).nativeSpeech.releaseTranscript());
  await expect(field(page)).toHaveValue('');
  await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Bao Tran');
  expect(await inputs(page,'sendComposedSms')).toEqual([]);
});
