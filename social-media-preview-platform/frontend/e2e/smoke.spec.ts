import { expect, test } from '@playwright/test';

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000002000148afa4710000000049454e44ae426082',
  'hex',
);

test('runs the owner and guest review flow', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/start$/);
  await page.locator('#wiz-title').fill(`Smoke ${Date.now()}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+\//);

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

  await shareDialog
    .getByRole('button', { name: 'Revoke', exact: true })
    .click();
  await shareDialog.getByRole('button', { name: 'Confirm revoke' }).click();
  await guestPage.reload();
  await expect(
    guestPage.getByText('This preview link is no longer available.'),
  ).toBeVisible();
  await guest.close();
});
