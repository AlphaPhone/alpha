import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import { returnToApps } from './app-navigation';
import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
const contents='Public fact: twelve raised beds.\nPRIVATE OMIT: do not send this line.';
test('unverifiable source can be explicitly omitted without blocking the reviewed question',async({page})=>{
 await page.goto('/');await page.evaluate(async()=>{const{reviewContentQuestion}=await import('/src/browser/content-question.ts');(window as any).sourceOptOut=null;reviewContentQuestion({name:'large-document.txt',text:'Reviewed excerpt',current:()=>true,source:async()=>{throw Error('Over attachment limit');},compose:(text,source)=>(window as any).sourceOptOut={text,source:source??null}});});
 const review=page.getByRole('dialog',{name:'Ask about selected content'});await review.getByRole('button',{name:'Use in conversation',exact:true}).click();await expect(review.getByRole('status')).toContainText('Source unverified');await review.getByRole('checkbox').uncheck();await review.getByRole('textbox',{name:'Content excerpt'}).fill('Edited excerpt');await review.getByRole('button',{name:'Use in conversation',exact:true}).click();await expect(review).toHaveCount(0);expect(await page.evaluate(()=>(window as any).sourceOptOut)).toEqual({text:'Summarize this excerpt.\n\nSource: large-document.txt\n\nEdited excerpt',source:null});
});

