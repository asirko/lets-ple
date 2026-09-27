import { signal } from '@angular/core';
import { PwaUpdateService } from '../releases/pwa-update.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GAME_REGISTRY } from '@lets-ple/game-core';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    });
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche une carte par jeu du registre', () => {
    const compiled = render();
    expect(compiled.querySelectorAll('.home-game').length).toBe(GAME_REGISTRY.length);
  });

  it('affiche le titre du jeu dans sa carte', () => {
    const compiled = render();
    expect(compiled.textContent).toContain(GAME_REGISTRY[0].title);
  });

  it('affiche les thèmes des jeux', () => {
    const compiled = render();
    expect(compiled.textContent).toContain('multi');
    expect(compiled.textContent).toContain('compétitif');
  });

  it('lie chaque carte à la route du jeu', () => {
    const compiled = render();
    const link = compiled.querySelector('.home-game');
    expect(link?.getAttribute('href')).toBe(GAME_REGISTRY[0].route);
  });
});

describe('Recherche du catalogue', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    });
  });

  function catalogue(query: string) {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).not.toBeNull();
    search!.value = query;
    search!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return { fixture, element };
  }

  it.each([
    ['  GEOGRAPHIE  pays ', 'Quiz géographie'],
    ['competitif', 'Dernier Mot'],
    ['citation lettre', 'Cryptogramme'],
  ])('recherche nom, description et thèmes sans accents : %s', (query, title) => {
    const { element } = catalogue(query);
    const cards = element.querySelectorAll('.home-game');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain(title);
  });

  it('annonce un résultat vide et permet de retrouver tout le catalogue', () => {
    const { fixture, element } = catalogue('introuvablexyz');
    expect(element.querySelectorAll('.home-game')).toHaveLength(0);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('0 jeu');
    expect(element.textContent).toContain('Aucun jeu trouvé');
    const clear = element.querySelector<HTMLButtonElement>('[aria-label="Effacer la recherche"]');
    clear!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.home-game')).toHaveLength(GAME_REGISTRY.length);
    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('');
  });

  it('considère une saisie composée d’espaces comme une recherche vide', () => {
    const { element } = catalogue('   ');
    expect(element.querySelectorAll('.home-game')).toHaveLength(GAME_REGISTRY.length);
  });
});

describe('Mise à jour depuis le catalogue Focus', () => {
  it.each([false, true])(
    'conserve l’accès à la modale quand une mise à jour est disponible : %s',
    (available) => {
      const requestPrompt = vi.fn();
      TestBed.configureTestingModule({
        imports: [HomePage],
        providers: [
          provideRouter([]),
          {
            provide: PwaUpdateService,
            useValue: { available: signal(available), recovery: signal(false), requestPrompt },
          },
        ],
      });
      const fixture = TestBed.createComponent(HomePage);
      fixture.detectChanges();
      const header = (fixture.nativeElement as HTMLElement).querySelector('.home-header');
      const button = header?.querySelector<HTMLButtonElement>('.home-update-action');
      if (available) {
        expect(button).not.toBeNull();
        button!.click();
        expect(requestPrompt).toHaveBeenCalledOnce();
      } else {
        expect(button).toBeNull();
      }
    },
  );
});
