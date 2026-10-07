import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LpCountryDetail } from './country-detail';
import { STATISTICS_PREVIEW } from '../statistics-preview';

describe('country statistics dialog', () => {
  beforeEach(() => {
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
  function create() {
    const fixture = TestBed.createComponent(LpCountryDetail);
    fixture.componentRef.setInput('country', STATISTICS_PREVIEW.rows[0]);
    fixture.componentRef.setInput('types', STATISTICS_PREVIEW.types);
    fixture.componentRef.setInput('modes', []);
    fixture.componentRef.setInput('labels', {
      answers: 'Réponses',
      score: 'Score',
      success: 'Réussite',
      closeDetail: 'Fermer',
      types: 'Questions',
      modes: 'Modes',
    });
    fixture.detectChanges();
    return fixture;
  }
  it('opens the selected country metrics in a named modal', () => {
    const fixture = create();
    const dialog = fixture.nativeElement.querySelector('dialog[open]');
    expect(dialog).not.toBeNull();
    const title = dialog.querySelector('#' + dialog.getAttribute('aria-labelledby'));
    expect(title.textContent).toBe('France');
    expect(dialog.querySelector('.quiz-stats-summary dd').textContent).toBe('14');
  });
  it('emits closure on Escape and the close action', () => {
    const fixture = create();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    const dialog = fixture.nativeElement.querySelector('dialog[open]');
    expect(dialog).not.toBeNull();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closed).toBe(1);
    dialog.querySelector('.dialog-actions button').click();
    expect(closed).toBe(2);
  });
});
