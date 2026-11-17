import {returnToApps} from './app-navigation';
import {test, expect, type Page} from '@playwright/test';

// AP-16 Alpha behaviours (docs/agentic-comms.md AC-10, AC-24, AC-25, AC-26, AC-30, AC-31).
// Mode: the development build with the agent adapter installed (no ?fixture=1), as in
// chat-continuity.spec.ts and chat-reply-announcement.spec.ts. The agent is an in-page stub of
// alphaClient.send; nothing leaves the page, no model is called and nothing is dialed or sent.
// A test-only `bar` is assigned to the admitted Notes view inside the spec, so the shell treats it
// as a comms view; Phone, Messages and Contacts stay unadmitted outside the AOSP image.
// The proposal, note and faint-suggestion assertions need the shell package's api.propose,
// api.note and faint slot (contract 3.5, 3.9) and run after integration. Browser evidence only:
// this proves nothing about the emulator, the AOSP image or a device.
const BAR = `({target:{kind:'contact',app:'Contacts',name:'Maya Chen',first:'Maya',initials:'MC'},
 closed:{kind:'alpha',placeholder:'Ask about Maya',value:'',onText:null,submit:null,canSubmit:false,maxLength:null,suggestion:null,acceptSuggestion:null},
 left:{icon:'avatar',label:"Back to Maya's card",initials:'MC',run:null},context:'Maya Chen · Contacts',contextKey:'notes:contact:maya',
 strip:{title:'Maya Chen',subtitle:'Contacts',initials:'MC',live:false,actions:[]},end:null,incoming:null,emergency:false,fit:null,
 briefing:'Maya called at 8:22 PM and left a voicemail.'})`;

async function setup(page: Page, options: {comms?: boolean} = {}) {
	await page.route('https://**/*', route => route.abort());
	await page.addInitScript(() => {
		localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'}));
		(window as any).commsAlpha = {sent: [], approved: [], declined: [], acted: []};
		if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw Error('No real microphone'); };
	});
	await page.goto('/?connections=advanced');
	await expect(page.getByRole('textbox', {name: 'Ask Alpha', exact: true})).toBeEnabled();
	await page.evaluate(async ({bar, comms}) => {
		const {Component, VIEWS} = await import('/src/prototype/model.js');
		const {alphaClient} = await import('/src/runtime/alpha-client.ts');
		const {connectionController} = await import('/src/runtime/connection-ui.tsx');
		const f = (window as any).commsAlpha;
		Component.prototype.connectAgent = async () => {};
		// The stub agent answers with whatever the test queued; every request body is captured.
		f.replies = [];
		alphaClient.send = async (text: string) => { f.sent.push(text); return f.replies.shift() ?? {text: 'Noted.'}; };
		alphaClient.approve = async (id: string) => { f.approved.push(id); throw Error('Approval is not part of this test.'); };
		connectionController.rejectProposal = async (id: string) => { f.declined.push(id); };
		if (comms) VIEWS.notes.bar = new Function('return () => ' + bar)();
		VIEWS.notes.actions = {...(VIEWS.notes.actions || {}), commsTest: () => { f.acted.push('commsTest'); sessionStorage.setItem('comms-alpha-acted', '1'); }};
		const render = Component.prototype.renderVals;
		Component.prototype.renderVals = function () { f.shell = this; return render.call(this); };
		connectionController.close();
	}, {bar: BAR, comms: !!options.comms});
	await page.getByRole('button', {name: 'Notes', exact: true}).click();
	await expect.poll(() => page.evaluate(() => !!(window as any).commsAlpha.shell)).toBe(true);
	await page.evaluate(() => { (window as any).commsAlpha.shell.connectAgent = async () => {}; });
}
const fixture = (page: Page) => page.evaluate(() => { const f = (window as any).commsAlpha; return {sent: f.sent, approved: f.approved, declined: f.declined, acted: f.acted}; });
const proposal = (id: string, number: string) => ({id, title: 'Place call', description: `Number: ${number}\n\nCalls this number from your phone after you confirm. An emergency number opens your phone app instead.`, expiresAt: Date.now() + 600_000, contextRevision: 0});
async function ask(page: Page, text: string) {
	await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'sheet'}));
	const input = page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]');
	await input.fill(text);
	await input.press('Enter');
}

