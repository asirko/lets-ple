import { TestBed } from '@angular/core/testing';
import { LpUpdateDialog } from './lp-update-dialog';
import { UPDATE_DIALOG_EXAMPLE_LABELS } from './lp-update-dialog.showcase';

describe('LpUpdateDialog', () => {
  it('propose un choix explicite et echap reporte la mise a jour', () => {
    const fixture = TestBed.createComponent(LpUpdateDialog);
    fixture.componentRef.setInput('labels', UPDATE_DIALOG_EXAMPLE_LABELS);
    fixture.detectChanges();
    let updates = 0,
      deferrals = 0;
    fixture.componentInstance.update.subscribe(() => updates++);
    fixture.componentInstance.later.subscribe(() => deferrals++);
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].textContent).toContain('Plus tard');
    buttons[0].click();
    expect(deferrals).toBe(1);
    expect(updates).toBe(0);
    buttons[1].click();
    expect(updates).toBe(1);
    fixture.nativeElement
      .querySelector('dialog')
      .dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(deferrals).toBe(2);
  });
  it('explique la recuperation sans promettre une mise a jour', () => {
    const fixture = TestBed.createComponent(LpUpdateDialog);
    fixture.componentRef.setInput('labels', UPDATE_DIALOG_EXAMPLE_LABELS);
    fixture.componentRef.setInput('recovery', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recharger');
    expect(fixture.nativeElement.textContent).not.toContain('Une nouvelle version est prête');
  });
});
