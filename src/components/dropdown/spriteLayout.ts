import type { Sprite } from 'pixi.js';

export function fitSpriteWithin(
  sprite: Sprite,
  maximumWidth: number,
  maximumHeight: number,
): void {
  const textureWidth = sprite.texture.width;
  const textureHeight = sprite.texture.height;

  if (textureWidth <= 0 || textureHeight <= 0) {
    sprite.width = maximumWidth;
    sprite.height = maximumHeight;
    return;
  }

  const scale = Math.min(
    maximumWidth / textureWidth,
    maximumHeight / textureHeight,
  );
  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
}
