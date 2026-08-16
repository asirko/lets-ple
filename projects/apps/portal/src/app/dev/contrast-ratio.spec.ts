import { contrastRatio } from './contrast-ratio';

describe('contrastRatio', () => {
  it('renvoie 21 pour blanc contre noir', () => {
    expect(contrastRatio('rgb(255, 255, 255)', 'rgb(0, 0, 0)')).toBeCloseTo(21, 1);
  });

  it('renvoie 1 pour deux couleurs identiques', () => {
    expect(contrastRatio('rgb(120, 80, 40)', 'rgb(120, 80, 40)')).toBeCloseTo(1, 5);
  });

  it('est symétrique', () => {
    const a = contrastRatio('rgb(250, 247, 242)', 'rgb(107, 97, 82)');
    const b = contrastRatio('rgb(107, 97, 82)', 'rgb(250, 247, 242)');
    expect(a).toBeCloseTo(b, 10);
  });

  it('retrouve le ratio texte-atténué / fond mesuré sur les tokens actuels (~5.68:1)', () => {
    expect(contrastRatio('rgb(107, 97, 82)', 'rgb(250, 247, 242)')).toBeCloseTo(5.68, 1);
  });

  it('accepte une couleur avec canal alpha', () => {
    expect(contrastRatio('rgba(255, 255, 255, 1)', 'rgb(0, 0, 0)')).toBeCloseTo(21, 1);
  });
});
