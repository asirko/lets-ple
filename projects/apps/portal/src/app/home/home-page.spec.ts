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
    expect(compiled.querySelectorAll('.card').length).toBe(GAME_REGISTRY.length);
  });

  it('affiche le titre du jeu dans sa carte', () => {
    const compiled = render();
    expect(compiled.textContent).toContain(GAME_REGISTRY[0].title);
  });

  it("lie chaque carte à la route du jeu", () => {
    const compiled = render();
    const link = compiled.querySelector('a');
    expect(link?.getAttribute('href')).toBe(GAME_REGISTRY[0].route);
  });
});
