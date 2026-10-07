import { countryAnchor, placeLabels, spherePoint, unwrapRing } from './globe-geography';
import type { Geometry } from '../../domain/types';
const square = (x: number, y: number, size: number) =>
  [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ] as const;
describe('globe geography', () => {
  it('place Greenwich sur x et le pole nord sur y', () => {
    expect(spherePoint([0, 0])).toEqual([1, 0, 0]);
    expect(spherePoint([90, 0])[2]).toBeCloseTo(-1);
    expect(spherePoint([0, 90])[1]).toBeCloseTo(1);
  });
  it('deroule la coupure de longitude sans bande mondiale', () => {
    expect(
      unwrapRing([
        [179, 0],
        [-179, 1],
        [179, 0],
      ]),
    ).toEqual([
      [179, 0],
      [181, 1],
      [179, 0],
    ]);
  });
  it('centre les pays traversant le meridien 180', () => {
    const g: Geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [178, -2],
          [-178, -2],
          [-178, 2],
          [178, 2],
          [178, -2],
        ],
      ],
    };
    expect(Math.abs(countryAnchor(g)[0])).toBeCloseTo(180);
    expect(countryAnchor(g)[1]).toBeCloseTo(0);
  });
  it('privilegie le territoire principal et conserve les petites iles', () => {
    expect(
      countryAnchor({
        type: 'MultiPolygon',
        coordinates: [[square(100, 0, 0.01)], [square(0, 0, 10)]],
      }),
    ).toEqual([5, 5]);
    expect(countryAnchor({ type: 'Polygon', coordinates: [square(42, -20, 0.01)] })[0]).toBeCloseTo(
      42.005,
    );
  });
  it('donne priorite au pays corrige et evite collisions et hors cadre', () => {
    const base = { x: 50, y: 50, width: 60, height: 20 };
    const labels = placeLabels(
      [
        { ...base, code: 'B', name: 'B', priority: 1 },
        { ...base, code: 'A', name: 'A', priority: 100 },
        { ...base, x: -100, code: 'C', name: 'C', priority: 0 },
      ],
      100,
      100,
    );
    expect(labels.map((l) => l.code)).toEqual(['A']);
  });
});