test.describe('comms Alpha (dev build, agent adapter installed)', () => {
	test('a second proposal replaces the first, and neither executes without a tap (AC-26)', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(p => (window as any).commsAlpha.replies.push({text: 'I can call her.', proposals: [p]}), proposal('first', '+14155550132'));
		await ask(page, 'Call Maya');
		const cards = page.locator('[data-alpha-chat-proposal]');
		await expect(cards).toHaveCount(1);
		await expect(cards.first().locator('[data-alpha-proposal-detail]')).toHaveText('(415) 555-0132');
		await page.evaluate(p => (window as any).commsAlpha.replies.push({text: 'Or her office.', proposals: [p]}), proposal('second', '+14155550199'));
		await ask(page, 'Her office instead');
		await expect(cards).toHaveCount(2);
		await expect(cards.nth(0).getByRole('button')).toHaveCount(0);
		await expect(cards.nth(0)).toContainText('Replaced');
		await expect(cards.nth(1).getByRole('button', {name: 'Call: Call (415) 555-0199'})).toBeVisible();
		await expect(cards.nth(1).locator('[data-alpha-proposal-detail]')).toHaveText('(415) 555-0199 · not in Contacts');
		// The replaced proposal is declined upstream; nothing was approved, dialed or sent.
		await expect.poll(async () => (await fixture(page)).declined).toEqual(['first']);
		expect((await fixture(page)).approved).toEqual([]);
	});

	test('an approved proposal completes once: the card shows the result and no quote repeats it', async ({page}) => {
		// Pixel 10a, 2026-11-17 ("Create a new contact - shaw 4153024399"): the approved card read
		// "Completed · The owner approved and the contact was saved on the phone." and the same
		// sentence was also printed as a quoted line above the card.
		await setup(page, {comms: true});
		await page.evaluate(() => {
			const f = (window as any).commsAlpha;
			f.replies.push({text: 'Review this request on your phone before it can run.', proposals: [{id: 'contact-1', title: 'Create contact', description: 'Name: Shaw\nPhone: (415) 302-4399', expiresAt: Date.now() + 600_000, contextRevision: 0}]});
		});
		await ask(page, 'Create a new contact - shaw 4153024399');
		const card = page.locator('[data-alpha-chat-proposal]');
		await expect(card.getByRole('button', {name: 'Approve: Create contact'})).toBeVisible();
		await page.evaluate(async () => {
			const {alphaClient} = await import('/src/runtime/alpha-client.ts');
			const f = (window as any).commsAlpha;
			alphaClient.approve = async (id: string) => { f.approved.push(id); return {proposalId: id, status: 'succeeded', summary: 'Contact saved.'} as any; };
		});
		await card.getByRole('button', {name: 'Approve: Create contact'}).click();
		await expect.poll(async () => (await fixture(page)).approved).toEqual(['contact-1']);
		const chat = page.locator('[data-alpha-layer="conversation"]');
		await expect(card.locator('[data-alpha-proposal-detail]')).toHaveText('Contact saved.');
		await expect(chat.getByText('Contact saved.', {exact: true})).toHaveCount(1);
		await expect(chat.locator('[data-alpha-device-receipt="true"]')).toHaveCount(0);
	});

	test('the call approval card names the person and the number (AC-20)', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(p => (window as any).commsAlpha.replies.push({text: 'I can call her.', proposals: [p]}), proposal('n', '+14155550132'));
		await ask(page, 'Call Maya');
		const card = page.locator('[data-alpha-chat-proposal]');
		await expect(card.getByRole('button', {name: 'Call: Call Maya Chen'})).toBeVisible();
		await expect(card.locator('[data-alpha-proposal-detail]')).toHaveText('(415) 555-0132');
		// A contact target shows the contact's one number.
		await page.evaluate(() => (window as any).commsAlpha.replies.push({text: 'Calling Maya?', proposals: [{id: 'c', title: 'Place call', description: 'Contact: Maya\n\nCalls this number from your phone after you confirm.', expiresAt: Date.now() + 600_000, contextRevision: 0}]}));
		await ask(page, 'Call Maya again');
		await expect(card.nth(1).getByRole('button', {name: 'Call: Call Maya Chen'})).toBeVisible();
		await expect(card.nth(1).locator('[data-alpha-proposal-detail]')).toHaveText('(415) 555-0132');
		expect((await fixture(page)).approved).toEqual([]);
	});

	test('a "Screen it" card belongs to one ring and is retired when that ring ends (AC-21)', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(async bar => {
			const {VIEWS} = await import('/src/prototype/model.js');
			const base = new Function('return ' + bar)();
			const w = window as any;
			w.ring = 'ring-1';
			VIEWS.notes.bar = () => ({...base, target: {...base.target, kind: 'incoming', app: 'Phone'}, contextKey: 'notes:incoming:maya',
				incoming: w.ring ? {id: w.ring, answer() {}, decline() {}, screen() {}} : null});
			w.commsAlpha.shell.setState({chat: 'sheet'});
		}, BAR);
		const screen = () => page.evaluate(() => (window as any).commsAlpha.shell.S().msgs.filter((m: any) => m.card?.kind === 'screen').map((m: any) => [m.card.args.ring, m.card.state]));
		await expect.poll(screen).toEqual([['ring-1', 'open']]);
		// The ring ends: its card can never screen a later call.
		await page.evaluate(() => { (window as any).ring = null; (window as any).commsAlpha.shell.setState({}); });
		await expect.poll(screen).toEqual([['ring-1', 'replaced']]);
		// The same caller rings again: a new card for the new ring.
		await page.evaluate(() => { (window as any).ring = 'ring-2'; (window as any).commsAlpha.shell.setState({}); });
		await expect.poll(screen).toEqual([['ring-1', 'replaced'], ['ring-2', 'open']]);
	});

	test('reopening the chat on an unchanged subject adds no new briefing (AC-25)', async ({page}) => {
		await setup(page, {comms: true});
		const briefing = page.locator('[data-alpha-layer="conversation"]').getByText('Maya called at 8:22 PM and left a voicemail.', {exact: true});
		await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'sheet'}));
		await expect(briefing).toHaveCount(1);
		await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'input'}));
		await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'sheet'}));
		await page.waitForTimeout(300);
		await expect(briefing).toHaveCount(1);
		// AC-31: the briefing is a local line; it is never part of what is sent to the agent.
		await ask(page, 'Thanks');
		await expect.poll(async () => (await fixture(page)).sent).toEqual(['Thanks']);
	});

	test('automatic suggestions are absent while the composer remains editable', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(async () => { const {VIEWS} = await import('/src/prototype/model.js'); VIEWS.notes.suggestions = () => ['Set a reminder', 'Ask Maya about 3:30']; });
		await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'sheet', draft: ''}));
		const faint = page.locator('[data-alpha-faint]');
		await expect(faint).toHaveCount(0);
		await page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]').fill('Ask Maya about 3:30');
		await expect(page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]')).toHaveValue('Ask Maya about 3:30');
		expect((await fixture(page)).sent).toEqual([]);
	});

	test('an open proposal survives a reload as a card and is not executed (AC-30)', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(() => (window as any).commsAlpha.shell.propose({id: 'restore-1', kind: 'other', title: 'Save Maya to favourites', detail: 'Maya Chen', button: 'Save', acts: true, act: {mod: 'notes', fn: 'commsTest'}, args: {}}, 'Want me to save her?'));
		await expect(page.locator('[data-alpha-chat-proposal]')).toHaveCount(1);
		await page.waitForTimeout(500);
		await page.reload();
		await expect(page.locator('[data-alpha-chat-proposal]', {hasText: 'Save Maya to favourites'})).toHaveCount(1, {timeout: 20_000});
		expect(await page.evaluate(() => sessionStorage.getItem('comms-alpha-acted'))).toBeNull();
	});

	test('a request typed to Alpha returns after a reload (AC-10, Alpha half)', async ({page}) => {
		await setup(page);
		await page.evaluate(() => (window as any).commsAlpha.shell.setState({chat: 'sheet'}));
		const input = page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]');
		await input.fill('Ask Maya if 3:15 works');
		await page.waitForTimeout(800);
		await page.reload();
		await expect(page.getByRole('textbox', {name: 'Ask Alpha', exact: true})).toBeEnabled();
		await page.evaluate(async () => {
			const {Component} = await import('/src/prototype/model.js');
			const render = Component.prototype.renderVals;
			Component.prototype.renderVals = function () { (window as any).commsAlpha.shell = this; return render.call(this); };
		});
		await returnToApps(page);
		await page.getByRole('button', {name: 'Open conversation', exact: true}).click();
		await expect(page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]')).toHaveValue('Ask Maya if 3:15 works', {timeout: 20_000});
		expect((await fixture(page)).sent).toEqual([]);
	});

	test('local lines never reach a request to the agent (AC-31)', async ({page}) => {
		await setup(page, {comms: true});
		await page.evaluate(() => (window as any).commsAlpha.shell.api('notes').note('Sent to Maya Chen'));
		await ask(page, 'What did she say?');
		await expect.poll(async () => (await fixture(page)).sent).toEqual(['What did she say?']);
		const local = await page.evaluate(() => (window as any).commsAlpha.shell.S().msgs.find((m: any) => m.text === 'Sent to Maya Chen'));
		expect(local).toMatchObject({local: true, from: 'agent'});
		expect(await page.evaluate(() => { const shell = (window as any).commsAlpha.shell; const m = shell.S().msgs.find((m: any) => m.local); return shell.canReplyMessage(m); })).toBe(false);
	});
});
