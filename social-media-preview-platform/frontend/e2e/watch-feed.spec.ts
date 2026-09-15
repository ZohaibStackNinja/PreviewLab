import { expect, test } from '@playwright/test';

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000002000148afa4710000000049454e44ae426082',
  'hex',
);

test.describe('Watch Feed Preview — Desktop and Mobile layout & responsiveness', () => {
  test('verifies desktop two-column and mobile single-column layouts across viewports', async ({
    page,
  }) => {
    // 1. Create a project and upload creative
    await page.goto('/');
    await page.getByRole('button', { name: '+ Create Project' }).click();
    await page.goto('/start');
    await expect(page).toHaveURL(/\/start$/);
    await page.locator('#wiz-title').fill(`WatchFeed ${Date.now()}`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Create Project' }).click();
    await expect(page).toHaveURL(/\/project\/[^/]+\//);

    // Upload an image
    const uploadDialog = page
      .getByRole('button', { name: 'Upload image' })
      .first();
    await uploadDialog.click();
    const modal = page.getByRole('dialog', { name: 'Upload image' });
    await modal.locator('input[type="file"]').setInputFiles({
      name: 'creative_hero.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await modal.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByText('Creative variants')).toBeVisible();

    // Select YouTube -> Watch feed
    await page.getByRole('button', { name: 'YouTube' }).click();
    await expect(page.getByText(/YouTube · Watch feed/)).toBeVisible();

    // ----------------------------------------------------
    // DESKTOP LAYOUT VERIFICATION (1280px+)
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 900 });

    // Verify Desktop structure
    const watchContainer = page.locator('.yt-watch');
    await expect(watchContainer).toBeVisible();

    const mainContent = page.locator('.yt-watch-main');
    const recSidebar = page.locator('.yt-watch-side');

    await expect(mainContent).toBeVisible();
    await expect(recSidebar).toBeVisible();

    // Verify Main Content components:
    // 1. Main video player
    const player = mainContent.locator('.yt-player');
    await expect(player).toBeVisible();
    await expect(player.locator('img')).toBeVisible();
    await expect(player.locator('.yt-player-progress-bar')).toBeVisible();

    // 2. Video title
    const title = mainContent.locator('.yt-vtitle');
    await expect(title).toBeVisible();
    await expect(title).toContainText('campaign hero');

    // 3. Profile/channel row & verified badge
    const chRow = mainContent.locator('.yt-chrow');
    await expect(chRow).toBeVisible();
    await expect(chRow.locator('.yt-badge-check')).toBeVisible();
    await expect(chRow.locator('.yt-subbtn')).toBeVisible();

    // 4. Primary actions
    await expect(chRow.locator('.yt-pill-group')).toBeVisible();
    await expect(chRow.getByRole('button', { name: 'Share' })).toBeVisible();
    await expect(chRow.getByRole('button', { name: 'Download' })).toBeVisible();

    // 5. Description box & metadata
    const descBox = mainContent.locator('.yt-descbox');
    await expect(descBox).toBeVisible();
    await expect(descBox.locator('.yt-desc-meta')).toContainText('views');

    // 6. Comments section
    const commentsSec = mainContent.locator('.yt-comments-section');
    await expect(commentsSec).toBeVisible();
    await expect(commentsSec.locator('.yt-comments-count')).toContainText(
      'Comments',
    );
    await expect(commentsSec.locator('.yt-comment')).toHaveCount(4);
    await expect(commentsSec.locator('.yt-comment-pinned')).toBeVisible();

    // Verify Recommendations Sidebar:
    await expect(recSidebar.locator('.yt-rec-chips')).toBeVisible();
    const recCards = recSidebar.locator('.yt-rec-card');
    await expect(recCards).toHaveCount(7);
    await expect(
      recCards.first().locator('.yt-rec-thumb .yt-duration'),
    ).toBeVisible();
    await expect(recCards.first().locator('.yt-rec-title')).toBeVisible();
    await expect(recCards.first().locator('.yt-rec-channel')).toBeVisible();
    await expect(recCards.first().locator('.yt-rec-meta')).toBeVisible();

    // Verify 2-column positioning (Main on left, Sidebar on right)
    const mainBox = await mainContent.boundingBox();
    const sideBox = await recSidebar.boundingBox();
    expect(mainBox).toBeTruthy();
    expect(sideBox).toBeTruthy();
    expect(sideBox!.x).toBeGreaterThan(mainBox!.x);

    // ----------------------------------------------------
    // RESPONSIVE TESTING (DESKTOP MODE AT 1024px & 768px)
    // ----------------------------------------------------
    for (const width of [1024, 768]) {
      await page.setViewportSize({ width, height: 850 });
      await page.waitForTimeout(100);

      // Check for horizontal page overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 2
        );
      });
      expect(hasHorizontalScroll).toBe(false);
    }

    // ----------------------------------------------------
    // MOBILE MODE VERIFICATION (Phone frame & sequential flow)
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 900 });
    await page
      .getByRole('group', { name: 'Device mode' })
      .getByRole('button', { name: 'Mobile' })
      .click();

    const mobileWatch = page.locator('.yt-mwatch');
    await expect(mobileWatch).toBeVisible();

    // Verify top-to-bottom sequence:
    // Video -> Title -> Channel -> Actions -> Metadata -> Recommendations
    const mobilePlayer = page.locator('.yt-mbody .yt-player.yt-bleed');
    await expect(mobilePlayer).toBeVisible();

    const mTitle = page.locator('.yt-mwatch-title');
    await expect(mTitle).toBeVisible();

    const mChRow = page.locator('.yt-mwatch-chrow');
    await expect(mChRow).toBeVisible();
    await expect(mChRow.locator('.yt-subbtn')).toBeVisible();

    const mActions = page.locator('.yt-mchips');
    await expect(mActions).toBeVisible();

    const mCommentsBox = page.locator('.yt-mcomments-box');
    await expect(mCommentsBox).toBeVisible();

    const mRecList = page.locator('.yt-m-rec-list');
    await expect(mRecList).toBeVisible();
    await expect(mRecList.locator('.yt-m-rec-item')).toHaveCount(7);

    // Verify sequence order by vertical coordinate Y:
    const playerBox = await mobilePlayer.boundingBox();
    const titleBox = await mTitle.boundingBox();
    const chBox = await mChRow.boundingBox();
    const actionsBox = await mActions.boundingBox();
    const commentsBox = await mCommentsBox.boundingBox();
    const recBox = await mRecList.boundingBox();

    expect(titleBox!.y).toBeGreaterThan(playerBox!.y);
    expect(chBox!.y).toBeGreaterThan(titleBox!.y);
    expect(actionsBox!.y).toBeGreaterThan(chBox!.y);
    expect(commentsBox!.y).toBeGreaterThan(actionsBox!.y);
    expect(recBox!.y).toBeGreaterThan(commentsBox!.y);

    // ----------------------------------------------------
    // RESPONSIVE TESTING (320px, 375px, 390px, 414px)
    // ----------------------------------------------------
    for (const width of [414, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 750 });
      await page.waitForTimeout(150);

      const overflowDetails = await page.evaluate(() => {
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(overflowDetails.scrollWidth).toBeLessThanOrEqual(
        overflowDetails.clientWidth + 2,
      );
    }
  });
});
