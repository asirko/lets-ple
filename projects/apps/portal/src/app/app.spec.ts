import { RELEASE_DATA } from './releases/release-data';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';

@Component({ template: '' })
class EmptyPage {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: RELEASE_DATA, useValue: { version: '0.1.0', releases: [] } },
        provideRouter([
          { path: '', component: EmptyPage },
          { path: 'cryptogramme', component: EmptyPage },
          { path: 'quiz', component: EmptyPage },
          { path: 'dev', component: EmptyPage },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('affiche le titre du portail sur les pages sans en-tête propre', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/dev');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("Let's Plé");
  });

  it.each(['/?design=atelier', '/?design=focus', '/?design=arcade', '/cryptogramme', '/quiz'])(
    'laisse %s afficher son bandeau puis rétablit le titre au retour',
    async (url) => {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      await router.navigateByUrl(url);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1')).toBeNull();
      await router.navigateByUrl('/dev');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain("Let's Plé");
    },
  );
});
