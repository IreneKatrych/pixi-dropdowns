import {
  Application,
  Assets,
  type FederatedPointerEvent,
  Graphics,
  Rectangle,
  Texture,
} from 'pixi.js';
import { Dropdown } from '../components/dropdown/Dropdown';
import type {
  DropdownOption,
  DropdownBounds,
  DropdownInteractionSnapshot,
  DropdownOpenChange,
  DropdownResources,
  DropdownSelection,
} from '../components/dropdown/types';
import {
  installDropdownTestBridge,
  type DropdownSelectionTestSnapshot,
  type DropdownTestSnapshot,
} from '../testing/DropdownTestBridge';
import { COLORS } from '../theme/colors';
import { APP_CONFIG } from './appConfig';
import {
  CATEGORY_DEFINITIONS,
  DELAYED_OPTIONS,
  createLargeDataset,
  getCategoryItems,
  type CategoryId,
} from './demoData';

const PANEL_TEXTURE_URL = '/assets/w-r-ds_fog.png';
const CHECKMARK_TEXTURE_URL = '/assets/checkmark.png';
const SIMULATED_OPTIONS_DELAY_MS = 1_500;
const LARGE_DATASET_SIZE = 10_000;
const DROPDOWN_WIDTH = 300;
const DROPDOWN_GAP = 28;
const SHOWCASE_ROW_GAP = 32;
const PAGE_PADDING = 40;
const WHEEL_LINE_HEIGHT = 16;
const PAIR_COLUMN_COUNT = 2;
const SINGLE_COLUMN_COUNT = 1;
const HORIZONTAL_PAGE_PADDING = PAGE_PADDING * 2;
const TEST_BRIDGE_ENABLED =
  import.meta.env.VITE_ENABLE_TEST_BRIDGE === 'true';
const EMPTY_DELAYED_RESPONSE_ENABLED =
  TEST_BRIDGE_ENABLED &&
  new URLSearchParams(window.location.search).get('delayedResponse') === 'empty';

const DROPDOWN_IDS = {
  category: 'category',
  categoryItems: 'category-items',
  delayedOptions: 'delayed-options',
  largeDataset: 'large-dataset',
} as const;

const PANEL_NINE_SLICE_BORDERS = {
  left: 45,
  top: 35,
  right: 45,
  bottom: 55,
} as const;

const PANEL_SHADOW_INSETS = {
  left: 30,
  top: 20,
  right: 30,
  bottom: 40,
} as const;

const CATEGORY_ICON_COLORS: Record<CategoryId, number> = {
  fruit: 0xef4444,
  vegetables: 0xf59e0b,
  berries: 0x8b5cf6,
};

export class DropdownDemoApp {
  private application: Application | null = null;
  private checkmarkTexture: Texture | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private delayedOptionsAbortController: AbortController | null = null;
  private delayedOptionsRequestCount = 0;
  private dropdowns: Dropdown[] = [];
  private iconTextures: Texture[] = [];
  private panelTexture: Texture | null = null;
  private removeTestBridge: (() => void) | null = null;
  private selectionLog: DropdownSelectionTestSnapshot[] | null =
    TEST_BRIDGE_ENABLED ? [] : null;

  public constructor(private readonly mountElement: HTMLElement) {}

