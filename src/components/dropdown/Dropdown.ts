import {
  Container,
  Graphics,
  NineSlicePlane,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';
import { gsap } from 'gsap';
import { COLORS } from '../../theme/colors';
import { TYPOGRAPHY } from '../../theme/typography';
import { DropdownItem } from './DropdownItem';
import { DropdownItemFactory } from './DropdownItemFactory';
import {
  resolveDropdownLayout,
  type ResolvedDropdownLayout,
} from './dropdownLayout';
import { fitTextWithEllipsis } from './textLayout';
import type {
  DropdownBackgroundResource,
  DropdownConfig,
  DropdownOption,
  DropdownResources,
  DropdownState,
} from './types';

const DEFAULT_PLACEHOLDER = 'Select an option';
const TOGGLE_ICON_WIDTH = 12;
const TOGGLE_ICON_HEIGHT = 6;
const TOGGLE_ANIMATION_DURATION = 0.18;
const LOADING_LABEL = 'Loading options…';

const SKELETON_LAYOUT = {
  barWidthRatios: [0.72, 0.55, 0.72],
  barFillColors: [
    COLORS.skeletonBase,
    COLORS.skeletonAccent,
    COLORS.skeletonBase,
  ],
  barTopRatio: 0.34,
  barHeightRatio: 0.32,
  barRadius: 4,
} as const;

const VALUE_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.bodySize,
  fill: COLORS.textPrimary,
});

const FIELD_LABEL_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.labelSize,
  fill: COLORS.textOnCanvas,
});

export class Dropdown extends Container {
  private readonly config: DropdownConfig;
  private readonly header: NineSlicePlane;
  private readonly itemFactory: DropdownItemFactory;
  private readonly itemsContainer = new Container();
  private readonly listViewport = new Container();
  private readonly layout: ResolvedDropdownLayout;
  private readonly listBackgroundResource: DropdownBackgroundResource;
  private readonly listContainer = new Container();
  private readonly listMask = new Graphics();
  private readonly listPanel: NineSlicePlane;
  private readonly skeletonContainer = new Container();
  private readonly toggleIndicator: Graphics;
  private readonly valueLabel: Text;

  private isDisabled: boolean;
  private isLoading: boolean;
  private isOpen = false;
  private options: DropdownOption[];
  private selectedOption: DropdownOption | null;

  public constructor(config: DropdownConfig, resources: DropdownResources) {
    super();

    this.config = config;
    this.layout = resolveDropdownLayout(config);
    this.options = [...config.options];
    this.validateOptions(this.options);
    this.isDisabled = config.disabled ?? false;
    this.isLoading = config.loading ?? false;
    this.selectedOption = this.resolveInitialSelection(config.selectedOptionId);
    this.itemFactory = new DropdownItemFactory(
      this.layout,
      resources.selectionIndicatorTexture,
    );
    this.listBackgroundResource = resources.listBackground;

    this.header = this.createNineSlicePlane(
      resources.headerBackground,
      this.layout.rowHeight,
    );
    this.header.hitArea = new Rectangle(
      resources.headerBackground.shadowInsets.left,
      resources.headerBackground.shadowInsets.top,
      this.layout.width,
      this.layout.rowHeight,
    );
    this.header.on('pointertap', this.handleHeaderTap);

    this.valueLabel = new Text('', VALUE_TEXT_STYLE);
    this.valueLabel.x = this.layout.horizontalPadding;
    this.valueLabel.y = (this.layout.rowHeight - this.valueLabel.height) / 2;

    this.toggleIndicator = this.createToggleIndicator();
    this.toggleIndicator.pivot.set(
      TOGGLE_ICON_WIDTH / 2,
      TOGGLE_ICON_HEIGHT / 2,
    );
    this.toggleIndicator.x =
      this.layout.width -
      this.layout.horizontalPadding -
      this.layout.toggleIndicatorAreaWidth / 2;
    this.toggleIndicator.y = this.layout.rowHeight / 2;

    this.listPanel = this.createNineSlicePlane(
      resources.listBackground,
      this.layout.rowHeight,
    );
    this.listViewport.mask = this.listMask;
    this.listViewport.addChild(this.itemsContainer, this.skeletonContainer);
    this.listContainer.addChild(
      this.listPanel,
      this.listViewport,
      this.listMask,
    );
    this.listContainer.visible = this.isLoading;

    const headerY = this.createFieldLabel(config.label);
    this.header.y += headerY;
    this.valueLabel.y += headerY;
    this.toggleIndicator.y += headerY;
    this.listContainer.y =
      headerY + this.layout.rowHeight + this.layout.listGap;

    this.addChild(
      this.header,
      this.valueLabel,
      this.toggleIndicator,
      this.listContainer,
    );

    this.updateHeaderInteraction();
    this.updateValueLabel();
    this.renderOptions();
    if (this.isLoading) {
      this.renderSkeleton();
    }
    this.updateLoadingPresentation();
    this.alpha = this.isDisabled ? 0.55 : 1;
  }

