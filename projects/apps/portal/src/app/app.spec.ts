import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { RELEASE_DATA } from './releases/release-data';

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
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("Let's Plé");
  });

  it.each(['/cryptogramme', '/quiz'])(
    'laisse %s afficher son bandeau puis rétablit le titre au retour',
    async (url) => {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      await router.navigateByUrl(url);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1')).toBeNull();
      await router.navigateByUrl('/');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain("Let's Plé");
    },
  );
});
