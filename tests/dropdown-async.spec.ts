import { expect, test } from '@playwright/test';
import {
  DROPDOWN_IDS,
  clickHeader,
  clickOption,
  expectDropdownState,
  getDelayedOptionsRequestCount,
  getSelections,
  openTestPage,
} from './helpers/dropdownTestHelpers';

test.describe('Async dropdown states', () => {
  test.beforeEach(async ({ page }) => {
    await openTestPage(page);
  });

  test('shows loading and deterministic first-request error', async ({ page }) => {
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'loading',
      isLoading: true,
      isOpen: true,
      isListInteractive: false,
    });
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'error',
      isLoading: false,
      isOpen: true,
      optionCount: 0,
    });
  });

  test('retries after error and loads options', async ({ page }) => {
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'error',
    });

    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'loading',
      isLoading: true,
    });
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'ready',
      isLoading: false,
      isOpen: true,
      isListInteractive: true,
      optionCount: 4,
    });

    await clickOption(page, DROPDOWN_IDS.delayedOptions, 'long');
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      selectedOptionId: 'long',
      isOpen: false,
      isValueTruncated: true,
    });
    const selections = await getSelections(page);
    const latestSelection = selections.at(-1);

    expect(latestSelection?.optionLabel).toBe(
      'A deliberately long option that demonstrates text truncation',
    );
  });

  test('closes and reopens one loading request without duplicating it', async ({
    page,
  }) => {
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'loading',
      isOpen: true,
    });

    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'loading',
      isOpen: false,
    });
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'loading',
      isOpen: true,
    });
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'error',
      isOpen: true,
    });
    expect(await getDelayedOptionsRequestCount(page)).toBe(1);
  });

  test('handles an empty successful response', async ({ page }) => {
    await openTestPage(page, '/?delayedResponse=empty');
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);

    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'ready',
      isLoading: false,
      isOpen: true,
      isListInteractive: false,
      optionCount: 0,
    });
    expect(await getDelayedOptionsRequestCount(page)).toBe(1);
  });

  test('does not select or emit the disabled loaded option', async ({ page }) => {
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'error',
    });
    await clickHeader(page, DROPDOWN_IDS.delayedOptions);
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      contentState: 'ready',
      isListInteractive: true,
    });

    await clickOption(page, DROPDOWN_IDS.delayedOptions, 'second');
    await expectDropdownState(page, DROPDOWN_IDS.delayedOptions, {
      isOpen: true,
      selectedOptionId: null,
    });
    expect(await getSelections(page)).toEqual([]);
  });
});
