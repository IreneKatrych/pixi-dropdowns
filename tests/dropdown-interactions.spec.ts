import { expect, test } from '@playwright/test';
import {
  DROPDOWN_IDS,
  clickEmptyCanvasArea,
  clickHeader,
  clickOption,
  expectDropdownState,
  getBoundsCenter,
  getDropdown,
  getSelections,
  openDropdown,
  openTestPage,
} from './helpers/dropdownTestHelpers';

const RAPID_CLICK_COUNT = 7;
const RESIZED_VIEWPORT = { width: 700, height: 700 } as const;

test.describe('Dropdown interactions', () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test('starts with the category closed and its dependent dropdown disabled', async ({
    page,
  }) => {
    await expectDropdownState(page, DROPDOWN_IDS.category, {
      isOpen: false,
      isDisabled: false,
      selectedOptionId: null,
    });
    await expectDropdownState(page, DROPDOWN_IDS.categoryItems, {
      isOpen: false,
      isDisabled: true,
      optionCount: 0,
    });
    expect(await getSelections(page)).toEqual([]);
  });

  test('opens and closes from the header', async ({ page }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await clickHeader(page, DROPDOWN_IDS.category);
    await expectDropdownState(page, DROPDOWN_IDS.category, {
      isOpen: false,
      isListInteractive: false,
    });
  });

  test('selects an icon option, closes, and emits selection data', async ({
    page,
  }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await clickOption(page, DROPDOWN_IDS.category, 'fruit');

    await expectDropdownState(page, DROPDOWN_IDS.category, {
      isOpen: false,
      selectedOptionId: 'fruit',
      selectedOptionHasIcon: true,
      isValueIconVisible: true,
    });
    await expect.poll(() => getSelections(page)).toEqual([
      {
        dropdownId: DROPDOWN_IDS.category,
        optionId: 'fruit',
        optionLabel: 'Fruit',
        hasIcon: true,
      },
    ]);
  });

  test('does not open the disabled dependent dropdown', async ({ page }) => {
    await clickHeader(page, DROPDOWN_IDS.categoryItems);
    await expectDropdownState(page, DROPDOWN_IDS.categoryItems, {
      isOpen: false,
      isDisabled: true,
      selectedOptionId: null,
    });
  });

  test('treats a disabled dropdown click as outside another open dropdown', async ({
    page,
  }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await clickHeader(page, DROPDOWN_IDS.categoryItems);

    await expectDropdownState(page, DROPDOWN_IDS.category, { isOpen: false });
    await expectDropdownState(page, DROPDOWN_IDS.categoryItems, {
      isOpen: false,
      isDisabled: true,
    });
  });

  test('unlocks and populates the dependent dropdown after category selection', async ({
    page,
  }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await clickOption(page, DROPDOWN_IDS.category, 'vegetables');

    await expectDropdownState(page, DROPDOWN_IDS.categoryItems, {
      isDisabled: false,
      optionCount: 28,
      selectedOptionId: null,
    });
    await openDropdown(page, DROPDOWN_IDS.categoryItems);
    await clickOption(page, DROPDOWN_IDS.categoryItems, 'vegetables-1');
    await expectDropdownState(page, DROPDOWN_IDS.categoryItems, {
      selectedOptionId: 'vegetables-1',
      isOpen: false,
    });
  });

  test('closes on an outside click', async ({ page }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await clickEmptyCanvasArea(page);

    await expectDropdownState(page, DROPDOWN_IDS.category, { isOpen: false });
  });

  test('opening one dropdown closes another', async ({ page }) => {
    await openDropdown(page, DROPDOWN_IDS.category);
    await openDropdown(page, DROPDOWN_IDS.largeDataset);

    await expectDropdownState(page, DROPDOWN_IDS.category, { isOpen: false });
    await expectDropdownState(page, DROPDOWN_IDS.largeDataset, {
      isOpen: true,
    });
  });

  test('remains consistent after rapid header clicks', async ({ page }) => {
    for (let clickIndex = 0; clickIndex < RAPID_CLICK_COUNT; clickIndex += 1) {
      await clickHeader(page, DROPDOWN_IDS.category);
    }

    await expectDropdownState(page, DROPDOWN_IDS.category, {
      isOpen: true,
      isListInteractive: true,
    });
  });

  test('updates interactive bounds after viewport resize', async ({ page }) => {
    const beforeResize = await getDropdown(page, DROPDOWN_IDS.category);

    await page.setViewportSize(RESIZED_VIEWPORT);
    await expect
      .poll(
        async () =>
          (await getDropdown(page, DROPDOWN_IDS.category)).headerBounds,
      )
      .not.toEqual(beforeResize.headerBounds);

    const afterResize = await getDropdown(page, DROPDOWN_IDS.category);
    const [centerX, centerY] = getBoundsCenter(afterResize.headerBounds);
    expect(centerX).toBeGreaterThanOrEqual(0);
    expect(centerX).toBeLessThanOrEqual(RESIZED_VIEWPORT.width);
    expect(centerY).toBeGreaterThanOrEqual(0);
    expect(centerY).toBeLessThanOrEqual(RESIZED_VIEWPORT.height);

    await openDropdown(page, DROPDOWN_IDS.category);
  });
});
