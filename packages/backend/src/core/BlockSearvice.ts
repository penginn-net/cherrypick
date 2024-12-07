/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { BlockingsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class BlockService {
	constructor(
		@Inject(DI.blockingsRepository)
		private blockingsRepository: BlockingsRepository,
	) {

	}

	@bindThis
	public async blockingOrBlocked(userId1: string, userId2: string): Promise<boolean> {
		let block =	await this.blockingsRepository.existsBy({
			blockerId: userId1,
			blockeeId: userId2,
		});
		if (block) return true;

		block = await this.blockingsRepository.existsBy({
			blockerId: userId2,
			blockeeId: userId1,
		});
		if (block) return true;
		return false;
	}
}
