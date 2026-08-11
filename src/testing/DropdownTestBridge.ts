import type {
  DropdownBounds,
  DropdownState,
  DropdownVisibleOptionSnapshot,
} from '../components/dropdown/types';

export interface DropdownTestSnapshot {
  state: DropdownState;
  headerBounds: DropdownBounds;
  listBounds: DropdownBounds | null;
  visibleOptions: DropdownVisibleOptionSnapshot[];
}

export interface DropdownSelectionTestSnapshot {
  dropdownId: string;
  optionId: string;
  optionLabel: string;
  hasIcon: boolean;
}

export interface DropdownTestBridge {
  getDropdown(id: string): DropdownTestSnapshot | null;
  getDropdowns(): DropdownTestSnapshot[];
  getSelections(): DropdownSelectionTestSnapshot[];
}

export interface DropdownTestBridgeSource {
  getDropdowns(): DropdownTestSnapshot[];
  getSelections(): DropdownSelectionTestSnapshot[];
}

declare global {
  interface Window {
    __PIXI_DROPDOWN_TEST__?: DropdownTestBridge;
  }
}

export function installDropdownTestBridge(
  source: DropdownTestBridgeSource,
): () => void {
  const bridge: DropdownTestBridge = Object.freeze({
    getDropdown: (id: string) =>
      source.getDropdowns().find((snapshot) => snapshot.state.id === id) ??
      null,
    getDropdowns: () => source.getDropdowns(),
    getSelections: () => source.getSelections(),
  });

  window.__PIXI_DROPDOWN_TEST__ = bridge;

  return () => {
    if (window.__PIXI_DROPDOWN_TEST__ === bridge) {
      delete window.__PIXI_DROPDOWN_TEST__;
    }
  };
}
