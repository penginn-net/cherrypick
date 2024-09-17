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
	let sensitiveFile0_1Note: misskey.entities.Note;
	let sensitiveFile1_2Note: misskey.entities.Note;
	let sensitiveFile2_2Note: misskey.entities.Note;
	let file_Attached: misskey.entities.Note;
	let nofile_Attached: misskey.entities.Note;
	let polledNote: misskey.entities.Note;
	let clipedNote: misskey.entities.Note;
	let favoritedNote: misskey.entities.Note;
	let carolNote: misskey.entities.Note;

	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
		carol = await signup({ username: 'carol' });
		dave = await signup({ username: 'dave' });
		tom = await signup({ username: 'tom' });
		const sensitive1 = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/192.jpg');
		const sensitive2 = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/192.png');
		const notSensitive = await uploadUrl(bob, 'https://raw.githubusercontent.com/yojo-art/cherrypick/develop/packages/backend/test/resources/rotate.jpg');
		//
		api('drive/files/update', {
			fileId: sensitive1.id,
			isSensitive: true,
		}, bob);
		api('drive/files/update', {
			fileId: sensitive2.id,
			isSensitive: true,
		}, bob);

		file_Attached = await post(bob, {
			text: 'filetest',
		});
		nofile_Attached = await post(bob, {
			text: 'filetest',
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

	test('withFiles', async () => {
		const res = await api('notes/advanced-search', {
			query: 'filetest',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(Array.isArray(res.body), true);
		assert.strictEqual(res.body.length, 3);
		test.todo(res.body);
	});
});
