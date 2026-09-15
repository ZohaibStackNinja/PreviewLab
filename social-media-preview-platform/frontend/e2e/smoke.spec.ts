import { expect, test } from '@playwright/test';

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000002000148afa4710000000049454e44ae426082',
  'hex',
);

test('runs the owner and guest review flow', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Create Project' }).click();
  await page.goto('/start');
  await expect(page).toHaveURL(/\/start$/);
  await page.locator('#wiz-title').fill(`Smoke ${Date.now()}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+\//, { timeout: 15_000 });

  const uploadDialog = page
    .getByRole('button', { name: 'Upload image' })
    .first();
  await uploadDialog.click();
  const modal = page.getByRole('dialog', { name: 'Upload image' });
  await modal.locator('input[type="file"]').setInputFiles({
    name: 'smoke.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  });
  await modal.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Creative variants')).toBeVisible();

  await page.getByRole('button', { name: 'Instagram' }).click();
  await page
    .getByRole('navigation', { name: 'Placement' })
    .getByRole('button', { name: 'Profile' })
    .click();
  await page
    .getByRole('group', { name: 'Device mode' })
    .getByRole('button', { name: 'Mobile' })
    .click();
  await expect(page.getByText(/Instagram · Profile/)).toBeVisible();

  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const shareDialog = page.getByRole('dialog', { name: 'Share this preview' });
  await shareDialog.getByRole('button', { name: 'Create link' }).click();
  const linkInput = shareDialog.locator('#share-url');
  await expect(linkInput).toHaveValue(/\/share\//);
  const shareUrl = await linkInput.inputValue();

  // Test Step 2: Copy it and verify feedback
  await shareDialog.getByRole('button', { name: 'Copy' }).first().click();
  await expect(
    shareDialog.getByRole('button', { name: 'Copied' }).first(),
  ).toBeVisible();

  // Test Step 3: Close dialog
  await shareDialog.getByRole('button', { name: 'Close share dialog' }).click();
  await expect(shareDialog).not.toBeVisible();

  // Test Step 4 & 5: Open dialog again and confirm URL is identical
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const reopenedDialog = page.getByRole('dialog', {
    name: 'Share this preview',
  });
  await expect(reopenedDialog.locator('#share-url')).toHaveValue(shareUrl);
  await expect(reopenedDialog.getByText(/Active link · expires/)).toBeVisible();

  // Test Step 6: Copy again
  await reopenedDialog.getByRole('button', { name: 'Copy' }).first().click();
  await expect(
    reopenedDialog.getByRole('button', { name: 'Copied' }).first(),
  ).toBeVisible();

  // Test Step 7 & 8: Refresh project page and open Share again
  await reopenedDialog
    .getByRole('button', { name: 'Close share dialog' })
    .click();
  await page.reload();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const refreshedDialog = page.getByRole('dialog', {
    name: 'Share this preview',
  });

  // Test Step 9: Confirm URL remains identical after full page reload
  await expect(refreshedDialog.locator('#share-url')).toHaveValue(shareUrl);
  await expect(
    refreshedDialog.getByText(/Active link · expires/),
  ).toBeVisible();

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(shareUrl);
  await expect(
    guestPage.getByText('Simulated preview', { exact: true }),
  ).toBeVisible();
  await guestPage
    .getByRole('group', { name: 'Review device mode' })
    .getByRole('button', { name: 'Desktop' })
    .click();
  await expect(guestPage.getByText(/Desktop ·/)).toBeVisible();
  await guestPage.getByLabel('Your name').fill('Smoke reviewer');
  await guestPage
    .getByRole('textbox', { name: 'Comment' })
    .fill('Looks ready for review.');
  await guestPage.getByRole('button', { name: 'Send comment' }).click();
  await expect(guestPage.getByText('Looks ready for review.')).toBeVisible();

  await refreshedDialog
    .getByRole('button', { name: 'Revoke', exact: true })
    .click();
  await refreshedDialog.getByRole('button', { name: 'Confirm revoke' }).click();
  await expect(
    refreshedDialog.getByRole('button', { name: 'Create link' }),
  ).toBeVisible();

  await guestPage.reload();
  await expect(
    guestPage.getByText('This preview link is no longer available.'),
  ).toBeVisible();
  try {
    await guest.close();
  } catch {
    // Context cleanup handled by test fixture
  }
});

test('generates multiple links for each section and supports batch generation', async ({
  page,
}) => {
  await page.goto('/start');
  await page.locator('#wiz-title').fill(`MultiSection ${Date.now()}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+\//, { timeout: 15_000 });

  // Upload an image variant so preview & share are enabled
  const uploadDialog = page
    .getByRole('button', { name: 'Upload image' })
    .first();
  await uploadDialog.click();
  const modal = page.getByRole('dialog', { name: 'Upload image' });
  await modal.locator('input[type="file"]').setInputFiles({
    name: 'smoke.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  });
  await modal.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Creative variants')).toBeVisible();

  // Open Share Dialog
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const shareDialog = page.getByRole('dialog', { name: 'Share this preview' });

  // 1. Create a link for current section (Instagram)
  await shareDialog.getByRole('button', { name: 'Create link' }).click();
  await expect(shareDialog.locator('#share-url')).toHaveValue(/\/share\//);
  const instaUrl = await shareDialog.locator('#share-url').inputValue();

  // 2. Switch section inside modal to YouTube
  await shareDialog.getByRole('button', { name: 'YouTube' }).click();
  // YouTube does not have a link yet, so 'Create link' is visible
  await expect(
    shareDialog.getByRole('button', { name: 'Create link' }),
  ).toBeVisible();
  await shareDialog.getByRole('button', { name: 'Create link' }).click();
  await expect(shareDialog.locator('#share-url')).toHaveValue(/\/share\//);
  const ytUrl = await shareDialog.locator('#share-url').inputValue();
  expect(ytUrl).not.toEqual(instaUrl);

  // 3. Generate a second link for YouTube (+ Generate another link for this section)
  await shareDialog
    .getByRole('button', { name: '+ Generate another link for this section' })
    .click();
  await shareDialog.getByRole('button', { name: 'Create link' }).click();
  await expect(shareDialog.locator('#share-url')).toHaveValue(/\/share\//);
  const yt2Url = await shareDialog.locator('#share-url').inputValue();
  expect(yt2Url).not.toEqual(ytUrl);

  // 4. Verify all links appear in "All links in this project" (should be at least 3 active links)
  await expect(
    shareDialog.getByText(/All links in this project/),
  ).toBeVisible();
  await expect(
    shareDialog.getByText('YouTube · Watch feed · Desktop').first(),
  ).toBeVisible();
  await expect(shareDialog.getByText(/LinkedIn ·/).first()).toBeVisible();

  // 5. Test copying a link from the list
  const copyButtons = shareDialog.locator(
    '.share-list-item button:has-text("Copy")',
  );
  await expect(copyButtons.first()).toBeVisible();
  await copyButtons.first().click();

  // 6. Test batch generation for all 5 platforms
  await shareDialog
    .getByRole('button', { name: /Generate links for all 5 platforms/ })
    .click();
  await expect(
    shareDialog.getByText(/All links in this project/),
  ).toBeVisible();
  await expect(shareDialog.getByText(/TikTok ·/).first()).toBeVisible();
  await expect(shareDialog.getByText(/Facebook ·/).first()).toBeVisible();

  await shareDialog.getByRole('button', { name: 'Close share dialog' }).click();
});
