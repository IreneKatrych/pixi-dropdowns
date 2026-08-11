import {
  Container,
  type FederatedPointerEvent,
  Graphics,
  NineSlicePlane,
  Point,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js';
import { gsap } from 'gsap';
import { COLORS } from '../../theme/colors';
import { TYPOGRAPHY } from '../../theme/typography';
import { DropdownItem } from './DropdownItem';
import { DropdownItemFactory } from './DropdownItemFactory';
import { DropdownScrollController } from './DropdownScrollController';
import { DropdownScrollbarView } from './DropdownScrollbarView';
import { DropdownStatusView } from './DropdownStatusView';
import {
  resolveDropdownLayout,
  type ResolvedDropdownLayout,
} from './dropdownLayout';
import { fitTextWithEllipsis } from './textLayout';
import { fitSpriteWithin } from './spriteLayout';
import type {
  DropdownBackgroundResource,
  DropdownConfig,
  DropdownContentState,
  DropdownOption,
  DropdownResources,
  DropdownState,
} from './types';

const DEFAULT_PLACEHOLDER = 'Select an option';
const TOGGLE_ICON_WIDTH = 12;
const TOGGLE_ICON_HEIGHT = 6;
const TOGGLE_ANIMATION_DURATION = 0.18;
const LIST_ANIMATION_DURATION = 0.2;
const LIST_CLOSED_OFFSET_Y = -6;
const LOADING_LABEL = 'Loading options…';
const LOAD_ERROR_LABEL = 'Failed to load. Tap to retry';
const OVERSCAN_ITEM_COUNT = 2;

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

const ERROR_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.bodySize,
  fill: COLORS.error,
});

const FIELD_LABEL_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.labelSize,
  fill: COLORS.textOnCanvas,
});

export class Dropdown extends Container {
  private readonly config: DropdownConfig;
  private readonly fieldLabelOffset: number;
  private readonly header: NineSlicePlane;
  private readonly itemFactory: DropdownItemFactory;
  private readonly itemsContainer = new Container();
  private readonly listViewport = new Container();
  private readonly layout: ResolvedDropdownLayout;
  private readonly listBackgroundResource: DropdownBackgroundResource;
  private readonly listAnimationContainer = new Container();
  private readonly listContainer = new Container();
  private readonly listMask = new Graphics();
  private readonly listPanel: NineSlicePlane;
  private readonly openCloseTimeline: gsap.core.Timeline;
  private readonly scrollController: DropdownScrollController;
  private readonly scrollbarView: DropdownScrollbarView;
  private readonly skeletonContainer = new Container();
  private readonly statusView: DropdownStatusView;
  private readonly toggleIndicator: Graphics;
  private readonly valueIcon: Sprite;
  private readonly valueLabel: Text;

  private isDisabled: boolean;
  private isLoading: boolean;
  private isOpen: boolean;
  private contentState: DropdownContentState;
  private loadErrorMessage = LOAD_ERROR_LABEL;
  private options: DropdownOption[];
  private scrollbarDragPointerId: number | null = null;
  private scrollbarDragStartProgress = 0;
  private scrollbarDragStartY = 0;
  private selectedOption: DropdownOption | null;

