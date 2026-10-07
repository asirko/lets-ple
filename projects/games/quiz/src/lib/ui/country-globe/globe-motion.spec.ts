import { orbitalRotationSpeed } from './globe-motion';
describe('orbital rotation speed', () => {
  it('ralentit la rotation et l adapte a la hauteur au-dessus du globe', () => {
    expect(orbitalRotationSpeed(3.6)).toBeCloseTo(0.4);
    expect(orbitalRotationSpeed(1.35)).toBeLessThan(0.1);
    expect(orbitalRotationSpeed(2.3)).toBeCloseTo(orbitalRotationSpeed(3.6) / 2);
    expect(orbitalRotationSpeed(5.5)).toBeGreaterThan(orbitalRotationSpeed(3.6));
  });
  it('reste bornee pour un zoom extreme', () => {
    expect(orbitalRotationSpeed(1)).toBeGreaterThan(0);
    expect(orbitalRotationSpeed(100)).toBeLessThan(1);
  });
});
