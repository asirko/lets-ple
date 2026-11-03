import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { DevHomePage } from './dev-home-page';

describe('DevHomePage', () => {
  it('lie la modale partagée depuis l’index du showcase', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DevHomePage);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const dialogLink = Array.from(links).find((link) => link.textContent.trim() === 'LpDialog');
    expect(dialogLink).toBeDefined();
    expect(dialogLink?.getAttribute('href')).toContain('lp-dialog');
  });

  it('regroupe les liens par niveau atomique', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DevHomePage);
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('h2') as NodeListOf<HTMLElement>,
    ).map((title) => title.textContent.trim());
    expect(titles).toEqual([
      'Atomes',
      'Molécules',
      'Organismes — géo quiz',
      'Écrans et pages de travail',
      'Autres jeux',
    ]);
  });
});