  public open(): void {
    if (this.isDisabled || this.isLoading || this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.listContainer.visible = true;
    this.animateToggleIndicator(true);
  }

  public close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.listContainer.visible = false;
    this.animateToggleIndicator(false);
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setOptions(options: DropdownOption[]): void {
    this.validateOptions(options);

    const selectedOptionId = this.selectedOption?.id;
    this.options = [...options];
    this.selectedOption = selectedOptionId
      ? (this.options.find((option) => option.id === selectedOptionId) ?? null)
      : null;

    this.updateValueLabel();
    this.renderOptions();
  }

  public setLoading(loading: boolean): void {
    if (this.isLoading === loading) {
      return;
    }

    this.isLoading = loading;
    this.close();

    if (loading && this.skeletonContainer.children.length === 0) {
      this.renderSkeleton();
    } else if (!loading) {
      this.destroySkeleton();
    }

    this.updateHeaderInteraction();
    this.updateValueLabel();
    this.updateListViewport();
    this.updateLoadingPresentation();
  }

  public setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    this.alpha = disabled ? 0.55 : 1;
    this.updateHeaderInteraction();

    if (disabled) {
      this.close();
    }
  }

  public clearSelection(): void {
    this.selectedOption = null;
    this.updateSelectedItemStates();
    this.updateValueLabel();
  }

  public getSelectedOption(): DropdownOption | null {
    return this.selectedOption;
  }

  public getState(): DropdownState {
    return {
      id: this.config.id,
      isOpen: this.isOpen,
      isDisabled: this.isDisabled,
      isLoading: this.isLoading,
      selectedOptionId: this.selectedOption?.id ?? null,
    };
  }

  public override destroy(
    ..._options: Parameters<Container['destroy']>
  ): void {
    this.header.off('pointertap', this.handleHeaderTap);
    gsap.killTweensOf(this.toggleIndicator);
    super.destroy({ children: true });
  }

  private readonly handleHeaderTap = (): void => {
    if (this.options.length === 0 && this.config.onOptionsRequest) {
      this.config.onOptionsRequest();
      return;
    }

    this.toggle();
  };

  private readonly handleOptionSelect = (option: DropdownOption): void => {
    this.selectedOption = option;
    this.updateSelectedItemStates();
    this.updateValueLabel();
    this.config.onSelect?.({ dropdownId: this.config.id, option });
    this.close();
  };

  private createFieldLabel(label?: string): number {
    if (!label) {
      return 0;
    }

    const fieldLabel = new Text(
      fitTextWithEllipsis(label, FIELD_LABEL_TEXT_STYLE, this.layout.width),
      FIELD_LABEL_TEXT_STYLE,
    );
    this.addChild(fieldLabel);

    return fieldLabel.height + this.layout.labelGap;
  }

  private animateToggleIndicator(isOpen: boolean): void {
    gsap.to(this.toggleIndicator, {
      rotation: isOpen ? Math.PI : 0,
      duration: TOGGLE_ANIMATION_DURATION,
      ease: 'power2.out',
      overwrite: true,
    });
  }

  private createNineSlicePlane(
    resource: DropdownBackgroundResource,
    logicalHeight: number,
  ): NineSlicePlane {
    const { texture, borders, shadowInsets } = resource;
    const plane = new NineSlicePlane(
      texture,
      borders.left,
      borders.top,
      borders.right,
      borders.bottom,
    );
    plane.x = -shadowInsets.left;
    plane.y = -shadowInsets.top;
    plane.width =
      this.layout.width + shadowInsets.left + shadowInsets.right;
    plane.height = logicalHeight + shadowInsets.top + shadowInsets.bottom;

    return plane;
  }

  private createToggleIndicator(): Graphics {
    const indicator = new Graphics();
    indicator.beginFill(COLORS.textPrimary);
    indicator.drawPolygon([
      0,
      0,
      TOGGLE_ICON_WIDTH,
      0,
      TOGGLE_ICON_WIDTH / 2,
      TOGGLE_ICON_HEIGHT,
    ]);
    indicator.endFill();

    return indicator;
  }

