import { TestBed } from '@angular/core/testing';
import { LpReleaseNotesDialog } from './lp-release-notes-dialog';
import { RELEASE_NOTES_EXAMPLE_LABELS } from './lp-release-notes-dialog.showcase';

describe('LpReleaseNotesDialog', () => {
  it('affiche les versions sans interpreter le texte en HTML, et acquitte sur fermeture', () => {
    const fixture = TestBed.createComponent(LpReleaseNotesDialog);
    fixture.componentRef.setInput('labels', RELEASE_NOTES_EXAMPLE_LABELS);
    fixture.componentRef.setInput('releases', [
      {
        version: '0.3.0',
        date: '2026-09-27',
        features: ['<script>test</script>'],
        fixes: [],
        breaking: [],
      },
      {
        version: '0.2.0',
        date: '2026-09-01',
        features: [],
        fixes: ['Contraste amélioré'],
        breaking: [],
      },
    ]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('<script>test</script>');
    expect(root.querySelector('script')).toBeNull();
    expect(Array.from(root.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual([
      'Version 0.3.0',
      'Version 0.2.0',
    ]);
    expect(root.textContent).not.toContain('Changements incompatibles');
    let read = false;
    fixture.componentInstance.acknowledged.subscribe(() => (read = true));
    root.querySelector('button')!.click();
    expect(read).toBe(true);
  });
});
