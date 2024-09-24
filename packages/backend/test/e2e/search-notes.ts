/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { text } from 'body-parser';
import { api, post, signup, uploadUrl } from '../utils.js';
import type * as misskey from 'cherrypick-js';
import { query } from '@/misc/prelude/url.js';

describe('検索', () => {
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;
	let carol: misskey.entities.SignupResponse;
	let dave: misskey.entities.SignupResponse;
	let tom: misskey.entities.SignupResponse;
	let root: misskey.entities.SignupResponse;
	let sensitiveFile0_1Note: misskey.entities.Note;
	let sensitiveFile1_2Note: misskey.entities.Note;
	let sensitiveFile2_2Note: misskey.entities.Note;
	let sensitive1Id: string;
	let sensitive2Id: string;
	let file_Attached: misskey.entities.Note;
	let nofile_Attached: misskey.entities.Note;
	let reactedNote: misskey.entities.Note;
	let votedNote: misskey.entities.Note;
	let clipedNote: misskey.entities.Note;
	let favoritedNote: misskey.entities.Note;
	let renotedNote: misskey.entities.Note;
	let replyedNote: misskey.entities.Note;

	beforeAll(async () => {
		root = await signup({ username: 'root' });
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
		carol = await signup({ username: 'carol' });
		dave = await signup({ username: 'dave' });
		tom = await signup({ username: 'tom' });
		const sensitive1 = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/192.jpg');
		const sensitive2 = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/192.png');
		const notSensitive = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/rotate.jpg');
		sensitive1Id = sensitive1.id;
		sensitive2Id = sensitive2.id;

		file_Attached = await post(bob, {
			text: 'filetest',
			fileIds: [notSensitive.id],
		});
		nofile_Attached = await post(bob, {
			text: 'filetest',
		});
		sensitiveFile0_1Note = await post(bob, {
			text: 'test_sensitive',
			fileIds: [notSensitive.id],
		});
		sensitiveFile1_2Note = await post(bob, {
			text: 'test_sensitive',
			fileIds: [sensitive1.id],
		});
		sensitiveFile2_2Note = await post(bob, {
			text: 'test_sensitive',
			fileIds: [sensitive1.id, sensitive2.id],
		});
		reactedNote = await post(carol, { text: 'unindexableUserTest' });
		votedNote = await post(carol, {
			text: 'unindexableUserTest',
			poll: {
				choices: ['1', '2'],
				multiple: false,
			},
		 });
		clipedNote = await post(carol, { text: 'unindexableUserTest' });
		favoritedNote = await post(carol, { text: 'unindexableUserTest' });
		renotedNote = await post(carol, { text: 'unindexableUserTest' });
		replyedNote = await post(carol, { text: 'unindexableUserTest' });
	}, 1000 * 60 * 2);

	test('権限がないのでエラー', async () => {
		const res = await api('notes/advanced-search', {
			query: 'filetest',
		}, alice);

		assert.strictEqual(res.status, 400);
	});
	test('検索ロールへのアサイン', async() => {
		const roleres = await api('admin/roles/create', {
			name: 'test',
			description: '',
			color: null,
			iconUrl: null,
			displayOrder: 0,
			target: 'manual',
			condFormula: {},
			isAdministrator: false,
			isModerator: false,
			isPublic: false,
			isExplorable: false,
			asBadge: false,
			canEditMembersByModerator: false,
			policies: {
				canAdvancedSearchNotes: {
					useDefault: false,
					priority: 1,
					value: true,
				},
				canSearchNotes: {
					useDefault: false,
					priority: 1,
					value: true,
				},

			},
		}, root);

		assert.strictEqual(roleres.status, 200);

		await new Promise(x => setTimeout(x, 2));

		const assign = await api('admin/roles/assign', {
			userId: alice.id,
			roleId: roleres.body.id,
		}, root);
		assert.strictEqual(assign.status, 204);
	});
	test('ファイルオプション:フィルタなし', async() => {
		const res = await api('notes/advanced-search', {
			query: 'filetest',
			fileOption: 'combined',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 2);
	});
	test('ファイルオプション:ファイル付きのみ', async() => {
		const res = await api('notes/advanced-search', {
			query: 'filetest',
			fileOption: 'file-only',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 1);

		const noteIds = res.body.map( x => x.id);

		assert.strictEqual(noteIds.includes(file_Attached.id), true);//添付ありがある
		assert.strictEqual(noteIds.includes(nofile_Attached.id), false);//添付なしがない
	});
	test('ファイルオプション:ファイルなしのみ', async() => {
		const res = await api('notes/advanced-search', {
			query: 'filetest',
			fileOption: 'no-file',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 1);

		const noteIds = res.body.map( x => x.id);

		assert.strictEqual(noteIds.includes(nofile_Attached.id), true);//添付なしがある
		assert.strictEqual(noteIds.includes(file_Attached.id), false);//添付ありがない
	});
	test('センシティブオプション:フラグ付与', async() => {
		//ファイルへセンシティブフラグの付与
		const res1 = await	api('drive/files/update', {
			fileId: sensitive1Id,
			isSensitive: true,
		}, bob);
		assert.strictEqual(res1.status, 200);

		const res2 = await api('drive/files/update', {
			fileId: sensitive2Id,
			isSensitive: true,
		}, bob);
		assert.strictEqual(res2.status, 200);
	});
	test('センシティブオプション:フィルタなし', async() => {
		const res = await api('notes/advanced-search', {
			query: 'test_sensitive',
			sensitiveFilter: 'combined',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 3);
	});
	/*
	DB検索では未実装 別PRで出す
	test('センシティブオプション:含む', async() => {
		const res = await api('notes/advanced-search', {
			query: 'test_sensitive',
			sensitiveFilter: 'includeSensitive',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 2);

		const noteIds = res.body.map( x => x.id);

		assert.strictEqual(noteIds.includes(sensitiveFile0_1Note.id), false);//センシティブなファイルがないノートがない
		//センシティブなファイルがあるノートがある
		assert.strictEqual(noteIds.includes(sensitiveFile1_2Note.id), true);
		assert.strictEqual(noteIds.includes(sensitiveFile2_2Note.id), true);
	});
	test('センシティブオプション:除外', async() => {
		const res = await api('notes/advanced-search', {
			query: 'test_sensitive',
			sensitiveFilter: 'withOutSensitive',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 1);

		const noteIds = res.body.map( x => x.id);
		//センシティブなファイルがないノートがある
		assert.strictEqual(noteIds.includes(sensitiveFile0_1Note.id), true);
		//センシティブなファイルがあるノートがない
		assert.strictEqual(noteIds.includes(sensitiveFile1_2Note.id), false);
		assert.strictEqual(noteIds.includes(sensitiveFile2_2Note.id), false);
	});
	test('センシティブオプション:全センシティブ', async() => {
		const res = await api('notes/advanced-search', {
			query: 'test_sensitive',
			sensitiveFilter: 'withOutSensitive',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 1);

		const noteIds = res.body.map( x => x.id);
		//センシティブなファイルがないノートがない
		assert.strictEqual(noteIds.includes(sensitiveFile0_1Note.id), false);
		//センシティブなファイルを含むノートがない
		assert.strictEqual(noteIds.includes(sensitiveFile1_2Note.id), false);
		//センシティブなファイルのみなノートがある
		assert.strictEqual(noteIds.includes(sensitiveFile2_2Note.id), true);
	});
	*/
	test('indexable false ユーザーのノートは出てこない', async() => {
		const ires = await api('i/update', {
			isIndexable: false,
		}, carol);
		assert.strictEqual(ires.status, 200);
		const asres0 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres0.status, 200);
		assert.strictEqual(Array.isArray(asres0.body), true);
		assert.strictEqual(asres0.body.length, 0);
	});
	test('indexable false リアクションしたら出てくる', async() => {
		const rres = await api('notes/reactions/create', {
			reaction: '❤',
			noteId: reactedNote.id,
		}, alice);
		assert.strictEqual(rres.status, 204);
		const asres1 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres1.status, 200);
		assert.strictEqual(Array.isArray(asres1.body), true);
		assert.strictEqual(asres1.body.length, 1);

		const asnids1 = asres1.body.map( x => x.id);
		assert.strictEqual(asnids1.includes(reactedNote.id), true);
	});
	test('indexable false リノートしたら出てくる', async() => {
		const rnres = await api('notes/create', {
			renoteId: renotedNote.id,
		}, alice);
		assert.strictEqual(rnres.status, 200);
		const asres2 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres2.status, 200);
		assert.strictEqual(Array.isArray(asres2.body), true);
		assert.strictEqual(asres2.body.length, 2);

		const asnids2 = asres2.body.map( x => x.id);
		assert.strictEqual(asnids2.includes(renotedNote.id), true);
	});
	test('indexable false 返信したら出てくる', async() => {
		const rpres = await api('notes/create', {
			text: 'test',
			replyId: replyedNote.id,
		}, alice);
		assert.strictEqual(rpres.status, 200);
		const asres3 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres3.status, 200);
		assert.strictEqual(Array.isArray(asres3.body), true);
		assert.strictEqual(asres3.body.length, 3);

		const asnids3 = asres3.body.map( x => x.id);
		assert.strictEqual(asnids3.includes(replyedNote.id), true);
	});
	test('indexable false お気に入りしたら出てくる', async() => {
		const fvres = await api('notes/favorites/create', {
			noteId: favoritedNote.id,
		}, alice);
		assert.strictEqual(fvres.status, 204);

		const asres4 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres4.status, 200);
		assert.strictEqual(Array.isArray(asres4.body), true);
		assert.strictEqual(asres4.body.length, 4);

		const asnids4 = asres4.body.map( x => x.id);
		assert.strictEqual(asnids4.includes(favoritedNote.id), true);
	});
	test('indexable false クリップしたら出てくる', async() => {
		const clpres = await api('clips/create', {
			noteId: renotedNote.id,
			isPublic: false,
			name: 'test',
		}, alice);
		assert.strictEqual(clpres.status, 200);
		const clpaddres = await api('clips/add-note', {
			clipId: clpres.body.id,
			noteId: clipedNote.id,
		}, alice);
		assert.strictEqual(clpaddres.status, 204);
		const asres5 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres5.status, 200);
		assert.strictEqual(Array.isArray(asres5.body), true);
		assert.strictEqual(asres5.body.length, 5);

		const asnids5 = asres5.body.map( x => x.id);
		assert.strictEqual(asnids5.includes(clipedNote.id), true);
	});
	test('indexable false 投票したら出てくる', async() => {
		const vres = await api('notes/polls/vote', {
			noteId: votedNote.id,
			choice: 0,
		}, alice);
		assert.strictEqual(vres.status, 204);
		const asres6 = await api('notes/advanced-search', {
			query: 'unindexableUserTest',
		}, alice);
		assert.strictEqual(asres6.status, 200);
		assert.strictEqual(Array.isArray(asres6.body), true);
		assert.strictEqual(asres6.body.length, 6);

		const asnids6 = asres6.body.map( x => x.id);
		assert.strictEqual(asnids6.includes(votedNote.id), true);
	});
});