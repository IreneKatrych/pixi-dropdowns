import { gsap } from 'gsap';
import {
  Container,
  type FederatedPointerEvent,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  type Texture,
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

const CHECKMARK_SIZE = 20;
const HIGHLIGHT_INSET = 4;
const UNDERLINE_HEIGHT = 3;
const STATE_ANIMATION_DURATION = 0.16;

export class DropdownItem extends Container {
  private readonly checkmark: Sprite;
  private readonly interactionHighlight: Graphics;
  private readonly label: Text;
  private readonly layout: ResolvedDropdownLayout;
  private readonly onSelect: DropdownItemSelectHandler;
  private readonly underline = new Graphics();

  private icon: Sprite | null = null;
  private isHovered = false;
  private isPressed = false;
  private isSelected = false;
  private option: DropdownOption;

  public constructor(
    option: DropdownOption,
    layout: ResolvedDropdownLayout,
    selectionIndicatorTexture: Texture,
    onSelect: DropdownItemSelectHandler,
  ) {
    super();

    this.layout = layout;
    this.onSelect = onSelect;
    this.option = option;
    this.interactionHighlight = this.createInteractionHighlight();
    this.label = new Text('', ITEM_TEXT_STYLE.clone());
    this.checkmark = new Sprite(selectionIndicatorTexture);
    this.checkmark.width = CHECKMARK_SIZE;
    this.checkmark.height = CHECKMARK_SIZE;
    this.checkmark.tint = COLORS.accent;
    this.checkmark.x =
      layout.width -
      layout.horizontalPadding -
      layout.selectionIndicatorAreaWidth +
      (layout.selectionIndicatorAreaWidth - CHECKMARK_SIZE) / 2;
    this.checkmark.y = (layout.rowHeight - CHECKMARK_SIZE) / 2;
    this.checkmark.visible = false;

    this.hitArea = new Rectangle(0, 0, layout.width, layout.rowHeight);
    this.addChild(
      this.interactionHighlight,
      this.label,
      this.underline,
      this.checkmark,
    );
    this.registerPointerEvents();
    this.setOption(option);
  }

  public getOption(): DropdownOption {
    return this.option;
  }

  public setOption(option: DropdownOption): void {
    this.resetInteractionState();
    this.option = option;
    this.icon?.destroy();
    this.icon = null;

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

    this.label.text = fitTextWithEllipsis(
      option.label,
      this.label.style,
      availableTextWidth,
    );
    this.label.x = contentX;
    this.label.y = (this.layout.rowHeight - this.label.height) / 2;
    this.layoutUnderline();

    this.setSelected(false);
    this.updateInteractionMode();
    this.applyVisualState(false);
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected && !this.option.disabled;
    this.checkmark.visible = this.isSelected;
  }

  public override destroy(): void {
    this.unregisterPointerEvents();
    this.killStateAnimations();
    this.icon = null;
    super.destroy({ children: true });
  }

  private readonly handlePointerDown = (): void => {
    if (this.option.disabled) {
      return;
    }

    this.isPressed = true;
    this.applyVisualState();
  };

  private readonly handlePointerOut = (event: FederatedPointerEvent): void => {
    this.isPressed = false;

    if (event.pointerType === 'mouse') {
      this.isHovered = false;
    }

    this.applyVisualState();
  };

  private readonly handlePointerOver = (event: FederatedPointerEvent): void => {
    if (this.option.disabled || event.pointerType !== 'mouse') {
      return;
    }

    this.isHovered = true;
    this.applyVisualState();
  };

  private readonly handlePointerTap = (): void => {
    if (!this.option.disabled) {
      this.onSelect(this.option);
    }
  };

  private readonly handlePointerUp = (): void => {
    if (!this.isPressed) {
      return;
    }

    this.isPressed = false;
    this.applyVisualState();
  };

  private applyVisualState(animate = true): void {
    const isDisabled = this.option.disabled ?? false;
    const showHover = this.isHovered && !isDisabled;
    const showPressed = this.isPressed && !isDisabled;
    const textColor = isDisabled
      ? COLORS.textMuted
      : showHover
        ? COLORS.accent
        : COLORS.textPrimary;
    const underlineAlpha = showHover ? 1 : 0;
    const underlineScale = showHover ? 1 : 0;
    const highlightAlpha = showPressed ? 0.85 : 0;

    this.label.style.fill = textColor;
    this.alpha = isDisabled ? 0.7 : 1;

    if (!animate) {
      this.underline.alpha = underlineAlpha;
      this.underline.scale.x = underlineScale;
      this.interactionHighlight.alpha = highlightAlpha;
      return;
    }

    gsap.to(this.underline, {
      alpha: underlineAlpha,
      duration: STATE_ANIMATION_DURATION,
      overwrite: true,
    });
    gsap.to(this.underline.scale, {
      x: underlineScale,
      duration: STATE_ANIMATION_DURATION,
      ease: 'power2.out',
      overwrite: true,
    });
    gsap.to(this.interactionHighlight, {
      alpha: highlightAlpha,
      duration: STATE_ANIMATION_DURATION,
      overwrite: true,
    });
  }

  private createInteractionHighlight(): Graphics {
    const highlight = new Graphics();
    highlight.beginFill(COLORS.pressedItemBackground);
    highlight.drawRoundedRect(
      HIGHLIGHT_INSET,
      HIGHLIGHT_INSET,
      this.layout.width - HIGHLIGHT_INSET * 2,
      this.layout.rowHeight - HIGHLIGHT_INSET * 2,
      8,
    );
    highlight.endFill();
    highlight.alpha = 0;

    return highlight;
  }

  private killStateAnimations(): void {
    gsap.killTweensOf(this.interactionHighlight);
    gsap.killTweensOf(this.underline);
    gsap.killTweensOf(this.underline.scale);
  }

  private layoutUnderline(): void {
    this.underline.clear();
    this.underline.beginFill(COLORS.accent);
    this.underline.drawRect(
      0,
      0,
      this.layout.width - this.layout.horizontalPadding * 2,
      UNDERLINE_HEIGHT,
    );
    this.underline.endFill();
    this.underline.x = this.layout.horizontalPadding;
    this.underline.y = this.layout.rowHeight - UNDERLINE_HEIGHT - 6;
    this.underline.alpha = 0;
    this.underline.scale.x = 0;
  }

  private registerPointerEvents(): void {
    this.on('pointerover', this.handlePointerOver);
    this.on('pointerout', this.handlePointerOut);
    this.on('pointerdown', this.handlePointerDown);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);
    this.on('pointercancel', this.handlePointerUp);
    this.on('pointertap', this.handlePointerTap);
  }

  private resetInteractionState(): void {
    this.killStateAnimations();
    this.isHovered = false;
    this.isPressed = false;
    this.isSelected = false;
  }

  private unregisterPointerEvents(): void {
    this.off('pointerover', this.handlePointerOver);
    this.off('pointerout', this.handlePointerOut);
    this.off('pointerdown', this.handlePointerDown);
    this.off('pointerup', this.handlePointerUp);
    this.off('pointerupoutside', this.handlePointerUp);
    this.off('pointercancel', this.handlePointerUp);
    this.off('pointertap', this.handlePointerTap);
  }

  private updateInteractionMode(): void {
    const isDisabled = this.option.disabled ?? false;
    this.eventMode = isDisabled ? 'none' : 'static';
    this.cursor = isDisabled ? 'default' : 'pointer';
  }
}
