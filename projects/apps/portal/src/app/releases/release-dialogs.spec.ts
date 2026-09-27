import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { ReleaseDialogs } from './release-dialogs';
import { ReleaseNotesService } from './release-notes.service';
import { PwaUpdateService } from './pwa-update.service';

@Component({ template: '' })
class EmptyPage {}
describe('ReleaseDialogs', () => {
  const release = {
    version: '0.2.0',
    date: '2026-09-27',
    features: ['Un nouveau jeu'],
    fixes: [],
    breaking: [],
  };
  let pending = signal([release]),
    prompt = signal(false);
  beforeEach(async () => {
    pending = signal([release]);
    prompt = signal(false);
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: EmptyPage },
          { path: 'quiz', component: EmptyPage },
          { path: 'dev/components', component: EmptyPage },
        ]),
        { provide: ReleaseNotesService, useValue: { pending, acknowledge: () => pending.set([]) } },
        {
          provide: PwaUpdateService,
          useValue: {
            promptPending: prompt,
            recovery: signal(false),
            defer: () => prompt.set(false),
            reload: vi.fn(),
          },
        },
      ],
    });
    await TestBed.inject(Router).navigateByUrl('/');
  });
  async function settle(fixture: ReturnType<typeof TestBed.createComponent<ReleaseDialogs>>) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
  }
  it('attend l accueil lors dun acces direct a un jeu', async () => {
    await TestBed.inject(Router).navigateByUrl('/quiz');
    const fixture = TestBed.createComponent(ReleaseDialogs);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(0);
    await TestBed.inject(Router).navigateByUrl('/');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('dialog[open]').textContent).toContain(
      'Quoi de neuf',
    );
  });
  it('ne superpose pas mise a jour et nouveautes', async () => {
    const fixture = TestBed.createComponent(ReleaseDialogs);
    await settle(fixture);
    prompt.set(true);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('dialog[open]').textContent).toContain(
      'Quoi de neuf',
    );
    fixture.nativeElement.querySelector('dialog[open] button').click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('dialog[open]').textContent).toContain(
      'mise à jour',
    );
  });
  it('attend la fermeture dune modale de jeu', async () => {
    const external = document.createElement('dialog');
    external.setAttribute('open', '');
    document.body.append(external);
    try {
      const fixture = TestBed.createComponent(ReleaseDialogs);
      await settle(fixture);
      expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(0);
      external.remove();
      await settle(fixture);
      expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(1);
    } finally {
      external.remove();
    }
  });
  it('reste silencieux dans le showcase', async () => {
    await TestBed.inject(Router).navigateByUrl('/dev/components');
    prompt.set(true);
    const fixture = TestBed.createComponent(ReleaseDialogs);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('dialog[open]')).toHaveLength(0);
  });
});
