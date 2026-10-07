import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { IdlePreloadingStrategy } from './idle-preloading';
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('passive page preload', () => {
  it('excludes dev and serializes marked product pages', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        IdlePreloadingStrategy,
        { provide: Router, useValue: { navigated: true, events: new Subject() } },
      ],
    });
    const p = TestBed.inject(IdlePreloadingStrategy),
      loader = vi.fn(() => of(true));
    p.preload({ path: 'dev/components', data: { preload: false } }, loader).subscribe();
    expect(loader).not.toHaveBeenCalled();
    p.preload({ path: 'quiz', data: { preload: true } }, loader).subscribe();
    p.preload({ path: 'quiz/statistiques', data: { preload: true } }, loader).subscribe();
    await vi.advanceTimersByTimeAsync(1200);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

it('loads descendants while parent completion waits for them', async () => {
  vi.useFakeTimers();
  TestBed.configureTestingModule({
    providers: [
      IdlePreloadingStrategy,
      { provide: Router, useValue: { navigated: true, events: new Subject() } },
    ],
  });
  const p = TestBed.inject(IdlePreloadingStrategy),
    child = vi.fn(() => of(true)),
    completed = vi.fn();
  p.preload({ path: 'quiz', data: { preload: true } }, () =>
    p.preload({ path: '', data: { preload: true } }, child),
  ).subscribe({ complete: completed });
  await vi.advanceTimersByTimeAsync(2400);
  expect(child).toHaveBeenCalledOnce();
  expect(completed).toHaveBeenCalledOnce();
});
