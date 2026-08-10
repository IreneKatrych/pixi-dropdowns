import {
  DropdownItem,
  type DropdownItemSelectHandler,
} from './DropdownItem';
import type { ResolvedDropdownLayout } from './dropdownLayout';
import type { DropdownOption } from './types';

export class DropdownItemFactory {
  public constructor(
    private readonly layout: ResolvedDropdownLayout,
  ) {}

  public create(
    option: DropdownOption,
    onSelect: DropdownItemSelectHandler,
  ): DropdownItem {
    return new DropdownItem(option, this.layout, onSelect);
  }
}
