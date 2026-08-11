import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLORS } from '../../theme/colors';
import { TYPOGRAPHY } from '../../theme/typography';
import type { ResolvedDropdownLayout } from './dropdownLayout';
import { fitTextWithEllipsis } from './textLayout';

const ERROR_LABEL = 'Options unavailable';
const EMPTY_LABEL = 'No options available';
const ICON_SIZE = 20;
const ICON_STROKE_WIDTH = 1.5;
const ICON_MARK_WIDTH = 1.5;
const ICON_MARK_TOP = 5;
const ICON_MARK_BOTTOM = 10;
const ICON_DOT_Y = 14;
const ICON_DOT_RADIUS = 0.65;

const DEFAULT_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.bodySize,
  fill: COLORS.textPrimary,
});

const ERROR_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.bodySize,
  fill: COLORS.error,
});

export class DropdownStatusView extends Container {
  private readonly icon = this.createErrorIcon();
  private readonly label = new Text(EMPTY_LABEL, DEFAULT_TEXT_STYLE);

  public constructor(private readonly layout: ResolvedDropdownLayout) {
    super();

    this.eventMode = 'none';
    this.icon.x = layout.horizontalPadding;
    this.icon.y = (layout.rowHeight - ICON_SIZE) / 2;
    this.label.y = (layout.rowHeight - this.label.height) / 2;
    this.addChild(this.icon, this.label);
    this.hide();
  }

  public showError(message = ERROR_LABEL): void {
    this.icon.visible = true;
    this.label.style = ERROR_TEXT_STYLE;
    this.label.x =
      this.layout.horizontalPadding + ICON_SIZE + this.layout.contentGap;
    this.label.text = fitTextWithEllipsis(
      message,
      ERROR_TEXT_STYLE,
      this.layout.width -
        this.layout.horizontalPadding * 2 -
        ICON_SIZE -
        this.layout.contentGap,
    );
    this.visible = true;
  }

  public showEmpty(message = EMPTY_LABEL): void {
    this.icon.visible = false;
    this.label.style = DEFAULT_TEXT_STYLE;
    this.label.x = this.layout.horizontalPadding;
    this.label.text = fitTextWithEllipsis(
      message,
      DEFAULT_TEXT_STYLE,
      this.layout.width - this.layout.horizontalPadding * 2,
    );
    this.visible = true;
  }

  public hide(): void {
    this.visible = false;
  }

  private createErrorIcon(): Graphics {
    const icon = new Graphics();
    const center = ICON_SIZE / 2;

    icon.lineStyle(ICON_STROKE_WIDTH, COLORS.error);
    icon.drawCircle(center, center, center - ICON_STROKE_WIDTH / 2);
    icon.lineStyle(ICON_MARK_WIDTH, COLORS.error);
    icon.moveTo(center, ICON_MARK_TOP);
    icon.lineTo(center, ICON_MARK_BOTTOM);
    icon.beginFill(COLORS.error);
    icon.drawCircle(center, ICON_DOT_Y, ICON_DOT_RADIUS);
    icon.endFill();

    return icon;
  }
}
