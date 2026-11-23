import {test,expect} from '@playwright/test';
import {cloudNotesVoiceFixture,notesRecorder,openNotesRecorder,recordAndFinish,savedVoiceNotes,noPhysicalOrLocalVoice} from './cloud-notes-voice-fixture';
for(const signed of [false,true])test(`${signed?'Cloud account':'no Cloud account'} keeps the explicit Cloud-only voice policy`,async({page})=>{
 const f=await cloudNotesVoiceFixture(page,signed,true);await openNotesRecorder(page);
 await expect(notesRecorder(page).getByRole('alert')).toHaveCount(0);await recordAndFinish(page);await expect(page.getByRole('button',{name:'Play recording',exact:true})).toBeVisible();expect((await savedVoiceNotes(page))[0].body).toBe('');expect(await page.evaluate(()=>(window as any).cloudNotesVoice.uploads)).toBe(0);
 await expect(page.getByRole('button',{name:/Use development voice|Use browser voice|Transcribe on this device|Transcribe with agent Whisper/})).toHaveCount(0);await noPhysicalOrLocalVoice(page);expect(f.foreign).toEqual([]);
});
