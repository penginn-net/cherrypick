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
	let polledNote: misskey.entities.Note;
	let clipedNote: misskey.entities.Note;
	let favoritedNote: misskey.entities.Note;
	let carolNote: misskey.entities.Note;

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
		 await	api('drive/files/update', {
			fileId: sensitive1Id,
			isSensitive: true,
		}, bob);

		 await api('drive/files/update', {
			fileId: sensitive2Id,
			isSensitive: true,
		}, bob);

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
	test('センシティブオプション:フィルタなし', async() => {
		const res = await api('notes/advanced-search', {
			query: 'test_sensitive',
			sensitiveFilter: 'combined',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 3);
	});
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
			sensitiveFilter: 'sensitiveOnly',
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
});
