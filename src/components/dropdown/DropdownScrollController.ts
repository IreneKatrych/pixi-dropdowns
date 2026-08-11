const DEFAULT_DRAG_THRESHOLD = 8;

export interface DropdownScrollMetrics {
  contentHeight: number;
  rowStride: number;
  viewportHeight: number;
}

export class DropdownScrollController {
  private activePointerId: number | null = null;
  private blockNextSelection = false;
  private dragStartY = 0;
  private isDragging = false;
  private maxScrollY = 0;
  private metrics: DropdownScrollMetrics = {
    contentHeight: 0,
    rowStride: 0,
    viewportHeight: 0,
  };
  private previousPointerY = 0;
  private scrollY = 0;

  public constructor(
    private readonly onScrollChange: (scrollY: number) => void,
    private readonly dragThreshold = DEFAULT_DRAG_THRESHOLD,
  ) {}

  public configure(metrics: DropdownScrollMetrics): void {
    this.metrics = metrics;
    this.maxScrollY = Math.max(
      0,
      metrics.contentHeight - metrics.viewportHeight,
    );
    this.cancelDrag();
    this.setScrollY(0);
  }

  public beginDrag(pointerId: number, globalY: number): void {
    if (!this.canScroll()) {
      return;
    }

    this.activePointerId = pointerId;
    this.blockNextSelection = false;
    this.dragStartY = globalY;
    this.previousPointerY = globalY;
    this.isDragging = false;
  }

  public continueDrag(pointerId: number, globalY: number): void {
    if (pointerId !== this.activePointerId) {
      return;
    }

    if (!this.isDragging) {
      if (Math.abs(globalY - this.dragStartY) < this.dragThreshold) {
        return;
      }

      this.isDragging = true;
      this.scrollBy(this.dragStartY - globalY);
    } else {
      this.scrollBy(this.previousPointerY - globalY);
    }

    this.previousPointerY = globalY;
  }

  public endDrag(pointerId: number): void {
    if (pointerId !== this.activePointerId) {
      return;
    }

    this.blockNextSelection = this.isDragging;
    this.activePointerId = null;
    this.isDragging = false;
  }

  public cancelDrag(): void {
    this.activePointerId = null;
    this.blockNextSelection = false;
    this.isDragging = false;
  }

  public scrollBy(delta: number): boolean {
    return this.canScroll()
      ? this.setScrollY(this.scrollY + delta)
      : false;
  }

  public scrollToProgress(progress: number): boolean {
    const normalizedProgress = Math.min(1, Math.max(0, progress));

    return this.setScrollY(this.maxScrollY * normalizedProgress);
  }

  public consumeSelectionBlock(): boolean {
    const shouldBlock = this.blockNextSelection;
    this.blockNextSelection = false;

    return shouldBlock;
  }

  public getScrollY(): number {
    return this.scrollY;
  }

  public getScrollProgress(): number {
    return this.maxScrollY === 0
      ? 0
      : this.scrollY / this.maxScrollY;
  }

  public getVisibleRatio(): number {
    return this.metrics.contentHeight === 0
      ? 1
      : Math.min(
          1,
          this.metrics.viewportHeight / this.metrics.contentHeight,
        );
  }

  public hasOverflow(): boolean {
    return this.canScroll();
  }

  public getFirstVisibleIndex(): number {
    return this.metrics.rowStride === 0
      ? 0
      : Math.floor(this.scrollY / this.metrics.rowStride);
  }

  public isDragActive(): boolean {
    return this.isDragging;
  }

  private canScroll(): boolean {
    return this.maxScrollY > 0;
  }

  private setScrollY(scrollY: number): boolean {
    const nextOffset = Math.min(
      this.maxScrollY,
      Math.max(0, scrollY),
    );

    if (nextOffset === this.scrollY) {
      return false;
    }

    this.scrollY = nextOffset;
    this.onScrollChange(this.scrollY);

    return true;
  }
}
