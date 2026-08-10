import { TextMetrics, type TextStyle } from 'pixi.js';

const ELLIPSIS = '…';

export function fitTextWithEllipsis(
  value: string,
  style: TextStyle,
  maxWidth: number,
): string {
  if (maxWidth <= 0) {
    return '';
  }

  if (measureTextWidth(value, style) <= maxWidth) {
    return value;
  }

  // Defensive helper edge case: the dropdown's minimum width normally leaves
  // enough room, but a generic caller may provide less than one ellipsis glyph.
  if (measureTextWidth(ELLIPSIS, style) > maxWidth) {
    return '';
  }

  const characters = Array.from(value);
  let lowerBound = 0;
  let upperBound = characters.length;

  while (lowerBound < upperBound) {
    const candidateLength = Math.ceil((lowerBound + upperBound) / 2);
    const candidate = `${characters.slice(0, candidateLength).join('').trimEnd()}${ELLIPSIS}`;

    if (measureTextWidth(candidate, style) <= maxWidth) {
      lowerBound = candidateLength;
    } else {
      upperBound = candidateLength - 1;
    }
  }

  return `${characters.slice(0, lowerBound).join('').trimEnd()}${ELLIPSIS}`;
}

function measureTextWidth(value: string, style: TextStyle): number {
  return TextMetrics.measureText(value, style).width;
}
