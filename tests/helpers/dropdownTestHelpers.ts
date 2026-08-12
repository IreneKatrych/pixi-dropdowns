import { expect, type Page } from '@playwright/test';
import type {
  DropdownSelectionTestSnapshot,
  DropdownTestSnapshot,
} from '../../src/testing/DropdownTestBridge';
import type { DropdownState } from '../../src/components/dropdown/types';

export const DROPDOWN_IDS = {
  category: 'category',
  categoryItems: 'category-items',
  delayedOptions: 'delayed-options',
  largeDataset: 'large-dataset',
} as const;

const EXPECTED_DROPDOWN_COUNT = Object.keys(DROPDOWN_IDS).length;
const VIEWPORT_INTERACTION_MARGIN = 24;

export type DropdownId = (typeof DROPDOWN_IDS)[keyof typeof DROPDOWN_IDS];

export async function openTestPage(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(
    (expectedCount) =>
      window.__PIXI_DROPDOWN_TEST__?.getDropdowns().length === expectedCount,
    EXPECTED_DROPDOWN_COUNT,
  );
}

export async function getDelayedOptionsRequestCount(
  page: Page,
): Promise<number> {
  return page.evaluate(
    () =>
      window.__PIXI_DROPDOWN_TEST__?.getDelayedOptionsRequestCount() ?? 0,
  );
}

export async function getDropdown(
  page: Page,
  dropdownId: DropdownId,
): Promise<DropdownTestSnapshot> {
  const snapshot = await page.evaluate(
    (id) => window.__PIXI_DROPDOWN_TEST__?.getDropdown(id) ?? null,
    dropdownId,
  );

  expect(snapshot, `Missing dropdown snapshot for "${dropdownId}"`).not.toBeNull();
  return snapshot!;
}

export async function getSelections(
  page: Page,
): Promise<DropdownSelectionTestSnapshot[]> {
  return page.evaluate(
    () => window.__PIXI_DROPDOWN_TEST__?.getSelections() ?? [],
  );
}

export async function expectDropdownState(
  page: Page,
  dropdownId: DropdownId,
  expected: Partial<DropdownState>,
): Promise<void> {
  await expect
    .poll(async () => (await getDropdown(page, dropdownId)).state)
    .toMatchObject(expected);
}

export async function clickHeader(
  page: Page,
  dropdownId: DropdownId,
): Promise<void> {
  let { headerBounds } = await getDropdown(page, dropdownId);

  if (await scrollBoundsCenterIntoView(page, headerBounds)) {
    ({ headerBounds } = await getDropdown(page, dropdownId));
  }

  await page.mouse.click(...getBoundsCenter(headerBounds));
}

export async function openDropdown(
  page: Page,
  dropdownId: DropdownId,
): Promise<void> {
  const { state } = await getDropdown(page, dropdownId);

  if (!state.isOpen) {
    await clickHeader(page, dropdownId);
  }

  await expectDropdownState(page, dropdownId, {
    isOpen: true,
    isListInteractive: true,
  });
}

export async function clickOption(
  page: Page,
  dropdownId: DropdownId,
  optionId: string,
): Promise<void> {
  let snapshot = await getDropdown(page, dropdownId);
  let option = snapshot.visibleOptions.find(
    (candidate) => candidate.optionId === optionId,
  );

  expect(
    option,
    `Option "${optionId}" is not currently visible in "${dropdownId}"`,
  ).toBeDefined();

  if (await scrollBoundsCenterIntoView(page, option!.bounds)) {
    snapshot = await getDropdown(page, dropdownId);
    option = snapshot.visibleOptions.find(
      (candidate) => candidate.optionId === optionId,
    );
    expect(
      option,
      `Option "${optionId}" moved outside the viewport`,
    ).toBeDefined();
  }

  await page.mouse.click(...getBoundsCenter(option!.bounds));
}

export async function clickEmptyCanvasArea(page: Page): Promise<void> {
  const point = await page.evaluate((interactionMargin) => {
    const canvasBounds = document
      .querySelector('canvas')
      ?.getBoundingClientRect();
    const dropdowns = window.__PIXI_DROPDOWN_TEST__?.getDropdowns() ?? [];

    if (!canvasBounds) {
      return null;
    }

    const interactiveBounds = dropdowns.flatMap(
      ({ headerBounds, listBounds }) =>
        listBounds ? [headerBounds, listBounds] : [headerBounds],
    );
    const isInsideInteractiveBounds = (x: number, y: number): boolean =>
      interactiveBounds.some(
        (bounds) =>
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height,
      );

    for (
      let y = canvasBounds.top + interactionMargin;
      y < Math.min(canvasBounds.bottom, window.innerHeight) - interactionMargin;
      y += interactionMargin
    ) {
      for (
        let x = canvasBounds.left + interactionMargin;
        x < Math.min(canvasBounds.right, window.innerWidth) - interactionMargin;
        x += interactionMargin
      ) {
        if (!isInsideInteractiveBounds(x, y)) {
          return { x, y };
        }
      }
    }

    return null;
  }, VIEWPORT_INTERACTION_MARGIN);

  expect(
    point,
    'Could not find an empty clickable area inside the canvas',
  ).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

async function scrollBoundsCenterIntoView(
  page: Page,
  bounds: DropdownTestSnapshot['headerBounds'],
): Promise<boolean> {
  return page.evaluate(
    ({ targetBounds, viewportMargin }) => {
      const centerY = targetBounds.y + targetBounds.height / 2;

      if (
        centerY < viewportMargin ||
        centerY > window.innerHeight - viewportMargin
      ) {
        window.scrollBy(0, centerY - window.innerHeight / 2);
        return true;
      }

      return false;
    },
    { targetBounds: bounds, viewportMargin: VIEWPORT_INTERACTION_MARGIN },
  );
}

export function getBoundsCenter(
  bounds: DropdownTestSnapshot['headerBounds'],
): [number, number] {
  return [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
}
