/*
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { User } from '@nextcloud/e2e-test-server'

import { runOcc } from '@nextcloud/e2e-test-server/docker'
import { createRandomUser } from '@nextcloud/e2e-test-server/playwright'
import { SharingDialogPage } from '../sections/SharingDialogPage.ts'
import { UnifiedShareListPage } from '../sections/UnifiedShareListPage.ts'
import { enableUnifiedSharing } from '../utils/unifiedSharing.ts'
import { test as sharingTest } from './sharing-page.ts'

type UnifiedSharingFixtures = {
	/** The unified share list in the files sidebar. */
	unifiedShareList: UnifiedShareListPage
	/** The unified sharing dialog. */
	sharingDialog: SharingDialogPage
	/** A second account to share with, for specs needing two recipients. */
	secondRecipient: User
	/** A group containing `recipient`, to share with a group recipient. */
	recipientGroup: string
}

type UnifiedSharingWorkerFixtures = {
	/**
	 * Turns the unified sharing API on for the worker and lifts its rate limits.
	 * Auto-used, so every spec built on this fixture gets it.
	 */
	unifiedSharingEnabled: void
}

/**
 * Fixtures for the unified sharing sidebar and dialog. On top of the share
 * editor fixtures (`user` is the sharer, `recipient` a second account) it
 * enables the unified sharing API, which the instance ships disabled.
 *
 * That switch is instance-wide and hides the legacy sidebar sections, so these
 * specs must not run beside specs driving the legacy share editor — hence the
 * serial `unified-sharing` project in `playwright.config.ts`.
 */
export const test = sharingTest.extend<UnifiedSharingFixtures, UnifiedSharingWorkerFixtures>({
	unifiedSharingEnabled: [async ({}, use) => {
		const restore = await enableUnifiedSharing()
		await use()
		await restore()
	}, { scope: 'worker', auto: true }],

	secondRecipient: async ({}, use) => {
		const user = await createRandomUser()
		await use(user)
		await runOcc(['user:delete', user.userId], { failOnError: false })
	},

	recipientGroup: async ({ recipient }, use) => {
		const group = `unified-sharing-${crypto.randomUUID().slice(0, 8)}`
		await runOcc(['group:add', group])
		await runOcc(['group:adduser', group, recipient.userId])
		await use(group)
		await runOcc(['group:delete', group], { failOnError: false })
	},

	unifiedShareList: async ({ page }, use) => {
		await use(new UnifiedShareListPage(page))
	},

	sharingDialog: async ({ page }, use) => {
		await use(new SharingDialogPage(page))
	},
})

export { expect } from '../matchers.ts'
