import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LpReleaseNotesDialog, LpUpdateDialog } from '@lets-ple/ui';
import { I18nService } from '@lets-ple/game-core';
import { PwaUpdateService } from './pwa-update.service';
import { ReleaseNotesService } from './release-notes.service';

@Component({
  selector: 'app-release-dialogs',
  imports: [LpReleaseNotesDialog, LpUpdateDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-release-notes-dialog
      [open]="active() === 'notes'"
      [releases]="notes.pending()"
      [labels]="notesLabels"
      (acknowledged)="acknowledge()"
    />
    <lp-update-dialog
      [open]="active() === 'update'"
      [recovery]="updates.recovery()"
      [labels]="updateLabels"
      (later)="defer()"
      (update)="updates.reload()"
    />
  `,
})
export class ReleaseDialogs {
  private readonly i18n = inject(I18nService);
  protected readonly notesLabels = {
    title: this.i18n.t('releases.notes.title'),
    version: this.i18n.t('releases.notes.version'),
    features: this.i18n.t('releases.notes.features'),
    fixes: this.i18n.t('releases.notes.fixes'),
    breaking: this.i18n.t('releases.notes.breaking'),
    acknowledge: this.i18n.t('releases.notes.acknowledge'),
  };
  protected readonly updateLabels = {
    title: this.i18n.t('releases.update.title'),
    recoveryTitle: this.i18n.t('releases.update.recoveryTitle'),
    message: this.i18n.t('releases.update.message'),
    hint: this.i18n.t('releases.update.hint'),
    recoveryMessage: this.i18n.t('releases.update.recoveryMessage'),
    later: this.i18n.t('releases.update.later'),
    update: this.i18n.t('releases.update.update'),
    reload: this.i18n.t('releases.update.reload'),
  };
  protected readonly notes = inject(ReleaseNotesService);
  protected readonly updates = inject(PwaUpdateService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly url = signal<string | null>(this.router.navigated ? this.router.url : null);
  private readonly dialogChanges = signal(0);
  protected readonly active = signal<'notes' | 'update' | null>(null);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
    });
    const observer = new MutationObserver(() => this.dialogChanges.update((n) => n + 1));
    observer.observe(this.document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    effect(() => {
      this.dialogChanges();
      const url = this.url();
      const path = url?.split(/[?#;]/)[0];
      const notes = this.notes.pending();
      const update = this.updates.promptPending();
      const active = this.active();
      const externalDialog = Array.from(this.document.querySelectorAll('dialog[open]')).some(
        (dialog) => !this.host.nativeElement.contains(dialog),
      );
      if (url === null || path?.startsWith('/dev/') || externalDialog) {
        this.active.set(null);
        return;
      }
      if (active) {
        if (
          (active === 'notes' && (path !== '/' || !notes.length)) ||
          (active === 'update' && !update)
        )
          this.active.set(null);
        return;
      }
      // Wait for the previous native dialog to close and restore focus before opening another.
      if (this.host.nativeElement.querySelector('dialog[open]')) return;
      if (path === '/' && notes.length) this.active.set('notes');
      else if (update) this.active.set('update');
    });
  }

  protected acknowledge(): void {
    this.notes.acknowledge();
    this.active.set(null);
  }
  protected defer(): void {
    this.updates.defer();
    this.active.set(null);
  }
}
