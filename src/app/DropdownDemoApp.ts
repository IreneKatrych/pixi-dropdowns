import { Application, Assets, Graphics, Texture } from 'pixi.js';
import { Dropdown } from '../components/dropdown/Dropdown';
import type {
  DropdownOption,
  DropdownResources,
  DropdownSelection,
} from '../components/dropdown/types';
import { COLORS } from '../theme/colors';
import { APP_CONFIG } from './appConfig';
import {
  CATEGORY_DEFINITIONS,
  DELAYED_OPTIONS,
  getCategoryItems,
  type CategoryId,
} from './demoData';

const PANEL_TEXTURE_URL = '/assets/w-r-ds_fog.png';
const CHECKMARK_TEXTURE_URL = '/assets/checkmark.png';
const SIMULATED_OPTIONS_DELAY_MS = 1_500;
const DROPDOWN_WIDTH = 300;
const DROPDOWN_GAP = 28;
const PAGE_PADDING = 40;

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
  private delayedOptionsTimer: number | null = null;
  private dropdowns: Dropdown[] = [];
  private iconTextures: Texture[] = [];
  private panelTexture: Texture | null = null;

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
    this.mountElement.appendChild(application.view as HTMLCanvasElement);
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
          id: 'delayed-options',
          options: [],
          label: 'Loaded from API',
          placeholder: 'Select an option',
          width: DROPDOWN_WIDTH,
          onOptionsRequest: this.handleDelayedOptionsRequest,
        },
        resources,
      );
      const categoryDropdown = new Dropdown(
        {
          id: 'category',
          options: categoryOptions,
          label: 'Category with icons',
          placeholder: 'Select a category',
          width: DROPDOWN_WIDTH,
          onSelect: this.handleCategorySelect,
        },
        resources,
      );
      const itemsDropdown = new Dropdown(
        {
          id: 'category-items',
          options: [],
          label: 'Category items',
          placeholder: 'Select a category first',
          disabled: true,
          width: DROPDOWN_WIDTH,
          maxVisibleItems: 5,
        },
        resources,
      );

      this.dropdowns = [delayedDropdown, categoryDropdown, itemsDropdown];
      application.stage.addChild(...this.dropdowns);
      this.layout();

    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);

    if (this.delayedOptionsTimer !== null) {
      window.clearTimeout(this.delayedOptionsTimer);
      this.delayedOptionsTimer = null;
    }

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

    const requiredWidth =
      this.dropdowns.length * DROPDOWN_WIDTH +
      (this.dropdowns.length - 1) * DROPDOWN_GAP +
      PAGE_PADDING * 2;
    const useColumns = this.application.screen.width >= requiredWidth;

    this.dropdowns.forEach((dropdown, index) => {
      dropdown.x = useColumns
        ? PAGE_PADDING + index * (DROPDOWN_WIDTH + DROPDOWN_GAP)
        : Math.max(PAGE_PADDING, (this.application!.screen.width - DROPDOWN_WIDTH) / 2);
      dropdown.y = useColumns ? 72 : 40 + index * 112;
    });
  }

  private readonly handleCategorySelect = (
    selection: DropdownSelection,
  ): void => {
    const itemsDropdown = this.dropdowns[2];

    if (!itemsDropdown) {
      return;
    }

    itemsDropdown.setOptions(getCategoryItems(selection.option.id as CategoryId));
    itemsDropdown.clearSelection();
    itemsDropdown.setDisabled(false);
  };

  private readonly handleDelayedOptionsRequest = (): void => {
    const delayedDropdown = this.dropdowns[0];

    if (!delayedDropdown || this.delayedOptionsTimer !== null) {
      return;
    }

    delayedDropdown.setLoading(true);
    this.delayedOptionsTimer = window.setTimeout(() => {
      delayedDropdown.setOptions(DELAYED_OPTIONS);
      delayedDropdown.setLoading(false);
      delayedDropdown.open();
      this.delayedOptionsTimer = null;
    }, SIMULATED_OPTIONS_DELAY_MS);
  };

  private readonly handleResize = (): void => {
    if (!this.application) {
      return;
    }

    this.application.renderer.resize(window.innerWidth, window.innerHeight);
    this.layout();
  };
}
