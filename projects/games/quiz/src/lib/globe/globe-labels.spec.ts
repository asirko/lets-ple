import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { projectGlobeLabels } from './globe-labels';

describe('country globe names', () => {
  const camera = new PerspectiveCamera(40, 1, 0.1, 20);
  camera.position.set(0, 0, 3.6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  it('hides countries behind the sphere', () => {
    const labels = projectGlobeLabels(
      [
        { code: 'FRA', name: 'France', point: new Vector3(0, 0, 1) },
        { code: 'FJI', name: 'Fidji', point: new Vector3(0, 0, -1) },
      ],
      camera,
      400,
      400,
      null,
    );
    expect(labels.map((l) => l.code)).toEqual(['FRA']);
    expect(labels[0].x).toBe(200);
    expect(labels[0].y).toBe(200);
  });
  it('prioritizes the selected country when names overlap', () => {
    const labels = projectGlobeLabels(
      [
        { code: 'AAA', name: 'Voisin', point: new Vector3(0, 0, 1) },
        { code: 'FRA', name: 'France', point: new Vector3(0, 0, 1) },
      ],
      camera,
      400,
      400,
      'FRA',
    );
    expect(labels.map((l) => l.code)).toEqual(['FRA']);
  });
});
