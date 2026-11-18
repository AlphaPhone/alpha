import {openRetainedDigests} from './helpers/retained-digests';
import {returnToApps} from './app-navigation';
import { test, expect } from '@playwright/test';


test('Conversation controls survive a keyboard-sized viewport and retain the draft', async ({page},info)=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open conversation',exact:true}).click();
  const draft=page.locator('[data-alpha-layer="conversation"]').getByRole('textbox');
  await draft.fill('Keep this unsent draft');
  await page.setViewportSize({width:412,height:300});
  const close=page.getByRole('button',{name:'Minimize chat',exact:true});
  await expect(close).toBeInViewport();
  await page.getByRole('button',{name:'Expand chat',exact:true}).click();
  await expect(close).toBeInViewport();
  await expect(draft).toBeInViewport();
  await page.screenshot({path:info.outputPath('compact-chat.png')});
  await close.click();
  await page.setViewportSize({width:412,height:915});
  await page.getByRole('button',{name:'Open conversation',exact:true}).click();
  await expect(draft).toHaveValue('Keep this unsent draft');
});

for(const theme of ['light','dark']) test(`Retained digest panel respects ${theme} appearance without a Settings shortcut`,async({page},info)=>{
  await page.addInitScript(theme=>localStorage.setItem('alpha.appearance.v1',theme),theme);
  await page.goto(`/?theme=${theme}`);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Apps',exact:true}).click();
  await page.getByRole('button',{name:'Workflows',exact:true}).click();
  await expect(page.getByRole('button',{name:'Scheduled summaries',exact:true})).toHaveCount(0);
  // The owner removed this Settings entry. Retained result/renewal handlers still use the panel.
  // Exercise its existing event directly; this is component coverage, not a settings journey.
  await openRetainedDigests(page);
  const dialog=page.getByRole('dialog',{name:'Scheduled digests',exact:true});
  await expect(dialog).toHaveCSS('background-color',theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)');
  await expect(dialog).toHaveCSS('color',theme==='dark'?'rgb(255, 255, 255)':'rgb(0, 0, 0)');
  await page.screenshot({path:info.outputPath('dialog.png')});
});

test('Sign-in dialog follows a live theme change and remains keyboard accessible',async({page},info)=>{
  await page.route('**/__alpha-browser-cloud',async route=>{
    if(route.request().postDataJSON()?.operation==='signInStatus'){
      await route.fulfill({json:{active:false,inApp:true,google:false,email:true}});
      return;
    }
    await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'General',exact:true}).click();
  await page.getByRole('button',{name:'Display',exact:true}).click();
  await page.getByRole('button',{name:'Theme: Dark',exact:true}).click();
  // Open by keyboard: WebKit intentionally does not focus buttons on a pointer click.
  await returnToApps(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  const opener=page.getByRole('button',{name:'Account',exact:true});await opener.focus();await opener.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Alpha',exact:true});
  await expect(dialog).toHaveCSS('background-color','rgb(0, 0, 0)');
  await page.setViewportSize({width:412,height:300});
  await expect(dialog.getByText('Remote agent',{exact:true})).toHaveCount(0);
  const signIn=dialog.getByRole('textbox',{name:'Email',exact:true});
  // The email field may already hold focus from opening; move focus to the dialog first so focusing
  // the field again must bring it into the compact viewport.
  await expect(signIn).toBeEnabled();await dialog.focus();await signIn.focus();await expect(signIn).toBeFocused();await expect(signIn).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.screenshot({path:info.outputPath('focus-restored.png')});
});
