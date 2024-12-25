import { strictEqual } from 'assert';
import * as Misskey from 'cherrypick-js';
import { createAccount, type LoginUser, resolveRemoteUser } from './utils.js';

describe('fetch-outbox', () => {
	let alice: LoginUser, bob: LoginUser;
	let bobInA: Misskey.entities.UserDetailedNotMe, aliceInB: Misskey.entities.UserDetailedNotMe;

	beforeAll(async () => {
		[alice, bob] = await Promise.all([
			createAccount('a.test'),
			createAccount('b.test'),
		]);

		[bobInA, aliceInB] = await Promise.all([
			resolveRemoteUser('b.test', bob.id, alice),
			resolveRemoteUser('a.test', alice.id, bob),
		]);
	});
	test('includeAnnounce true', async () => {
		const note = (await alice.client.request('notes/create', { text: 'I am Yojo!' })).createdNote;
		await bob.client.request('ap/fetch-outbox', { userId: aliceInB.id, wait: true, includeAnnounce: true });
		const fetch_notes = await bob.client.request('users/notes', { userId: aliceInB.id, withReplies: false, withRenotes: true });
		strictEqual(fetch_notes.map(note => note.text)[0], note.text);
	});
});
