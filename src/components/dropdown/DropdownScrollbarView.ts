import {
  Container,
  type FederatedPointerEvent,
  Graphics,
  Point,
  Rectangle,
} from 'pixi.js';
import { COLORS } from '../../theme/colors';

const SCROLLBAR_WIDTH = 4;
const SCROLLBAR_EDGE_INSET = 8;
const SCROLLBAR_MIN_THUMB_HEIGHT = 32;
const SCROLLBAR_RADIUS = SCROLLBAR_WIDTH / 2;
const SCROLLBAR_HIT_AREA_WIDTH = 24;
const SCROLLBAR_THUMB_ALPHA = 0.85;

export type ScrollbarDragStartHandler = (
  pointerId: number,
  globalY: number,
) => void;

export class DropdownScrollbarView extends Container {
  private readonly interactionArea = new Container();
  private readonly thumb = new Graphics();
  private readonly track = new Graphics();

  private trackTravel = 0;

  public constructor(
    private readonly dropdownWidth: number,
    private readonly onDragStart: ScrollbarDragStartHandler,
  ) {
    super();

    this.addChild(this.track, this.thumb, this.interactionArea);
    this.interactionArea.on('pointerdown', this.handlePointerDown);
  }

  public updateLayout(
    viewportHeight: number,
    visibleRatio: number,
    hasOverflow: boolean,
  ): void {
    this.visible = hasOverflow;
    this.interactionArea.eventMode = hasOverflow ? 'static' : 'none';

    if (!hasOverflow) {
      return;
    }

    const verticalInsets = SCROLLBAR_EDGE_INSET * 2;
    const trackHeight = viewportHeight - verticalInsets;
    const thumbHeight = Math.max(
      SCROLLBAR_MIN_THUMB_HEIGHT,
      trackHeight * visibleRatio,
    );
    const scrollbarX =
      this.dropdownWidth - SCROLLBAR_EDGE_INSET - SCROLLBAR_WIDTH;

    this.track.clear();
    this.track.beginFill(COLORS.scrollbarTrack);
    this.track.drawRoundedRect(
      scrollbarX,
      SCROLLBAR_EDGE_INSET,
      SCROLLBAR_WIDTH,
      trackHeight,
      SCROLLBAR_RADIUS,
    );
    this.track.endFill();

    this.thumb.clear();
    this.thumb.beginFill(COLORS.scrollbarThumb);
    this.thumb.drawRoundedRect(
      scrollbarX,
      0,
      SCROLLBAR_WIDTH,
      thumbHeight,
      SCROLLBAR_RADIUS,
    );
    this.thumb.endFill();
    this.thumb.alpha = SCROLLBAR_THUMB_ALPHA;

    this.trackTravel = trackHeight - thumbHeight;
    this.interactionArea.x =
      this.dropdownWidth - SCROLLBAR_HIT_AREA_WIDTH;
    this.interactionArea.hitArea = new Rectangle(
      0,
      0,
      SCROLLBAR_HIT_AREA_WIDTH,
      thumbHeight,
    );
    this.interactionArea.cursor = 'grab';
    this.setProgress(0);
  }

  public setProgress(progress: number): void {
    if (!this.visible) {
      return;
    }

    const thumbY =
      SCROLLBAR_EDGE_INSET + this.trackTravel * progress;
    this.thumb.y = thumbY;
    this.interactionArea.y = thumbY;
  }

  public getTrackTravel(): number {
    return this.trackTravel;
  }

  public getThumbInteractionBounds(): Rectangle {
    const hitArea = this.interactionArea.hitArea as Rectangle;
    const topLeft = this.interactionArea.toGlobal(
      new Point(hitArea.x, hitArea.y),
    );
    const bottomRight = this.interactionArea.toGlobal(
      new Point(hitArea.right, hitArea.bottom),
    );

    return new Rectangle(
      Math.min(topLeft.x, bottomRight.x),
      Math.min(topLeft.y, bottomRight.y),
      Math.abs(bottomRight.x - topLeft.x),
      Math.abs(bottomRight.y - topLeft.y),
    );
  }

  public setDragging(isDragging: boolean): void {
    this.interactionArea.cursor = isDragging ? 'grabbing' : 'grab';
  }

  public override destroy(): void {
    this.interactionArea.off('pointerdown', this.handlePointerDown);
    super.destroy({ children: true });
  }

  private readonly handlePointerDown = (
    event: FederatedPointerEvent,
  ): void => {
    event.stopPropagation();
    this.onDragStart(event.pointerId, event.global.y);
  };
}
