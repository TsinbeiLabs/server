/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import UnifiedShareEntry from './UnifiedShareEntry.vue'
import { openShareEditDialog } from '../services/SharingDialog.ts'
import { deleteShare, removeRecipient } from '../services/unifiedShares.ts'

vi.mock('../services/SharingDialog.ts', () => ({
	openShareEditDialog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/unifiedShares.ts', () => ({
	deleteShare: vi.fn().mockResolvedValue(undefined),
	removeRecipient: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/logger.ts', () => ({
	default: { error: vi.fn(), debug: vi.fn() },
}))

const recipient = { class: 'UserRecipient', value: 'bob', instance: null }

function buildContext(overrides: Record<string, unknown> = {}) {
	return {
		share: { id: '42' },
		fileInfo: { node: { fileid: 1 } },
		confirm: vi.fn().mockResolvedValue(true),
		$emit: vi.fn(),
		...overrides,
	}
}

type Ctx = ReturnType<typeof buildContext>

/**
 * Call a component method with a fake `this`, as the other specs here do.
 *
 * @param method The method name
 * @param ctx The fake component context
 * @param args Arguments passed to the method
 */
function call(method: string, ctx: Ctx, ...args: unknown[]) {
	return UnifiedShareEntry.methods[method].call(ctx, ...args)
}

beforeEach(() => vi.clearAllMocks())

describe('openEditDialog', () => {
	it('refreshes the list once the dialog closes', async () => {
		const ctx = buildContext()
		await call('openEditDialog', ctx)
		expect(openShareEditDialog).toHaveBeenCalledWith('42', ctx.fileInfo.node)
		expect(ctx.$emit).toHaveBeenCalledWith('refresh')
	})

	it('still refreshes when the dialog fails', async () => {
		vi.mocked(openShareEditDialog).mockRejectedValueOnce(new Error('nope'))
		const ctx = buildContext()
		await call('openEditDialog', ctx)
		// The dialog writes straight to the backend, so it may have applied
		// changes before it errored.
		expect(ctx.$emit).toHaveBeenCalledWith('refresh')
	})
})

describe('confirmDeleteShare', () => {
	it('deletes the share and refreshes once confirmed', async () => {
		const ctx = buildContext()
		await call('confirmDeleteShare', ctx)
		expect(deleteShare).toHaveBeenCalledWith('42')
		expect(ctx.$emit).toHaveBeenCalledWith('refresh')
	})

	it('does not delete the share when the confirmation is declined', async () => {
		const ctx = buildContext({ confirm: vi.fn().mockResolvedValue(false) })
		await call('confirmDeleteShare', ctx)
		expect(deleteShare).not.toHaveBeenCalled()
		expect(ctx.$emit).not.toHaveBeenCalled()
	})

	it('does not refresh when the deletion fails', async () => {
		vi.mocked(deleteShare).mockRejectedValueOnce(new Error('nope'))
		const ctx = buildContext()
		await call('confirmDeleteShare', ctx)
		expect(ctx.$emit).not.toHaveBeenCalled()
	})
})

describe('removeOne', () => {
	it('removes the recipient and refreshes', async () => {
		const ctx = buildContext()
		await call('removeOne', ctx, recipient)
		expect(removeRecipient).toHaveBeenCalledWith('42', 'UserRecipient', 'bob', null)
		expect(ctx.$emit).toHaveBeenCalledWith('refresh')
	})

	it('does not refresh when the removal fails', async () => {
		vi.mocked(removeRecipient).mockRejectedValueOnce(new Error('nope'))
		const ctx = buildContext()
		await call('removeOne', ctx, recipient)
		expect(ctx.$emit).not.toHaveBeenCalled()
	})
})