  public constructor(config: DropdownConfig, resources: DropdownResources) {
    super();

    this.config = config;
    this.layout = resolveDropdownLayout(config);
    this.options = [...config.options];
    this.validateOptions(this.options);
    this.isDisabled = config.disabled ?? false;
    this.isLoading = config.loading ?? false;
    this.contentState = this.isLoading
      ? 'loading'
      : config.options.length > 0 || !config.onOptionsRequest
        ? 'ready'
        : 'idle';
    this.isOpen = this.isLoading;
    this.selectedOption = this.resolveInitialSelection(config.selectedOptionId);
    this.itemFactory = new DropdownItemFactory(
      this.layout,
      resources.selectionIndicatorTexture,
    );
    this.listBackgroundResource = resources.listBackground;
    this.scrollController = new DropdownScrollController(
      this.handleScrollChange,
    );
    this.scrollbarView = new DropdownScrollbarView(
      this.layout.width,
      this.handleScrollbarDragStart,
    );

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

    this.valueIcon = new Sprite();
    this.valueIcon.eventMode = 'none';
    this.valueIcon.y = (this.layout.rowHeight - this.layout.iconSize) / 2;
    this.valueIcon.visible = false;

    this.valueLabel = new Text('', VALUE_TEXT_STYLE);
    this.valueLabel.eventMode = 'none';
    this.valueLabel.x = this.layout.horizontalPadding;
    this.valueLabel.y = (this.layout.rowHeight - this.valueLabel.height) / 2;

    this.toggleIndicator = this.createToggleIndicator();
    this.toggleIndicator.eventMode = 'none';
    this.toggleIndicator.pivot.set(
      TOGGLE_ICON_WIDTH / 2,
      TOGGLE_ICON_HEIGHT / 2,
    );
    this.toggleIndicator.x =
      this.layout.width -
      this.layout.horizontalPadding -
      this.layout.toggleIndicatorAreaWidth / 2;
    this.toggleIndicator.y = this.layout.rowHeight / 2;

    this.statusView = new DropdownStatusView(this.layout);

    this.listPanel = this.createNineSlicePlane(
      resources.listBackground,
      this.layout.rowHeight,
    );
    this.listViewport.mask = this.listMask;
    this.listViewport.addChild(
      this.itemsContainer,
      this.skeletonContainer,
      this.statusView,
    );
    this.listAnimationContainer.addChild(
      this.listPanel,
      this.listViewport,
      this.listMask,
      this.scrollbarView,
    );
    this.listContainer.addChild(this.listAnimationContainer);
    this.listContainer.eventMode = 'none';
    this.registerScrollEvents();
    this.listContainer.visible = this.isLoading;

    const headerY = this.createFieldLabel(config.label);
    this.fieldLabelOffset = headerY;
    this.header.y += headerY;
    this.valueIcon.y += headerY;
    this.valueLabel.y += headerY;
    this.toggleIndicator.y += headerY;
    this.listContainer.y =
      headerY + this.layout.rowHeight + this.layout.listGap;
    this.openCloseTimeline = this.createOpenCloseTimeline();

    this.addChild(
      this.header,
      this.valueIcon,
      this.valueLabel,
      this.toggleIndicator,
      this.listContainer,
    );

    this.updateHeaderInteraction();
    this.updateValueLabel();
    this.renderOptions();
    if (this.isLoading) {
      this.renderSkeleton();
      this.listContainer.visible = true;
      this.openCloseTimeline.progress(1);
    }
    this.updateContentPresentation();
    this.alpha = this.isDisabled ? 0.55 : 1;
  }

  public open(): void {
    if (this.isDisabled || this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.notifyOpenChange();
    this.listContainer.visible = true;
    this.updateListInteraction();
    this.openCloseTimeline.play();
  }

  public close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.notifyOpenChange();
    this.endScrollbarDrag();
    this.scrollController.cancelDrag();
    this.updateItemScrollGestureState(false);
    this.updateListInteraction();
    this.openCloseTimeline.reverse();
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
    this.isLoading = false;
    this.contentState = 'ready';
    this.destroySkeleton();
    this.selectedOption = selectedOptionId
      ? (this.options.find((option) => option.id === selectedOptionId) ?? null)
      : null;

    this.updateValueLabel();
    this.renderOptions();
    this.updateContentPresentation();
    this.updateListInteraction();
  }

  public setLoadError(message = LOAD_ERROR_LABEL): void {
    this.isLoading = false;
    this.contentState = 'error';
    this.loadErrorMessage = message;
    this.destroySkeleton();
    this.updateValueLabel();
    this.updateListViewport();
    this.updateContentPresentation();

    if (this.isOpen) {
      this.listContainer.visible = true;
      this.openCloseTimeline.play();
    } else {
      this.openCloseTimeline.reverse();
    }
    this.updateListInteraction();
  }

