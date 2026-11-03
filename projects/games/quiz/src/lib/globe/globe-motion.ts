// Camera distance minus the unit sphere radius keeps drag motion steady on screen
// as zoom magnifies the globe. Near-surface motion must stay especially gentle.
export function orbitalRotationSpeed(distance: number): number {
  return Math.max(0.04, Math.min(0.65, (0.4 * (distance - 1)) / 2.6));
}
