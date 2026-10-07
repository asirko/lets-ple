import type { Camera, Vector3 } from 'three';
import { placeLabels, type LabelCandidate } from '../ui/country-globe/globe-geography';
export function projectGlobeLabels(
  locations: readonly { code: string; name: string; point: Vector3 }[],
  camera: Camera,
  width: number,
  height: number,
  selected: string | null,
): readonly LabelCandidate[] {
  const labels: LabelCandidate[] = [];
  for (const { code, name, point } of locations) {
    if (point.dot(camera.position) <= 1.01) continue;
    const projected = point.clone().project(camera);
    if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z > 1) continue;
    labels.push({
      code,
      name,
      x: ((projected.x + 1) * width) / 2,
      y: ((1 - projected.y) * height) / 2,
      width: Math.min(width - 8, name.length * 7 + 12),
      height: 22,
      priority: code === selected ? 10000 : 0,
    });
  }
  return placeLabels(labels, width, height);
}
