import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js';
import { COLORS } from '../../theme/colors';
import { TYPOGRAPHY } from '../../theme/typography';
import type { ResolvedDropdownLayout } from './dropdownLayout';
import { fitTextWithEllipsis } from './textLayout';
import type { DropdownOption } from './types';

export type DropdownItemSelectHandler = (option: DropdownOption) => void;

const ITEM_TEXT_STYLE = new TextStyle({
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.bodySize,
  fill: COLORS.textPrimary,
});

export class DropdownItem extends Container {
  private readonly highlight: Graphics;
  private readonly label: Text;
  private readonly layout: ResolvedDropdownLayout;
  private readonly onSelect: DropdownItemSelectHandler;

  private icon: Sprite | null = null;
  private option: DropdownOption;

  public constructor(
    option: DropdownOption,
    layout: ResolvedDropdownLayout,
    onSelect: DropdownItemSelectHandler,
  ) {
    super();

    this.layout = layout;
    this.onSelect = onSelect;
    this.option = option;
    this.highlight = this.createHighlight();
    this.label = new Text('', ITEM_TEXT_STYLE.clone());

    // Logical hit bounds stay independent of text and optional icon bounds.
    this.hitArea = new Rectangle(0, 0, layout.width, layout.rowHeight);
    this.addChild(this.highlight, this.label);
    this.on('pointertap', this.handlePointerTap);
    this.setOption(option);
  }

  public getOption(): DropdownOption {
    return this.option;
  }

  public setOption(option: DropdownOption): void {
    this.option = option;
    this.icon?.destroy();
    this.icon = null;
    this.setSelected(false);

    let contentX = this.layout.horizontalPadding;
    let availableTextWidth =
      this.layout.width -
      this.layout.horizontalPadding * 2 -
      this.layout.selectionIndicatorAreaWidth;

    if (option.icon) {
      this.icon = new Sprite(option.icon);
      this.icon.width = this.layout.iconSize;
      this.icon.height = this.layout.iconSize;
      this.icon.x = contentX;
      this.icon.y = (this.layout.rowHeight - this.icon.height) / 2;
      contentX += this.icon.width + this.layout.contentGap;
      availableTextWidth -= this.icon.width + this.layout.contentGap;
      this.addChildAt(this.icon, 1);
    }

    this.label.style.fill = option.disabled
      ? COLORS.textMuted
      : COLORS.textPrimary;
    this.label.text = fitTextWithEllipsis(
      option.label,
      this.label.style,
      availableTextWidth,
    );
    this.label.x = contentX;
    this.label.y = (this.layout.rowHeight - this.label.height) / 2;

    this.alpha = option.disabled ? 0.55 : 1;
    this.eventMode = option.disabled ? 'none' : 'static';
    this.cursor = option.disabled ? 'default' : 'pointer';
  }

  public setSelected(selected: boolean): void {
    this.highlight.visible = selected;
  }

  public override destroy(): void {
    this.off('pointertap', this.handlePointerTap);
    this.icon = null;
    super.destroy({ children: true });
  }

  private readonly handlePointerTap = (): void => {
    if (!this.option.disabled) {
      this.onSelect(this.option);
    }
  };

  private createHighlight(): Graphics {
    const highlight = new Graphics();
    highlight.beginFill(COLORS.selectedItemBackground);
    highlight.drawRoundedRect(
      4,
      4,
      this.layout.width - 8,
      this.layout.rowHeight - 8,
      8,
    );
    highlight.endFill();
    highlight.visible = false;

    return highlight;
  }
}