  public setLoading(loading: boolean): void {
    if (this.isLoading === loading) {
      return;
    }

    this.isLoading = loading;
    this.contentState = loading ? 'loading' : 'ready';

    if (loading && this.skeletonContainer.children.length === 0) {
      this.renderSkeleton();
    } else if (!loading) {
      this.destroySkeleton();
    }

    this.updateHeaderInteraction();
    this.updateValueLabel();
    this.updateListViewport();
    this.updateContentPresentation();

    if (loading) {
      if (!this.isOpen) {
        this.isOpen = true;
        this.notifyOpenChange();
      }

      this.listContainer.visible = true;
      this.openCloseTimeline.play();
    } else if (this.isOpen) {
      this.listContainer.visible = true;
      this.openCloseTimeline.play();
    } else {
      this.openCloseTimeline.reverse();
    }

    this.updateListInteraction();
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

  public getMaximumExpandedHeight(): number {
    const viewportHeight =
      this.layout.maxVisibleItems * this.layout.rowHeight +
      Math.max(0, this.layout.maxVisibleItems - 1) * this.layout.itemGap;

    return (
      this.fieldLabelOffset +
      this.layout.rowHeight +
      this.layout.listGap +
      viewportHeight +
      this.listBackgroundResource.shadowInsets.bottom
    );
  }

  public containsGlobalPoint(globalX: number, globalY: number): boolean {
    const globalPoint = new Point(globalX, globalY);
    const headerPoint = this.header.toLocal(globalPoint);
    const isInsideHeader = this.header.hitArea?.contains(
      headerPoint.x,
      headerPoint.y,
    );

    if (isInsideHeader && !this.isDisabled) {
      return true;
    }

    if (!this.listContainer.visible) {
      return false;
    }

    const listPoint = this.listContainer.toLocal(globalPoint);

    return (
      this.listContainer.hitArea?.contains(listPoint.x, listPoint.y) ?? false
    );
  }

  public handleWheelAt(
    globalX: number,
    globalY: number,
    deltaY: number,
  ): boolean {
    if (!this.isOpen) {
      return false;
    }

    const listBounds = this.listMask.getBounds();

    if (!listBounds.contains(globalX, globalY)) {
      return false;
    }

    this.scrollController.scrollBy(deltaY);

    return true;
  }

  public getState(): DropdownState {
    return {
      id: this.config.id,
      contentState: this.contentState,
      isOpen: this.isOpen,
      isDisabled: this.isDisabled,
      isLoading: this.isLoading,
      optionCount: this.options.length,
      renderedItemCount: this.itemsContainer.children.length,
      scrollY: this.scrollController.getScrollY(),
      selectedOptionId: this.selectedOption?.id ?? null,
    };
  }

  public override destroy(
    ..._options: Parameters<Container['destroy']>
  ): void {
    this.header.off('pointertap', this.handleHeaderTap);
    this.unregisterScrollEvents();
    this.scrollController.cancelDrag();
    this.openCloseTimeline.kill();
    super.destroy({ children: true });
  }

  private readonly handleHeaderTap = (): void => {
    if (this.isLoading) {
      this.toggle();
      return;
    }

    if (
      (this.contentState === 'idle' || this.contentState === 'error') &&
      this.config.onOptionsRequest
    ) {
      this.config.onOptionsRequest();
      return;
    }

    this.toggle();
  };

  private readonly handleCloseAnimationComplete = (): void => {
    if (!this.isOpen) {
      this.listContainer.visible = false;
    }
  };

  private readonly handleOpenAnimationComplete = (): void => {
    this.updateListInteraction();
  };

  private readonly handleOptionSelect = (option: DropdownOption): void => {
    if (this.scrollController.consumeSelectionBlock()) {
      return;
    }

    this.selectedOption = option;
    this.updateSelectedItemStates();
    this.updateValueLabel();
    this.config.onSelect?.({ dropdownId: this.config.id, option });
    this.close();
  };

  private readonly handlePointerCancel = (): void => {
    this.endScrollbarDrag();
    this.scrollController.cancelDrag();
    this.updateItemScrollGestureState(false);
  };

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (this.isOpen) {
      this.scrollController.beginDrag(event.pointerId, event.global.y);
    }
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    if (event.pointerId === this.scrollbarDragPointerId) {
      const progressDelta =
        this.scrollbarView.getTrackTravel() === 0
          ? 0
          : (event.global.y - this.scrollbarDragStartY) /
            this.scrollbarView.getTrackTravel();
      this.scrollController.scrollToProgress(
        this.scrollbarDragStartProgress + progressDelta,
      );
      return;
    }

    if (this.isOpen) {
      this.scrollController.continueDrag(event.pointerId, event.global.y);
      this.updateItemScrollGestureState(
        this.scrollController.isDragActive(),
      );
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    if (event.pointerId === this.scrollbarDragPointerId) {
      this.endScrollbarDrag();
      return;
    }

    this.scrollController.endDrag(event.pointerId);
    this.updateItemScrollGestureState(false);
  };

  private readonly handleScrollChange = (): void => {
    this.renderVisibleOptions();
    this.updateScrollbarThumbPosition();
  };

  private readonly handleScrollbarDragStart = (
    pointerId: number,
    globalY: number,
  ): void => {
    if (!this.isOpen || !this.scrollController.hasOverflow()) {
      return;
    }

    this.scrollbarDragPointerId = pointerId;
    this.scrollbarDragStartY = globalY;
    this.scrollbarDragStartProgress =
      this.scrollController.getScrollProgress();
    this.scrollbarView.setDragging(true);
    this.updateItemScrollGestureState(true);
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

  private notifyOpenChange(): void {
    this.config.onOpenChange?.({
      dropdownId: this.config.id,
      isOpen: this.isOpen,
    });
  }

  private createOpenCloseTimeline(): gsap.core.Timeline {
    gsap.set(this.listAnimationContainer, {
      alpha: 0,
      y: LIST_CLOSED_OFFSET_Y,
    });
    gsap.set(this.toggleIndicator, { rotation: 0 });

    return gsap
      .timeline({
        paused: true,
        onComplete: this.handleOpenAnimationComplete,
        onReverseComplete: this.handleCloseAnimationComplete,
      })
      .to(
        this.listAnimationContainer,
        {
          alpha: 1,
          y: 0,
          duration: LIST_ANIMATION_DURATION,
          ease: 'power2.out',
        },
        0,
      )
      .to(
        this.toggleIndicator,
        {
          rotation: Math.PI,
          duration: TOGGLE_ANIMATION_DURATION,
          ease: 'power2.out',
        },
        0,
      );
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

  private endScrollbarDrag(): void {
    this.scrollbarDragPointerId = null;
    this.scrollbarView.setDragging(false);
    this.updateItemScrollGestureState(false);
  }

  private renderOptions(): void {
    this.itemsContainer.removeChildren().forEach((child) => child.destroy());
    this.updateListViewport();

    const poolSize = Math.min(
      this.options.length,
      this.layout.maxVisibleItems + OVERSCAN_ITEM_COUNT,
    );

    for (let index = 0; index < poolSize; index += 1) {
      this.itemsContainer.addChild(
        this.itemFactory.create(
          this.options[index],
          this.handleOptionSelect,
        ),
      );
    }

    this.renderVisibleOptions();
  }

  private renderVisibleOptions(): void {
    const poolSize = this.itemsContainer.children.length;

    if (poolSize === 0) {
      return;
    }

    const maximumStartIndex = Math.max(0, this.options.length - poolSize);
    const firstVisibleIndex = this.scrollController.getFirstVisibleIndex();
    const startIndex = Math.min(
      maximumStartIndex,
      Math.max(0, firstVisibleIndex - 1),
    );
    const rowStride = this.layout.rowHeight + this.layout.itemGap;
    const scrollY = this.scrollController.getScrollY();

    this.itemsContainer.children.forEach((child, poolIndex) => {
      if (!(child instanceof DropdownItem)) {
        return;
      }

      const optionIndex = startIndex + poolIndex;
      const option = this.options[optionIndex];

      if (child.getOption().id !== option.id) {
        child.setOption(option);
      }

      child.setSelected(option.id === this.selectedOption?.id);
      child.y = optionIndex * rowStride - scrollY;
    });
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
    const isInteractive = !this.isDisabled;
    this.header.eventMode = isInteractive ? 'static' : 'none';
    this.header.cursor = isInteractive ? 'pointer' : 'default';
  }

  private updateListViewport(): void {
    const itemCount =
      this.contentState === 'loading'
        ? SKELETON_LAYOUT.barWidthRatios.length
        : this.contentState === 'error' || this.options.length === 0
          ? 1
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
    this.listContainer.hitArea = new Rectangle(
      0,
      0,
      this.layout.width,
      viewportHeight,
    );
    const rowStride = this.layout.rowHeight + this.layout.itemGap;
    const contentHeight = this.isLoading
      ? 0
      : this.options.length * this.layout.rowHeight +
        Math.max(0, this.options.length - 1) * this.layout.itemGap;
    this.scrollController.configure({
      contentHeight,
      rowStride,
      viewportHeight,
    });
    this.scrollbarView.updateLayout(
      viewportHeight,
      this.scrollController.getVisibleRatio(),
      this.scrollController.hasOverflow(),
    );
    this.updateScrollbarThumbPosition();
  }

  private updateScrollbarThumbPosition(): void {
    this.scrollbarView.setProgress(
      this.scrollController.getScrollProgress(),
    );
  }

  private registerScrollEvents(): void {
    this.listContainer.on('pointerdown', this.handlePointerDown);
    this.listContainer.on('globalpointermove', this.handlePointerMove);
    this.listContainer.on('pointerup', this.handlePointerUp);
    this.listContainer.on('pointerupoutside', this.handlePointerUp);
    this.listContainer.on('pointercancel', this.handlePointerCancel);
  }

  private unregisterScrollEvents(): void {
    this.listContainer.off('pointerdown', this.handlePointerDown);
    this.listContainer.off('globalpointermove', this.handlePointerMove);
    this.listContainer.off('pointerup', this.handlePointerUp);
    this.listContainer.off('pointerupoutside', this.handlePointerUp);
    this.listContainer.off('pointercancel', this.handlePointerCancel);
  }

  private updateContentPresentation(): void {
    const hasLoadError = this.contentState === 'error';
    const hasEmptyResult =
      this.contentState === 'ready' && this.options.length === 0;

    if (hasLoadError) {
      this.statusView.showError();
    } else if (hasEmptyResult) {
      this.statusView.showEmpty();
    } else {
      this.statusView.hide();
    }

    this.itemsContainer.visible =
      this.contentState === 'ready' && this.options.length > 0;
    this.skeletonContainer.visible = this.contentState === 'loading';
    this.valueLabel.alpha = this.isLoading ? 0.55 : 1;
  }

  private updateListInteraction(): void {
    const isInteractive =
      this.isOpen &&
      this.contentState === 'ready' &&
      this.options.length > 0 &&
      this.openCloseTimeline.progress() === 1;
    this.listContainer.eventMode = isInteractive ? 'static' : 'none';
  }

  private updateItemScrollGestureState(active: boolean): void {
    for (const child of this.itemsContainer.children) {
      if (child instanceof DropdownItem) {
        child.setScrollGestureActive(active);
      }
    }
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
      this.contentState === 'loading'
        ? LOADING_LABEL
        : this.contentState === 'error'
          ? this.loadErrorMessage
          : (this.selectedOption?.label ??
            this.config.placeholder ??
            DEFAULT_PLACEHOLDER);
    const hasSelectedIcon =
      this.contentState === 'ready' && Boolean(this.selectedOption?.icon);
    const contentX = hasSelectedIcon
      ? this.layout.horizontalPadding +
        this.layout.iconSize +
        this.layout.contentGap
      : this.layout.horizontalPadding;
    const iconAndGapWidth = hasSelectedIcon
      ? this.layout.iconSize + this.layout.contentGap
      : 0;
    const availableWidth =
      this.layout.width -
      this.layout.horizontalPadding * 2 -
      this.layout.toggleIndicatorAreaWidth -
      iconAndGapWidth;

    if (this.selectedOption?.icon) {
      this.valueIcon.texture = this.selectedOption.icon;
      fitSpriteWithin(
        this.valueIcon,
        this.layout.iconSize,
        this.layout.iconSize,
      );
      this.valueIcon.x =
        this.layout.horizontalPadding +
        (this.layout.iconSize - this.valueIcon.width) / 2;
      this.valueIcon.y =
        this.fieldLabelOffset +
        (this.layout.rowHeight - this.valueIcon.height) / 2;
    }

    this.valueIcon.visible = hasSelectedIcon;
    this.valueLabel.x = contentX;

    this.valueLabel.text = fitTextWithEllipsis(
      value,
      this.contentState === 'error' ? ERROR_TEXT_STYLE : VALUE_TEXT_STYLE,
      availableWidth,
    );
    this.valueLabel.style =
      this.contentState === 'error' ? ERROR_TEXT_STYLE : VALUE_TEXT_STYLE;
    this.valueLabel.y =
      this.fieldLabelOffset +
      (this.layout.rowHeight - this.valueLabel.height) / 2;
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
