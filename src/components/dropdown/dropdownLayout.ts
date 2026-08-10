import type { DropdownConfig } from './types';

const MIN_DROPDOWN_WIDTH = 240;
const MIN_VISIBLE_ITEMS = 1;

export interface ResolvedDropdownLayout {
  width: number;
  rowHeight: number;
  labelGap: number;
  listGap: number;
  itemGap: number;
  horizontalPadding: number;
  iconSize: number;
  contentGap: number;
  toggleIndicatorAreaWidth: number;
  selectionIndicatorAreaWidth: number;
  maxVisibleItems: number;
}

const DEFAULT_DROPDOWN_LAYOUT: ResolvedDropdownLayout = {
  width: 320,
  rowHeight: 52,
  labelGap: 8,
  listGap: 8,
  itemGap: 0,
  horizontalPadding: 16,
  iconSize: 24,
  contentGap: 10,
  toggleIndicatorAreaWidth: 24,
  selectionIndicatorAreaWidth: 24,
  maxVisibleItems: 5,
};

export function resolveDropdownLayout(
  config: DropdownConfig,
): ResolvedDropdownLayout {
  const width = config.width ?? DEFAULT_DROPDOWN_LAYOUT.width;
  const maxVisibleItems =
    config.maxVisibleItems ?? DEFAULT_DROPDOWN_LAYOUT.maxVisibleItems;

  if (width < MIN_DROPDOWN_WIDTH) {
    throw new Error(
      `Dropdown "${config.id}" width must be at least ${MIN_DROPDOWN_WIDTH}px.`,
    );
  }

  if (!Number.isInteger(maxVisibleItems) || maxVisibleItems < MIN_VISIBLE_ITEMS) {
    throw new Error(
      `Dropdown "${config.id}" maxVisibleItems must be a positive integer.`,
    );
  }

  return {
    ...DEFAULT_DROPDOWN_LAYOUT,
    width,
    maxVisibleItems,
  };
}
