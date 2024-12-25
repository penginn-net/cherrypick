import { deepStrictEqual, strictEqual } from 'assert';
import * as Misskey from 'cherrypick-js';
import { createAccount, type LoginUser, resolveRemoteUser } from './utils.js';

describe('fetch-outbox', () => {
	let alice: LoginUser, bob: LoginUser, carol:LoginUser;
	let bobInAliceHost: Misskey.entities.UserDetailedNotMe, carolInAliceHost: Misskey.entities.UserDetailedNotMe;
	let bobNote: Misskey.entities.Note, bobRenote: Misskey.entities.Note;
	let carolNote: Misskey.entities.Note, carolRenote: Misskey.entities.Note;

	beforeAll(async () => {
		[alice, bob, carol] = await Promise.all([
			createAccount('a.test'),
			createAccount('b.test'),
			createAccount('b.test'),
		]);

		[bobInAliceHost, carolInAliceHost] = await Promise.all([
			resolveRemoteUser('b.test', bob.id, alice),
			resolveRemoteUser('b.test', carol.id, alice),
		]);
		bobNote = (await bob.client.request('notes/create', { text: 'I am Bob!' })).createdNote;
		bobRenote = (await bob.client.request('notes/create', { renoteId: bobNote.id })).createdNote;
		carolNote = (await carol.client.request('notes/create', { text: 'I am Carol!' })).createdNote;
		carolRenote = (await bob.client.request('notes/create', { renoteId: carolNote.id })).createdNote;
	});
	test('includeAnnounce false', async () => {
		await alice.client.request('ap/fetch-outbox', { userId: bobInAliceHost.id, wait: true, includeAnnounce: false });
		const fetch_notes = await alice.client.request('users/notes', { userId: bobInAliceHost.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.length, 1);
		deepStrictEqual(fetch_notes.map(note => note.text?.length), [bobNote.text?.length]);
		deepStrictEqual(fetch_notes.map(note => note.createdAt), [bobNote.createdAt]);
	});
	test('includeAnnounce true(Know User)', async () => {
		await alice.client.request('ap/fetch-outbox', { userId: bobInAliceHost.id, wait: true, includeAnnounce: true });
		const fetch_notes = await alice.client.request('users/notes', { userId: bobInAliceHost.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.length, 2);
		deepStrictEqual(fetch_notes.map(note => note.text?.length), [null, bobNote.text?.length]);
		deepStrictEqual(fetch_notes.map(note => note.createdAt), [bobRenote.createdAt, bobNote.createdAt]);
		strictEqual(fetch_notes[0].renote?.id, fetch_notes[1].id);
	});
	test('includeAnnounce true(New User)', async () => {
		await alice.client.request('ap/fetch-outbox', { userId: carolInAliceHost.id, wait: true, includeAnnounce: true });
		const fetch_notes = await alice.client.request('users/notes', { userId: carolInAliceHost.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.length, 2);
		deepStrictEqual(fetch_notes.map(note => note.text?.length), [null, carolNote.text?.length]);
		deepStrictEqual(fetch_notes.map(note => note.createdAt), [carolRenote.createdAt, carolNote.createdAt]);
		strictEqual(fetch_notes[0].renote?.id, fetch_notes[1].id);
	});
});
