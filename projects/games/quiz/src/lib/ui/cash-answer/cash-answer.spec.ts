import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LpCashAnswer } from './cash-answer';

describe('Cash autocomplete', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function setup() {
    vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const fixture = TestBed.createComponent(LpCashAnswer);
    fixture.componentRef.setInput('domain', [
      { id: 'CIV', label: 'Côte d’Ivoire', aliases: [], countryCodes: ['CIV'] },
      { id: 'FRA', label: 'France', aliases: [], countryCodes: ['FRA'] },
    ]);
    fixture.componentRef.setInput('answerType', 'country');
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  it('cache les suggestions à vide, filtre sans accents et sélectionne au clavier', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    expect(el.querySelectorAll('[role=option]').length).toBe(0);
    input.value = 'cote divoire';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('[role=option]')?.textContent).toContain('Côte d’Ivoire');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('Côte d’Ivoire');
    const received: string[] = [];
    fixture.componentInstance.answered.subscribe((value) => received.push(value));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(received).toEqual(['Côte d’Ivoire']);
  });
  it('garde une faute dans le champ et explique le domaine attendu', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'Frannce';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('pays');
  });
  it('active le dernier résultat avec Flèche haut depuis la saisie', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[role=option][aria-selected=true]')?.textContent?.trim()).toBe(
      'France',
    );
  });
  it('borne la liste au-dessus du champ dans le viewport visible et recalcule au resize', async () => {
    const viewport = Object.assign(new EventTarget(), {
      offsetTop: 40,
      offsetLeft: 0,
      height: 280,
      width: 320,
    });
    vi.stubGlobal('visualViewport', viewport);
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      top: 220,
      bottom: 268,
      left: 12,
      right: 308,
      width: 296,
      height: 48,
      x: 12,
      y: 220,
      toJSON() {},
    });
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const list = el.querySelector<HTMLElement>('[role=listbox]')!;
    expect(parseFloat(list.style.top)).toBeLessThan(220);
    expect(parseFloat(list.style.maxHeight)).toBeLessThanOrEqual(172);
    expect(parseFloat(list.style.maxHeight)).toBeGreaterThan(0);
    viewport.offsetTop = 140;
    viewport.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    fixture.detectChanges();
    expect(parseFloat(list.style.maxHeight)).toBeLessThanOrEqual(72);
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('laisse le geste tactile défiler et sélectionne malgré un blur pendant le tap', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const option = el.querySelector<HTMLElement>('[role=option]')!;
    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(down, 'pointerType', { value: 'touch' });
    option.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    option.dispatchEvent(new Event('pointerup', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
    expect(input.value).toBe('Côte d’Ivoire');
    option.click();
    fixture.detectChanges();
    expect(input.value).toBe('Côte d’Ivoire');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(input);
  });

  it('ferme sur Échap et blur sans perdre la saisie, annonce les recherches sans résultat', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(input.value).toBe('r');
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('[role=status]')?.textContent).toBeTruthy();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
  it('conserve la liste et la valeur pendant un défilement tactile annulé par le navigateur', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const option = el.querySelector<HTMLElement>('[role=option]')!;
    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperties(down, {
      pointerType: { value: 'touch' },
      clientX: { value: 30 },
      clientY: { value: 100 },
    });
    option.dispatchEvent(down);
    input.blur();
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    window.dispatchEvent(new Event('pointercancel'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.value).toBe('r');
    expect(document.activeElement).toBe(input);
  });

  it('conserve tous les résultats et parcourt la longue liste sans déplacer la page', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput(
      'domain',
      Array.from({ length: 40 }, (_, i) => ({
        id: String(i),
        label: 'Pays ' + i,
        aliases: [],
        countryCodes: [],
      })),
    );
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'pays';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelectorAll('[role=option]')).toHaveLength(40);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(el.querySelector('[aria-selected=true]')?.textContent?.trim()).toBe('Pays 39');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(el.querySelector('[aria-selected=true]')?.textContent?.trim()).toBe('Pays 0');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(input.value).toBe('Pays 0');
  });
  it('désactive Valider pour une saisie vide ou partielle, accepte les noms normalisés et alias', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const button = el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBe(true);
    fixture.componentRef.setInput('domain', [
      { id: 'CIV', label: 'Côte d’Ivoire', aliases: ['CI'], countryCodes: ['CIV'] },
      { id: 'FRA', label: 'France', aliases: [], countryCodes: ['FRA'] },
    ]);
    for (const [value, disabled] of [
      ['Fra', true],
      ['Frannce', true],
      [' France ', false],
      ['cote divoire', false],
      ['ci', false],
      ['', true],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(button.disabled, value).toBe(disabled);
    }
  });

  it('bloque le scroll de page pendant le focus, le restaure au blur et au démontage', async () => {
    const previous = document.body.style.cssText;
    const rootOverflow = document.documentElement.style.overflow;
    const fixture = await setup();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(document.body.style.position).toBe('fixed');
    expect(document.documentElement.style.overflow).toBe('hidden');
    input.blur();
    fixture.detectChanges();
    expect(document.body.style.cssText).toBe(previous);
    expect(document.documentElement.style.overflow).toBe(rootOverflow);
    input.focus();
    fixture.detectChanges();
    expect(document.body.style.position).toBe('fixed');
    fixture.destroy();
    expect(document.body.style.cssText).toBe(previous);
    expect(document.documentElement.style.overflow).toBe(rootOverflow);
  });

  it('conserve le verrouillage après Échap et sélection tant que le champ garde le focus', async () => {
    const fixture = await setup();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'fra';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(document.body.style.position).toBe('fixed');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(input.value).toBe('France');
    expect(document.activeElement).toBe(input);
    expect(document.body.style.position).toBe('fixed');
  });
  it('ancre le bloc au bas du viewport mobile et revient dans le flux sur grand écran', async () => {
    const viewport = Object.assign(new EventTarget(), {
      offsetTop: 40,
      offsetLeft: 10,
      height: 280,
      width: 320,
    });
    vi.stubGlobal('visualViewport', viewport);
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const entry = el.querySelector<HTMLElement>('.quiz-cash-entry')!;
    vi.spyOn(entry, 'scrollHeight', 'get').mockReturnValue(100);
    vi.spyOn(el.querySelector('form')!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 300,
      left: 20,
      right: 300,
      width: 280,
      height: 300,
      x: 20,
      y: 0,
      toJSON() {},
    });
    input.value = 'fra';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(entry.style.top).toBe('210px');
    expect(entry.style.left).toBe('20px');
    expect(entry.style.width).toBe('280px');
    viewport.height = 180;
    viewport.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    fixture.detectChanges();
    expect(entry.style.top).toBe('114px');
    expect(entry.style.maxHeight).toBe('172px');
    viewport.width = 1200;
    viewport.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    fixture.detectChanges();
    expect(el.querySelector('form')!.classList.contains('is-docked')).toBe(false);
    expect(entry.style.top).toBe('');
  });

  it('laisse Tab accéder au bouton et restaure la page quand le focus quitte le bloc', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const button = el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    input.value = 'France';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button.focus();
    fixture.detectChanges();
    expect(document.activeElement).toBe(button);
    expect(document.body.style.position).toBe('fixed');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    button.blur();
    fixture.detectChanges();
    expect(document.body.style.position).toBe('');
    expect(input.value).toBe('France');
  });

  it('ne bloque pas le scroll interne du bloc dans un viewport court', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const entry = el.querySelector<HTMLElement>('.quiz-cash-entry')!;
    const inside = new Event('touchmove', { bubbles: true, cancelable: true });
    entry.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(false);
    const outside = new Event('touchmove', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(true);
    const pinch = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(pinch, 'touches', { value: [{}, {}] });
    document.body.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(false);
  });
});
