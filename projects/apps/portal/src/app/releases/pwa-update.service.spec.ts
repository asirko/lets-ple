import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService, RELOAD_APP } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let events: Subject<VersionEvent>, stable: Subject<boolean>, broken: Subject<{ reason: string }>;
  let check: ReturnType<typeof vi.fn>, reload: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    events = new Subject();
    stable = new Subject();
    broken = new Subject();
    check = vi.fn().mockResolvedValue(false);
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: events,
            unrecoverable: broken,
            checkForUpdate: check,
          },
        },
        { provide: ApplicationRef, useValue: { isStable: stable } },
        { provide: RELOAD_APP, useValue: reload },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());
  const ready = (hash: string) =>
    events.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash },
    });

  it('ne propose que les versions pretes, reporte un hash et propose un nouveau', () => {
    const service = TestBed.inject(PwaUpdateService);
    events.next({ type: 'VERSION_DETECTED', version: { hash: 'a' } });
    expect(service.available()).toBe(false);
    ready('a');
    expect(service.promptPending()).toBe(true);
    service.defer();
    ready('a');
    expect(service.promptPending()).toBe(false);
    expect(service.available()).toBe(true);
    service.requestPrompt();
    expect(service.promptPending()).toBe(true);
    service.defer();
    ready('b');
    expect(service.promptPending()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    service.reload();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reste inactif quand le service worker est desactive', () => {
    TestBed.overrideProvider(SwUpdate, { useValue: { isEnabled: false } });
    const service = TestBed.inject(PwaUpdateService);
    stable.next(true);
    expect(check).not.toHaveBeenCalled();
    expect(service.available()).toBe(false);
  });

  it('attend la stabilisation et ignore une panne reseau', async () => {
    check.mockRejectedValue(new Error('offline'));
    const service = TestBed.inject(PwaUpdateService);
    stable.next(false);
    expect(check).not.toHaveBeenCalled();
    stable.next(true);
    await Promise.resolve();
    expect(check).toHaveBeenCalledOnce();
    expect(service.promptPending()).toBe(false);
  });

  it('limite les checks au retour visible et exclut les appels concurrents', async () => {
    vi.useFakeTimers();
    let resolve!: (value: boolean) => void;
    check.mockReturnValue(new Promise<boolean>((done) => (resolve = done)));
    TestBed.inject(PwaUpdateService);
    stable.next(true);
    vi.setSystemTime(Date.now() + 61000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledOnce();
    resolve(false);
    await Promise.resolve();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('permet de differer une recuperation sans rechargement automatique', () => {
    const service = TestBed.inject(PwaUpdateService);
    broken.next({ reason: 'missing chunk' });
    expect(service.recovery()).toBe(true);
    expect(service.promptPending()).toBe(true);
    service.defer();
    expect(service.available()).toBe(true);
    expect(service.promptPending()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
