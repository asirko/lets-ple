import { observeTheme, readCssColor, readCssColorNumber } from './css-color';

describe('css-color', () => {
  let el: HTMLElement;
  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
  });
  afterEach(() => {
    el.remove();
    vi.unstubAllGlobals();
  });

  it('lit un token hexadécimal en nombre', () => {
    el.style.setProperty('--lp-globe-land', '#102030');
    expect(readCssColorNumber('--lp-globe-land', el)).toBe(0x102030);
  });

  it('accepte la forme rgb()', () => {
    el.style.setProperty('--t', 'rgb(16 32 48)');
    expect(readCssColorNumber('--t', el)).toBe(0x102030);
    el.style.setProperty('--t', 'rgb(16, 32, 48)');
    expect(readCssColorNumber('--t', el)).toBe(0x102030);
  });

  it('lève une erreur si le token est absent', () => {
    expect(() => readCssColor('--absent', el)).toThrow();
  });

  it('observeTheme notifie le changement de data-theme et se désabonne', async () => {
    if (typeof matchMedia !== 'function')
      vi.stubGlobal('matchMedia', () => ({ addEventListener() {}, removeEventListener() {} }));
    const root = document.documentElement;
    root.dataset['theme'] = 'light';
    let calls = 0;
    const stop = observeTheme(() => calls++);
    root.dataset['theme'] = 'dark';
    await new Promise((r) => setTimeout(r));
    expect(calls).toBeGreaterThan(0);
    stop();
    const before = calls;
    root.dataset['theme'] = 'light';
    await new Promise((r) => setTimeout(r));
    expect(calls).toBe(before);
    delete root.dataset['theme'];
  });
});
