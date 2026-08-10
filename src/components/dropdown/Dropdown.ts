import {
  Container,
  Graphics,
  NineSlicePlane,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';
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
  private readonly layout: ResolvedDropdownLayout;
  private readonly listContainer = new Container();
  private readonly listMask = new Graphics();
  private readonly listPanel: NineSlicePlane;
  private readonly toggleIndicator: Graphics;
  private readonly valueLabel: Text;

  private isDisabled: boolean;
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
    this.selectedOption = this.resolveInitialSelection(config.selectedOptionId);
    this.itemFactory = new DropdownItemFactory(this.layout);

    this.header = this.createNineSlicePlane(resources.headerBackground);
    this.header.width = this.layout.width;
    this.header.height = this.layout.rowHeight;
    this.header.hitArea = new Rectangle(
      0,
      0,
      this.layout.width,
      this.layout.rowHeight,
    );
    this.header.on('pointertap', this.handleHeaderTap);

    this.valueLabel = new Text('', VALUE_TEXT_STYLE);
    this.valueLabel.x = this.layout.horizontalPadding;
    this.valueLabel.y = (this.layout.rowHeight - this.valueLabel.height) / 2;

    this.toggleIndicator = this.createToggleIndicator();
    this.toggleIndicator.x =
      this.layout.width -
      this.layout.horizontalPadding -
      this.layout.toggleIndicatorAreaWidth +
      (this.layout.toggleIndicatorAreaWidth - TOGGLE_ICON_WIDTH) / 2;
    this.toggleIndicator.y =
      (this.layout.rowHeight - TOGGLE_ICON_HEIGHT) / 2;

    this.listPanel = this.createNineSlicePlane(resources.listBackground);
    this.listPanel.width = this.layout.width;
    this.itemsContainer.mask = this.listMask;
    this.listContainer.addChild(
      this.listPanel,
      this.itemsContainer,
      this.listMask,
    );
    this.listContainer.visible = false;

    const headerY = this.createFieldLabel(config.label);
    this.header.y = headerY;
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
    this.alpha = this.isDisabled ? 0.55 : 1;
  }

  public open(): void {
    if (this.isDisabled || this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.listContainer.visible = true;
  }

  public close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.listContainer.visible = false;
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
      selectedOptionId: this.selectedOption?.id ?? null,
    };
  }

  public override destroy(
    ..._options: Parameters<Container['destroy']>
  ): void {
    this.header.off('pointertap', this.handleHeaderTap);
    super.destroy({ children: true });
  }

  private readonly handleHeaderTap = (): void => {
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

  private createNineSlicePlane(
    resource: DropdownBackgroundResource,
  ): NineSlicePlane {
    const { texture, borders } = resource;

    return new NineSlicePlane(
      texture,
      borders.left,
      borders.top,
      borders.right,
      borders.bottom,
    );
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
    this.header.eventMode = this.isDisabled ? 'none' : 'static';
    this.header.cursor = this.isDisabled ? 'default' : 'pointer';
  }

  private updateListViewport(): void {
    const visibleItemCount = Math.max(
      1,
      Math.min(this.options.length, this.layout.maxVisibleItems),
    );
    const viewportHeight =
      visibleItemCount * this.layout.rowHeight +
      Math.max(0, visibleItemCount - 1) * this.layout.itemGap;

    this.listPanel.height = viewportHeight;
    this.listMask.clear();
    this.listMask.beginFill(0xffffff);
    this.listMask.drawRect(0, 0, this.layout.width, viewportHeight);
    this.listMask.endFill();
  }

  private updateSelectedItemStates(): void {
    for (const child of this.itemsContainer.children) {
      if (child instanceof DropdownItem) {
        child.setSelected(child.getOption().id === this.selectedOption?.id);
      }
    }
  }

  private updateValueLabel(): void {
    const value =
      this.selectedOption?.label ??
      this.config.placeholder ??
      DEFAULT_PLACEHOLDER;
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
