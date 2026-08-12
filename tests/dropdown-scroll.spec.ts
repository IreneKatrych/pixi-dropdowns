import { expect, test } from '@playwright/test';
import {
  DROPDOWN_IDS,
  expectDropdownState,
  getBoundsCenter,
  getDropdown,
  openDropdown,
  openTestPage,
} from './helpers/dropdownTestHelpers';

const LARGE_DATASET_OPTION_COUNT = 10_000;
const MAX_RENDERED_POOL_SIZE = 7;
const MAX_VISIBLE_OPTION_COUNT = 6;
const RECYCLE_SCROLL_DELTA = 1_200;
const OVERSCROLL_DELTA = 10_000_000;
const TOUCH_POINTER_ID = 7;

test.describe('Virtualized dropdown scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
    await openDropdown(page, DROPDOWN_IDS.largeDataset);
  });

  test('keeps the rendered pool bounded for 10,000 options', async ({ page }) => {
    const { state, visibleOptions } = await getDropdown(
      page,
      DROPDOWN_IDS.largeDataset,
    );

    expect(state.optionCount).toBe(LARGE_DATASET_OPTION_COUNT);
    expect(state.renderedItemCount).toBeLessThanOrEqual(MAX_RENDERED_POOL_SIZE);
    expect(visibleOptions.length).toBeLessThanOrEqual(
      MAX_VISIBLE_OPTION_COUNT,
    );
  });

  test('scrolls with the mouse wheel and recycles visible options', async ({
    page,
  }) => {
    const before = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    await page.mouse.move(...getBoundsCenter(before.listBounds!));
    await page.mouse.wheel(0, RECYCLE_SCROLL_DELTA);

    await expect
      .poll(
        async () =>
          (await getDropdown(page, DROPDOWN_IDS.largeDataset)).state.scrollY,
      )
      .toBeGreaterThan(0);
    const after = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    expect(after.visibleOptions[0]?.optionId).not.toBe(
      before.visibleOptions[0]?.optionId,
    );
    expect(after.state.renderedItemCount).toBe(before.state.renderedItemCount);
  });

  test('clamps wheel scrolling at the top and bottom', async ({ page }) => {
    const opened = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    await page.mouse.move(...getBoundsCenter(opened.listBounds!));
    await page.mouse.wheel(0, OVERSCROLL_DELTA);
    await expect
      .poll(
        async () =>
          (await getDropdown(page, DROPDOWN_IDS.largeDataset)).state.scrollY,
      )
      .toBeGreaterThan(0);
    const firstBottom = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    await page.mouse.wheel(0, OVERSCROLL_DELTA);
    const secondBottom = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    expect(secondBottom.state.scrollY).toBe(firstBottom.state.scrollY);
    await page.mouse.wheel(0, -OVERSCROLL_DELTA);
    await expectDropdownState(page, DROPDOWN_IDS.largeDataset, { scrollY: 0 });
  });

  test('scrolls through touch pointer drag', async ({ page }) => {
    const snapshot = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    const listBounds = snapshot.listBounds!;
    const [centerX, centerY] = getBoundsCenter(listBounds);
    const touchDragDistance = listBounds.height / 4;

    await page.dispatchEvent('canvas', 'pointerdown', {
      pointerId: TOUCH_POINTER_ID,
      pointerType: 'touch',
      clientX: centerX,
      clientY: centerY + touchDragDistance,
      bubbles: true,
    });
    await page.dispatchEvent('canvas', 'pointermove', {
      pointerId: TOUCH_POINTER_ID,
      pointerType: 'touch',
      clientX: centerX,
      clientY: centerY - touchDragDistance,
      bubbles: true,
    });
    await page.dispatchEvent('canvas', 'pointerup', {
      pointerId: TOUCH_POINTER_ID,
      pointerType: 'touch',
      clientX: centerX,
      clientY: centerY - touchDragDistance,
      bubbles: true,
    });

    await expect
      .poll(
        async () =>
          (await getDropdown(page, DROPDOWN_IDS.largeDataset)).state.scrollY,
      )
      .toBeGreaterThan(0);
  });

  test('scrolls by dragging the scrollbar thumb', async ({ page }) => {
    const snapshot = await getDropdown(page, DROPDOWN_IDS.largeDataset);
    const thumbBounds = snapshot.scrollbarThumbBounds;

    expect(thumbBounds, 'Expected a visible scrollbar thumb').not.toBeNull();
    const [centerX, centerY] = getBoundsCenter(thumbBounds!);
    const dragDistance = snapshot.listBounds!.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY + dragDistance);
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          (await getDropdown(page, DROPDOWN_IDS.largeDataset)).state.scrollY,
      )
      .toBeGreaterThan(0);
  });
});
