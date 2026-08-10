import {
  DropdownItem,
  type DropdownItemSelectHandler,
} from './DropdownItem';
import type { ResolvedDropdownLayout } from './dropdownLayout';
import type { DropdownOption } from './types';
import type { Texture } from 'pixi.js';

export class DropdownItemFactory {
  public constructor(
    private readonly layout: ResolvedDropdownLayout,
    private readonly selectionIndicatorTexture: Texture,
  ) {}

  public create(
    option: DropdownOption,
    onSelect: DropdownItemSelectHandler,
  ): DropdownItem {
    return new DropdownItem(
      option,
      this.layout,
      this.selectionIndicatorTexture,
      onSelect,
    );
  }
}
