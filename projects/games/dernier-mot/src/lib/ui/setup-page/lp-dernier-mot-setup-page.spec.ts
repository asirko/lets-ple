import { TestBed } from '@angular/core/testing';
import { LpDernierMotSetupPage } from './lp-dernier-mot-setup-page';

const manifestFixture = {
  schemaVersion: 1 as const,
  generatedAt: '2026-08-29T22:58:00.000Z',
  entryCount: 47_920,
  sources: [
    {
      name: 'Lexique 4' as const,
      url: 'https://lexique.org/databases/Lexique400/Lexique400.tsv',
      retrievedAt: '2026-08-29T22:57:34.000Z',
      license: 'CC-BY-SA-4.0' as const,
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: ['Boris New', 'Christophe Pallier'],
      sha256: 'fe333b4f9e1797f23922d5863cde28635ee13685813af0f9b4b4b9f7d4610a5a',
    },
    {
      name: 'Wiktionnaire' as const,
      url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
      retrievedAt: '2026-08-29T22:58:00.000Z',
      license: 'CC-BY-SA-4.0' as const,
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: ['Contributeurs du Wiktionnaire en français'],
      sha256: 'f7c1756aa2e07b21e255d154f9ec9b51a1d8da126896b22dc7ac5873efa17c05',
    },
  ],
  adaptation: {
    license: 'CC-BY-SA-4.0' as const,
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    notice: 'Corpus dérivé : sélection de lemmes et construction d’un index de préfixes.',
  },
};

describe('LpDernierMotSetupPage', () => {
  it('garde le démarrage désactivé avant le deuxième pseudonyme', () => {
    const fixture = TestBed.createComponent(LpDernierMotSetupPage);
    fixture.detectChanges();

    enterName(fixture.nativeElement, 'Alice');
    fixture.detectChanges();
    addButton(fixture.nativeElement).click();
    fixture.detectChanges();

    expect(startButton(fixture.nativeElement).disabled).toBe(true);
  });

  it('refuse un doublon sans tenir compte de la casse', () => {
    const fixture = TestBed.createComponent(LpDernierMotSetupPage);
    fixture.detectChanges();

    enterName(fixture.nativeElement, 'Alice');
    fixture.detectChanges();
    addButton(fixture.nativeElement).click();
    fixture.detectChanges();
    enterName(fixture.nativeElement, '  ALICE  ');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'déjà utilisé',
    );
    expect(startButton(fixture.nativeElement).disabled).toBe(true);
  });

  it('transmet la liste ordonnée à l’assembleur', () => {
    const fixture = TestBed.createComponent(LpDernierMotSetupPage);
    const submitted: (readonly string[])[] = [];
    fixture.componentInstance.playersSubmitted.subscribe((names) => submitted.push(names));
    fixture.detectChanges();

    enterName(fixture.nativeElement, 'Alice');
    fixture.detectChanges();
    addButton(fixture.nativeElement).click();
    fixture.detectChanges();
    enterName(fixture.nativeElement, 'Basile');
    fixture.detectChanges();
    startButton(fixture.nativeElement).click();

    expect(submitted).toEqual([['Alice', 'Basile']]);
  });

  it('rend accessibles les attributions du dictionnaire depuis le setup', () => {
    const fixture = TestBed.createComponent(LpDernierMotSetupPage);
    fixture.componentRef.setInput('manifest', manifestFixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lp-dictionary-credits')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Lexique 4');
    expect(fixture.nativeElement.textContent).toContain('Wiktionnaire');
  });
});

function enterName(root: HTMLElement, value: string): void {
  const input = root.querySelector('[data-player-name]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function addButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-add-player]') as HTMLButtonElement;
}

function startButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-start-game]') as HTMLButtonElement;
}
