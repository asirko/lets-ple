import { TestBed } from '@angular/core/testing';
import { DEV_ROUTES } from './dev.routes';
import { ShowcaseRenderer } from './showcase-renderer/showcase-renderer';

describe('DEV_ROUTES', () => {
  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
  });

  it('charge le showcase réel de LpDialog depuis sa route dédiée', async () => {
    const route = DEV_ROUTES.find(({ path }) => path === 'lp-dialog');

    expect(route).toBeDefined();
    const showcase = await route?.data?.['loadShowcase']();
    expect(showcase?.controls).toMatchObject({
      open: { kind: 'boolean', default: true },
      closeOnEscape: { kind: 'boolean', default: false },
    });
  });

  it("rend l'action principale du showcase dans la zone d'actions de la modale", async () => {
    const route = DEV_ROUTES.find(({ path }) => path === 'lp-dialog');
    const showcase = await route?.data?.['loadShowcase']();
    const fixture = TestBed.createComponent(ShowcaseRenderer);
    fixture.componentRef.setInput('showcase', showcase);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialog-actions .b-primary')).not.toBeNull();
  });

  it('ferme le showcase par son action explicite et permet ensuite de le rouvrir', async () => {
    const route = DEV_ROUTES.find(({ path }) => path === 'lp-dialog');
    const showcase = await route?.data?.['loadShowcase']();
    const fixture = TestBed.createComponent(ShowcaseRenderer);
    fixture.componentRef.setInput('showcase', showcase);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

    (dialog.querySelector('.b-primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dialog.open).toBe(false);
    (
      fixture.nativeElement.querySelector('[data-dialog-showcase-reopen]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
  });

  it.each([
    ['lp-player-setup', 'names'],
    ['lp-scoreboard', 'state'],
    ['lp-word-progress', 'state'],
    ['lp-letter-keyboard', 'disabled'],
    ['lp-turn-dialog', 'view'],
  ])('charge le showcase Dernier Mot %s et son contrôle principal', async (path, control) => {
    const route = DEV_ROUTES.find((candidate) => candidate.path === path);

    expect(route).toBeDefined();
    const showcase = await route?.data?.['loadShowcase']();
    expect(showcase?.controls?.[control]).toBeDefined();
  });

  it.each([
    ['lp-scoreboard', 'Scores ex æquo', '[data-winner="true"]', 2],
    ['lp-word-progress', 'Mot terminal', '.is-terminal', 1],
  ])('rend le preset complet %s / %s', async (path, preset, selector, count) => {
    const route = DEV_ROUTES.find((candidate) => candidate.path === path);
    const showcase = await route?.data?.['loadShowcase']();
    const control = showcase?.controls?.['state'];
    expect(control?.kind).toBe('preset');
    if (control?.kind !== 'preset') return;
    const fixture = TestBed.createComponent(showcase.component);
    fixture.componentRef.setInput('state', control.options[preset]());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll(selector)).toHaveLength(count);
  });
});
