import type { DropdownOption } from '../components/dropdown/types';

export type CategoryId = 'fruit' | 'vegetables' | 'berries';

export const DELAYED_OPTIONS: DropdownOption[] = [
  { id: 'first', label: 'First option' },
  { id: 'second', label: 'Second option', disabled: true },
  { id: 'third', label: 'Third option' },
  {
    id: 'long',
    label: 'A deliberately long option that demonstrates text truncation',
  },
];

export const CATEGORY_DEFINITIONS: ReadonlyArray<{
  id: CategoryId;
  label: string;
}> = [
  { id: 'fruit', label: 'Fruit' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'berries', label: 'Berries' },
];

const ITEMS_BY_CATEGORY: Record<CategoryId, readonly string[]> = {
  fruit: [
    'Apple', 'Apricot', 'Avocado', 'Banana', 'Cherry', 'Coconut', 'Fig',
    'Grapefruit', 'Kiwi', 'Lemon', 'Lime', 'Mango', 'Melon', 'Orange',
    'Papaya', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plum',
    'Pomegranate', 'Quince', 'Tangerine', 'Watermelon',
  ],
  vegetables: [
    'Artichoke', 'Asparagus', 'Beetroot', 'Bell pepper', 'Broccoli',
    'Brussels sprouts', 'Cabbage', 'Carrot', 'Cauliflower', 'Celery',
    'Corn', 'Cucumber', 'Eggplant', 'Garlic', 'Green beans', 'Kale', 'Leek',
    'Lettuce', 'Mushroom', 'Onion', 'Peas', 'Potato', 'Pumpkin', 'Radish',
    'Spinach', 'Sweet potato', 'Tomato', 'Zucchini',
  ],
  berries: [
    'Açaí berry', 'Barberry', 'Bilberry', 'Blackberry', 'Blackcurrant',
    'Blueberry', 'Boysenberry', 'Cloudberry', 'Cranberry', 'Elderberry',
    'Goji berry', 'Gooseberry', 'Huckleberry', 'Juniper berry',
    'Lingonberry', 'Mulberry', 'Raspberry', 'Redcurrant', 'Sea buckthorn',
    'Serviceberry', 'Strawberry', 'Tayberry',
  ],
};

export function getCategoryItems(categoryId: CategoryId): DropdownOption[] {
  return ITEMS_BY_CATEGORY[categoryId].map((label, index) => ({
    id: `${categoryId}-${index + 1}`,
    label,
  }));
}

export function createLargeDataset(optionCount: number): DropdownOption[] {
  return Array.from({ length: optionCount }, (_, index) => {
    const optionNumber = index + 1;
    const paddedNumber = optionNumber.toString().padStart(5, '0');
    const isBoundaryOption = optionNumber === 1 || optionNumber === optionCount;
    const hasLongLabel = optionNumber % 10 === 0;

    return {
      id: `large-${optionNumber}`,
      label: isBoundaryOption
        ? `${optionNumber === 1 ? 'First' : 'Last'} option — ${paddedNumber}`
        : hasLongLabel
          ? `Long performance option ${paddedNumber} — Crème brûlée, полуниця та дуже довгий текст`
          : `Performance option ${paddedNumber}`,
      disabled: optionNumber % 25 === 0,
    };
  });
}
