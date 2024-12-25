import { strictEqual } from 'assert';
import * as Misskey from 'cherrypick-js';
import { createAccount, type LoginUser, resolveRemoteUser } from './utils.js';

describe('fetch-outbox', () => {
	let alice: LoginUser, bob: LoginUser;
	let bobInA: Misskey.entities.UserDetailedNotMe, aliceInB: Misskey.entities.UserDetailedNotMe;
	let note: Misskey.entities.Note, renote: Misskey.entities.Note;

	beforeAll(async () => {
		[alice, bob] = await Promise.all([
			createAccount('a.test'),
			createAccount('b.test'),
		]);

		[bobInA, aliceInB] = await Promise.all([
			resolveRemoteUser('b.test', bob.id, alice),
			resolveRemoteUser('a.test', alice.id, bob),
		]);
		note = (await alice.client.request('notes/create', { text: 'I am Yojo!' })).createdNote;
		renote = (await alice.client.request('notes/create', { renoteId: note.id })).createdNote;
	});
	test('includeAnnounce false', async () => {
		await bob.client.request('ap/fetch-outbox', { userId: aliceInB.id, wait: true, includeAnnounce: false });
		const fetch_notes = await bob.client.request('users/notes', { userId: aliceInB.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.length, 1);
		strictEqual(fetch_notes.map(note => note.text), [note.text]);
		strictEqual(fetch_notes.map(note => note.createdAt), [note.createdAt]);
	});
	test('includeAnnounce true', async () => {
		await bob.client.request('ap/fetch-outbox', { userId: aliceInB.id, wait: true, includeAnnounce: true });
		const fetch_notes = await bob.client.request('users/notes', { userId: aliceInB.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.length, 2);
		strictEqual(fetch_notes.map(note => note.text), [null, note.text]);
		strictEqual(fetch_notes.map(note => note.createdAt), [renote.createdAt, note.createdAt]);
		strictEqual(fetch_notes[0].renote?.id, fetch_notes[1].id);
	});
});
