/*
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { runOcc } from '@nextcloud/e2e-test-server/docker'
import { expect, test } from '../../support/fixtures/sharing-page.ts'
import { mkdir } from '../../support/utils/dav.ts'
import { createShare, openSharingPanel } from '../../support/utils/sharing.ts'

/**
 * The unified sharing API is the killswitch for the new sidebar: with no API
 * version advertised in the capabilities, the sidebar falls back to the legacy
 * sections. The API ships enabled, so this spec turns it off explicitly, unlike
 * its siblings.
 */
test.describe('files_sharing: sidebar without the unified sharing API', () => {
	test.beforeAll(async () => {
		await runOcc(['config:system:set', 'sharing.unified_api_enable', '--value', 'false', '--type', 'boolean'])
	})

	// The sibling specs share this worker and expect the API on. Their worker
	// fixture only enables it once, so put it back rather than relying on this
	// file running first.
	test.afterAll(async () => {
		await runOcc(['config:system:set', 'sharing.unified_api_enable', '--value', 'true', '--type', 'boolean'])
	})

	test('falls back to the legacy share sections', async ({ page, user, recipient, filesListPage, sharingTab }) => {
		await mkdir(page.request, user, '/legacy')
		await createShare(page.request, '/legacy', recipient.userId)
		await filesListPage.open()
		await openSharingPanel(filesListPage, sharingTab, 'legacy')

		const tab = page.locator('.sharingTab')
		await expect(tab.getByText('Internal shares')).toBeVisible()
		await expect(tab.locator('.unified-share-list')).toHaveCount(0)
		// The legacy editor still lists the share it was given.
		await expect(tab.getByText(recipient.userId).first()).toBeVisible()
	})
})