  private renderSkeleton(): void {
    this.skeletonContainer.removeChildren().forEach((child) => child.destroy());

    for (
      let index = 0;
      index < SKELETON_LAYOUT.barWidthRatios.length;
      index += 1
    ) {
      const bar = new Graphics();
      const widthRatio =
        SKELETON_LAYOUT.barWidthRatios[index] ??
        SKELETON_LAYOUT.barWidthRatios[0];
      bar.beginFill(
        SKELETON_LAYOUT.barFillColors[index] ?? COLORS.skeletonBase,
      );
      bar.drawRoundedRect(
        this.layout.horizontalPadding,
        index * (this.layout.rowHeight + this.layout.itemGap) +
          this.layout.rowHeight * SKELETON_LAYOUT.barTopRatio,
        (this.layout.width - this.layout.horizontalPadding * 2) * widthRatio,
        this.layout.rowHeight * SKELETON_LAYOUT.barHeightRatio,
        SKELETON_LAYOUT.barRadius,
      );
      bar.endFill();
      this.skeletonContainer.addChild(bar);
    }
  }

  private destroySkeleton(): void {
    this.skeletonContainer
      .removeChildren()
      .forEach((child) => child.destroy());
  }

  private renderOptions(): void {
    this.itemsContainer.removeChildren().forEach((child) => child.destroy());

    let nextY = 0;

    for (const option of this.options) {
      const item = this.itemFactory.create(option, this.handleOptionSelect);
      item.setSelected(option.id === this.selectedOption?.id);
      item.y = nextY;
      nextY += this.layout.rowHeight + this.layout.itemGap;
      this.itemsContainer.addChild(item);
    }

    this.updateListViewport();
  }

  private resolveInitialSelection(
    selectedOptionId?: string,
  ): DropdownOption | null {
    if (!selectedOptionId) {
      return null;
    }

    const selectedOption = this.options.find(
      (option) => option.id === selectedOptionId,
    );

    if (!selectedOption) {
      throw new Error(
        `Dropdown "${this.config.id}" cannot select unknown option "${selectedOptionId}".`,
      );
    }

    if (selectedOption.disabled) {
      throw new Error(
        `Dropdown "${this.config.id}" cannot initially select disabled option "${selectedOptionId}".`,
      );
    }

    return selectedOption;
  }

  private updateHeaderInteraction(): void {
    const isInteractive = !this.isDisabled && !this.isLoading;
    this.header.eventMode = isInteractive ? 'static' : 'none';
    this.header.cursor = isInteractive ? 'pointer' : 'default';
  }

  private updateListViewport(): void {
    const itemCount = this.isLoading
      ? SKELETON_LAYOUT.barWidthRatios.length
      : this.options.length;
    const visibleItemCount = Math.max(
      1,
      Math.min(itemCount, this.layout.maxVisibleItems),
    );
    const viewportHeight =
      visibleItemCount * this.layout.rowHeight +
      Math.max(0, visibleItemCount - 1) * this.layout.itemGap;

    this.listPanel.height =
      viewportHeight +
      this.listBackgroundResource.shadowInsets.top +
      this.listBackgroundResource.shadowInsets.bottom;
    this.listMask.clear();
    this.listMask.beginFill(0xffffff);
    this.listMask.drawRect(0, 0, this.layout.width, viewportHeight);
    this.listMask.endFill();
  }

  private updateLoadingPresentation(): void {
    this.itemsContainer.visible = !this.isLoading;
    this.skeletonContainer.visible = this.isLoading;
    this.toggleIndicator.visible = !this.isLoading;
    this.listContainer.visible = this.isLoading || this.isOpen;
    this.valueLabel.alpha = this.isLoading ? 0.55 : 1;
  }

  private updateSelectedItemStates(): void {
    for (const child of this.itemsContainer.children) {
      if (child instanceof DropdownItem) {
        child.setSelected(child.getOption().id === this.selectedOption?.id);
      }
    }
  }

  private updateValueLabel(): void {
    const value = this.isLoading
      ? LOADING_LABEL
      : (this.selectedOption?.label ??
        this.config.placeholder ??
        DEFAULT_PLACEHOLDER);
    const availableWidth =
      this.layout.width -
      this.layout.horizontalPadding * 2 -
      this.layout.toggleIndicatorAreaWidth;

    this.valueLabel.text = fitTextWithEllipsis(
      value,
      VALUE_TEXT_STYLE,
      availableWidth,
    );
  }

  private validateOptions(options: DropdownOption[]): void {
    const optionIds = new Set<string>();

    for (const option of options) {
      if (optionIds.has(option.id)) {
        throw new Error(
          `Dropdown "${this.config.id}" contains duplicate option id "${option.id}".`,
        );
      }

      optionIds.add(option.id);
    }
  }
}
