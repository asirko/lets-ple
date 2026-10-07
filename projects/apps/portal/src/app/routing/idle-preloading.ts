import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  type PreloadingStrategy,
  type Route,
} from '@angular/router';
import { Observable, of, type Subscriber, type Subscription } from 'rxjs';
interface Job {
  load: () => Observable<unknown>;
  subscriber: Subscriber<unknown>;
  active: boolean;
}
@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  private router = inject(Router);
  private zone = inject(NgZone);
  private queue: Job[] = [];
  private active = new Set<Subscription>();
  private navigating = false;
  private lastInteraction = 0;
  private timer: number | null = null;
  private idle: number | null = null;
  private destroyed = false;
  constructor() {
    const nav = this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.navigating = true;
      if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.navigating = false;
        this.schedule();
      }
    });
    const interaction = () => {
      this.lastInteraction = Date.now();
    };
    document.addEventListener('pointerdown', interaction, { passive: true });
    document.addEventListener('keydown', interaction, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      nav.unsubscribe();
      document.removeEventListener('pointerdown', interaction);
      document.removeEventListener('keydown', interaction);
      if (this.timer !== null) window.clearTimeout(this.timer);
      if (this.idle !== null) window.cancelIdleCallback?.(this.idle);
      for (const subscription of this.active) subscription.unsubscribe();
      this.active.clear();
      for (const job of this.queue) job.subscriber.complete();
      this.queue = [];
    });
  }
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const network = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (
      !route.data?.['preload'] ||
      route.path?.startsWith('dev') ||
      network?.saveData ||
      ['2g', 'slow-2g'].includes(network?.effectiveType ?? '')
    )
      return of(null);
    return new Observable((subscriber) => {
      const job: Job = { load, subscriber, active: true };
      this.queue.push(job);
      this.schedule();
      return () => {
        job.active = false;
        this.queue = this.queue.filter((j) => j !== job);
      };
    });
  }
  private schedule(): void {
    if (this.destroyed || this.timer !== null || this.idle !== null || !this.queue.length) return;
    this.zone.runOutsideAngular(() => {
      const run = () => {
        this.idle = null;
        this.timer = null;
        this.runNext();
      };
      if (typeof window.requestIdleCallback === 'function')
        this.idle = window.requestIdleCallback(run, { timeout: 1000 });
      else this.timer = window.setTimeout(run, 150);
    });
  }
  private runNext(): void {
    if (this.destroyed) return;
    if (
      this.navigating ||
      !this.router.navigated ||
      document.hidden ||
      Date.now() - this.lastInteraction < 500
    ) {
      this.zone.runOutsideAngular(() => {
        this.timer = window.setTimeout(() => {
          this.timer = null;
          this.runNext();
        }, 250);
      });
      return;
    }
    const job = this.queue.shift();
    if (!job) {
      return;
    }
    if (!job.active) {
      this.schedule();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      job.subscriber.complete();
      this.schedule();
    };
    try {
      const subscription = job.load().subscribe({
        next: (value) => {
          if (job.active) job.subscriber.next(value);
        },
        error: finish,
        complete: finish,
      });
      if (!subscription.closed) {
        this.active.add(subscription);
        subscription.add(() => this.active.delete(subscription));
      }
      this.schedule();
    } catch {
      finish();
    }
  }
}