  public async init(): Promise<void> {
    if (this.application) {
      return;
    }

    const application = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: COLORS.canvasBackground,
      antialias: true,
      resolution: Math.min(
        window.devicePixelRatio || 1,
        APP_CONFIG.maxRendererResolution,
      ),
      autoDensity: true,
    });

    this.application = application;
    this.canvasElement = application.view as HTMLCanvasElement;
    this.mountElement.appendChild(this.canvasElement);
    this.canvasElement.addEventListener('wheel', this.handleCanvasWheel, {
      passive: false,
    });
    application.stage.eventMode = 'static';
    application.stage.on('pointerdown', this.handleStagePointerDown);
    window.addEventListener('resize', this.handleResize);

    try {
      [this.panelTexture, this.checkmarkTexture] = await Promise.all([
        Assets.load<Texture>(PANEL_TEXTURE_URL),
        Assets.load<Texture>(CHECKMARK_TEXTURE_URL),
      ]);

      const resources: DropdownResources = {
        headerBackground: this.createBackgroundResource(this.panelTexture),
        listBackground: this.createBackgroundResource(this.panelTexture),
        selectionIndicatorTexture: this.checkmarkTexture,
      };
      const categoryOptions = this.createCategoryOptions(application);

      const delayedDropdown = new Dropdown(
        {
          id: DROPDOWN_IDS.delayedOptions,
          options: [],
          label: 'Loaded from API',
          placeholder: 'Select an option',
          width: DROPDOWN_WIDTH,
          onOpenChange: this.handleDropdownOpenChange,
          onOptionsRequest: this.handleDelayedOptionsRequest,
          onSelect: TEST_BRIDGE_ENABLED
            ? (selection) => this.recordSelection(selection)
            : undefined,
        },
        resources,
      );
      const categoryDropdown = new Dropdown(
        {
          id: DROPDOWN_IDS.category,
          options: categoryOptions,
          label: 'Category with icons',
          placeholder: 'Select a category',
          width: DROPDOWN_WIDTH,
          onOpenChange: this.handleDropdownOpenChange,
          onSelect: TEST_BRIDGE_ENABLED
            ? (selection) => {
                this.recordSelection(selection);
                this.handleCategorySelect(selection);
              }
            : this.handleCategorySelect,
        },
        resources,
      );
      const itemsDropdown = new Dropdown(
        {
          id: DROPDOWN_IDS.categoryItems,
          options: [],
          label: 'Category items',
          placeholder: 'Select a category first',
          disabled: true,
          width: DROPDOWN_WIDTH,
          maxVisibleItems: 5,
          onOpenChange: this.handleDropdownOpenChange,
          onSelect: TEST_BRIDGE_ENABLED
            ? (selection) => this.recordSelection(selection)
            : undefined,
        },
        resources,
      );
      const largeDatasetDropdown = new Dropdown(
        {
          id: DROPDOWN_IDS.largeDataset,
          options: createLargeDataset(LARGE_DATASET_SIZE),
          label: 'Virtualized 10,000 options',
          placeholder: 'Select a performance option',
          width: DROPDOWN_WIDTH,
          maxVisibleItems: 5,
          onOpenChange: this.handleDropdownOpenChange,
          onSelect: TEST_BRIDGE_ENABLED
            ? (selection) => this.recordSelection(selection)
            : undefined,
        },
        resources,
      );

      this.dropdowns = [
        categoryDropdown,
        itemsDropdown,
        delayedDropdown,
        largeDatasetDropdown,
      ];
      application.stage.addChild(...this.dropdowns);
      this.layout();

      if (TEST_BRIDGE_ENABLED) {
        this.removeTestBridge = installDropdownTestBridge({
          getDropdowns: () => this.getDropdownTestSnapshots(),
          getSelections: () => this.getSelectionTestSnapshots(),
          getDelayedOptionsRequestCount: () =>
            this.delayedOptionsRequestCount,
        });
      }

    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  public destroy(): void {
    this.removeTestBridge?.();
    this.removeTestBridge = null;
    window.removeEventListener('resize', this.handleResize);
    this.application?.stage.off('pointerdown', this.handleStagePointerDown);
    this.canvasElement?.removeEventListener('wheel', this.handleCanvasWheel);
    this.canvasElement = null;

    this.delayedOptionsAbortController?.abort();
    this.delayedOptionsAbortController = null;

    this.dropdowns.forEach((dropdown) => dropdown.destroy({ children: true }));
    this.dropdowns = [];

    this.iconTextures.forEach((texture) => texture.destroy(true));
    this.iconTextures = [];

    if (this.panelTexture) {
      this.panelTexture = null;
      void Assets.unload(PANEL_TEXTURE_URL);
    }

    if (this.checkmarkTexture) {
      this.checkmarkTexture = null;
      void Assets.unload(CHECKMARK_TEXTURE_URL);
    }

    this.application?.destroy(true, { children: true });
    this.application = null;
    this.selectionLog = null;
  }

  private createBackgroundResource(texture: Texture) {
    return {
      texture,
      borders: PANEL_NINE_SLICE_BORDERS,
      // The transparent shadow extends beyond the 50x50 logical white core.
      shadowInsets: PANEL_SHADOW_INSETS,
    };
  }

  private createCategoryOptions(application: Application): DropdownOption[] {
    return CATEGORY_DEFINITIONS.map(({ id, label }) => {
      const icon = new Graphics();
      icon.beginFill(CATEGORY_ICON_COLORS[id]);
      icon.drawCircle(10, 11, 7);
      icon.endFill();
      icon.beginFill(id === 'berries' ? 0x6d28d9 : 0x16a34a);
      icon.drawEllipse(15, 4, 4, 2.5);
      icon.endFill();

      const texture = application.renderer.generateTexture(icon);
      icon.destroy();
      this.iconTextures.push(texture);

      return { id, label, icon: texture };
    });
  }

  private layout(): void {
    if (!this.application || this.dropdowns.length === 0) {
      return;
    }

    const screenWidth = window.innerWidth;
    const pairWidth =
      DROPDOWN_WIDTH * PAIR_COLUMN_COUNT + DROPDOWN_GAP;
    const usePairs =
      screenWidth >= pairWidth + HORIZONTAL_PAGE_PADDING;
    const columnCount = usePairs
      ? PAIR_COLUMN_COUNT
      : SINGLE_COLUMN_COUNT;
    const gridWidth =
      columnCount * DROPDOWN_WIDTH + (columnCount - 1) * DROPDOWN_GAP;
    const gridX = Math.max(
      PAGE_PADDING,
      (screenWidth - gridWidth) / 2,
    );
    const rowCount = Math.ceil(this.dropdowns.length / columnCount);
    let nextRowY = PAGE_PADDING;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const rowStart = rowIndex * columnCount;
      const rowDropdowns = this.dropdowns.slice(
        rowStart,
        rowStart + columnCount,
      );
      const rowHeight = Math.max(
        ...rowDropdowns.map((dropdown) =>
          dropdown.getMaximumExpandedHeight(),
        ),
      );

      rowDropdowns.forEach((dropdown, columnIndex) => {
        dropdown.x =
          gridX + columnIndex * (DROPDOWN_WIDTH + DROPDOWN_GAP);
        dropdown.y = nextRowY;
      });
      nextRowY += rowHeight + SHOWCASE_ROW_GAP;
    }

    const requiredHeight = nextRowY - SHOWCASE_ROW_GAP + PAGE_PADDING;
    this.application.renderer.resize(
      screenWidth,
      Math.max(window.innerHeight, Math.ceil(requiredHeight)),
    );
    this.application.stage.hitArea = new Rectangle(
      0,
      0,
      this.application.screen.width,
      this.application.screen.height,
    );
  }

  private readonly handleCategorySelect = (
    selection: DropdownSelection,
  ): void => {
    const itemsDropdown = this.getDropdown(DROPDOWN_IDS.categoryItems);

    if (!itemsDropdown) {
      return;
    }

    itemsDropdown.setOptions(getCategoryItems(selection.option.id as CategoryId));
    itemsDropdown.clearSelection();
    itemsDropdown.setDisabled(false);
  };

  private recordSelection(selection: DropdownSelection): void {
    this.selectionLog?.push({
      dropdownId: selection.dropdownId,
      optionId: selection.option.id,
      optionLabel: selection.option.label,
      hasIcon: Boolean(selection.option.icon),
    });
  }

  private getDropdownTestSnapshots(): DropdownTestSnapshot[] {
    if (!this.application || !this.canvasElement) {
      return [];
    }

    const canvasBounds = this.canvasElement.getBoundingClientRect();
    const scaleX = canvasBounds.width / this.application.screen.width;
    const scaleY = canvasBounds.height / this.application.screen.height;

    return this.dropdowns.map((dropdown) =>
      this.toClientSnapshot(
        dropdown.getInteractionSnapshot(),
        canvasBounds,
        scaleX,
        scaleY,
      ),
    );
  }

  private getSelectionTestSnapshots(): DropdownSelectionTestSnapshot[] {
    return this.selectionLog?.map((selection) => ({ ...selection })) ?? [];
  }

  private toClientSnapshot(
    snapshot: DropdownInteractionSnapshot,
    canvasBounds: DOMRect,
    scaleX: number,
    scaleY: number,
  ): DropdownTestSnapshot {
    return {
      state: { ...snapshot.state },
      headerBounds: this.toClientBounds(
        snapshot.headerBounds,
        canvasBounds,
        scaleX,
        scaleY,
      ),
      listBounds: snapshot.listBounds
        ? this.toClientBounds(
            snapshot.listBounds,
            canvasBounds,
            scaleX,
            scaleY,
          )
        : null,
      scrollbarThumbBounds: snapshot.scrollbarThumbBounds
        ? this.toClientBounds(
            snapshot.scrollbarThumbBounds,
            canvasBounds,
            scaleX,
            scaleY,
          )
        : null,
      visibleOptions: snapshot.visibleOptions.map((option) => ({
        ...option,
        bounds: this.toClientBounds(
          option.bounds,
          canvasBounds,
          scaleX,
          scaleY,
        ),
      })),
    };
  }

  private toClientBounds(
    bounds: DropdownBounds,
    canvasBounds: DOMRect,
    scaleX: number,
    scaleY: number,
  ): DropdownBounds {
    return {
      x: canvasBounds.left + bounds.x * scaleX,
      y: canvasBounds.top + bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY,
    };
  }

  private readonly handleDelayedOptionsRequest = async (): Promise<void> => {
    const delayedDropdown = this.getDropdown(DROPDOWN_IDS.delayedOptions);

    if (!delayedDropdown || this.delayedOptionsAbortController) {
      return;
    }

    const abortController = new AbortController();
    this.delayedOptionsAbortController = abortController;
    this.delayedOptionsRequestCount += 1;
    delayedDropdown.setLoading(true);

    try {
      await this.simulateOptionsRequest(
        abortController.signal,
        this.delayedOptionsRequestCount === 1 &&
          !EMPTY_DELAYED_RESPONSE_ENABLED,
      );

      if (abortController.signal.aborted) {
        return;
      }

      delayedDropdown.setOptions(
        EMPTY_DELAYED_RESPONSE_ENABLED ? [] : DELAYED_OPTIONS,
      );
    } catch (error) {
      if (!abortController.signal.aborted) {
        delayedDropdown.setLoadError();
      }
    } finally {
      if (this.delayedOptionsAbortController === abortController) {
        this.delayedOptionsAbortController = null;
      }
    }
  };

  private simulateOptionsRequest(
    signal: AbortSignal,
    shouldFail: boolean,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        signal.removeEventListener('abort', handleAbort);

        if (shouldFail) {
          reject(new Error('Simulated options request failure'));
        } else {
          resolve();
        }
      }, SIMULATED_OPTIONS_DELAY_MS);
      const handleAbort = (): void => {
        window.clearTimeout(timer);
        reject(new DOMException('Request aborted', 'AbortError'));
      };

      signal.addEventListener('abort', handleAbort, { once: true });
    });
  }

  private readonly handleDropdownOpenChange = (
    change: DropdownOpenChange,
  ): void => {
    if (change.isOpen) {
      this.closeAllDropdowns(change.dropdownId);
    }
  };

  private readonly handleStagePointerDown = (
    event: FederatedPointerEvent,
  ): void => {
    const isInsideDropdown = this.dropdowns.some((dropdown) =>
      dropdown.containsGlobalPoint(event.global.x, event.global.y),
    );

    if (!isInsideDropdown) {
      this.closeAllDropdowns();
    }
  };

  private getDropdown(id: string): Dropdown | undefined {
    return this.dropdowns.find((dropdown) => dropdown.getState().id === id);
  }

  private closeAllDropdowns(exceptDropdownId?: string): void {
    for (const dropdown of this.dropdowns) {
      if (dropdown.getState().id !== exceptDropdownId) {
        dropdown.close();
      }
    }
  }

  private readonly handleResize = (): void => {
    if (!this.application) {
      return;
    }

    this.layout();
  };

  private readonly handleCanvasWheel = (event: WheelEvent): void => {
    if (!this.application || !this.canvasElement) {
      return;
    }

    const canvasBounds = this.canvasElement.getBoundingClientRect();
    const globalX =
      (event.clientX - canvasBounds.left) *
      (this.application.screen.width / canvasBounds.width);
    const globalY =
      (event.clientY - canvasBounds.top) *
      (this.application.screen.height / canvasBounds.height);
    const deltaMultiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? WHEEL_LINE_HEIGHT
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
    const deltaY = event.deltaY * deltaMultiplier;
    const isWheelOwnedByDropdown = [...this.dropdowns]
      .reverse()
      .some((dropdown) => dropdown.handleWheelAt(globalX, globalY, deltaY));

    if (isWheelOwnedByDropdown) {
      event.preventDefault();
    }
  };
}
