export const isTap = (start: readonly [number, number], end: readonly [number, number]): boolean =>
  Math.hypot(start[0] - end[0], start[1] - end[1]) <= 6;
