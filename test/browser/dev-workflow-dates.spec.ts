import {test,expect} from '@playwright/test';
test.use({timezoneId:'America/New_York'});

test('overnight reads exclude deleted and archived messages in both source combinations',async({page})=>{
 await page.goto('/?mode=dev');const result=await page.evaluate(async()=>{const {readDatedWorkflowSource}=await import('/src/browser/workflow-dated-sources.ts');localStorage.removeItem('alpha.dev.app.inbox');const receivedAt=Date.parse('2026-10-02T02:00:00Z');const api={get:()=>({mails:[{id:'visible',receivedAt},{id:'deleted',receivedAt,del:true},{id:'archived',receivedAt,arch:true}],sent:[]})};const results=[];for(const label of ['Overnight inbox',"Overnight inbox and today's calendar"]){const value=await readDatedWorkflowSource(label,api,{list:async()=>({events:[]})},new AbortController().signal,new Date('2026-10-02T16:00:00Z'));results.push(value?.inbox?.items.map((row:any)=>row.id));}return results;});expect(result).toEqual([['visible'],['visible']]);
});
