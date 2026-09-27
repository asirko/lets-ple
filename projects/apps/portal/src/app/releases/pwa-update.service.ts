import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  computed,
  DestroyRef,
  inject,
  Injectable,
  InjectionToken,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, fromEvent, take } from 'rxjs';

export const RELOAD_APP = new InjectionToken<() => void>('RELOAD_APP', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.location.reload();
  },
});

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly sw = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloadApp = inject(RELOAD_APP);
  private readonly hash = signal<string | null>(null);
  private readonly deferred = new Set<string>();
  private readonly needsRecovery = signal(false);
  private readonly pending = signal(false);
  readonly recovery = this.needsRecovery.asReadonly();
  readonly promptPending = this.pending.asReadonly();
  readonly available = computed(() => !!this.hash() || this.needsRecovery());
  private inFlight = false;
  private lastCheck = -Infinity;

  constructor() {
    if (!this.sw?.isEnabled) return;
    this.sw.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.hash.set(event.latestVersion.hash);
        this.pending.set(!this.deferred.has(event.latestVersion.hash));
      }
    });
    this.sw.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => {
      this.needsRecovery.set(true);
      this.pending.set(true);
    });
    inject(ApplicationRef)
      .isStable.pipe(filter(Boolean), take(1), takeUntilDestroyed())
      .subscribe(() => {
        void this.check();
        fromEvent(this.document, 'visibilitychange')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            if (this.document.visibilityState === 'visible') void this.check();
          });
      });
  }

  defer(): void {
    const hash = this.hash();
    if (hash) this.deferred.add(hash);
    this.pending.set(false);
  }
  requestPrompt(): void {
    if (this.available()) this.pending.set(true);
  }
  reload(): void {
    if (this.available()) this.reloadApp();
  }

  private async check(): Promise<void> {
    if (this.inFlight || Date.now() - this.lastCheck < 60000) return;
    this.inFlight = true;
    this.lastCheck = Date.now();
    try {
      await this.sw!.checkForUpdate();
    } catch {
      /* Offline checks must not interrupt a game or claim an update is ready. */
    } finally {
      this.inFlight = false;
    }
  }
}
