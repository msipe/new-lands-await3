export function computeWobbleY(
  baseY: number,
  elapsedSeconds: number,
  amplitude: number,
  speed: number,
): number {
  return baseY + Math.sin(elapsedSeconds * speed) * amplitude;
}