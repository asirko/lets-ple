import { TestBed } from '@angular/core/testing';
import { LpDialogShowcase } from './lp-dialog.showcase';

describe('LpDialogShowcase', () => {
  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
  });

  it('exerce réellement un corps long et garde l’action séparée', () => {
    const fixture = TestBed.createComponent(LpDialogShowcase);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('[data-dialog-showcase-long-content] p').length,
    ).toBeGreaterThanOrEqual(10);
    expect(fixture.nativeElement.querySelector('[lpDialogActions] .b-primary')).not.toBeNull();
  });
});
