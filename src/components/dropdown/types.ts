import type { Texture } from 'pixi.js';

export interface DropdownOption {
  id: string;
  label: string;
  disabled?: boolean;
  icon?: Texture;
}

export interface DropdownSelection {
  dropdownId: string;
  option: DropdownOption;
}

export interface DropdownOpenChange {
  dropdownId: string;
  isOpen: boolean;
}

export interface DropdownConfig {
  id: string;
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  selectedOptionId?: string;
  width?: number;
  maxVisibleItems?: number;
  onOptionsRequest?: () => void;
  onOpenChange?: (change: DropdownOpenChange) => void;
  onSelect?: (selection: DropdownSelection) => void;
}

export interface NineSliceBorders {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ShadowInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DropdownBackgroundResource {
  texture: Texture;
  borders: NineSliceBorders;
  shadowInsets: ShadowInsets;
}

export interface DropdownResources {
  headerBackground: DropdownBackgroundResource;
  listBackground: DropdownBackgroundResource;
  selectionIndicatorTexture: Texture;
}

export interface DropdownState {
  id: string;
  isOpen: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  optionCount: number;
  renderedItemCount: number;
  scrollY: number;
  selectedOptionId: string | null;
}
