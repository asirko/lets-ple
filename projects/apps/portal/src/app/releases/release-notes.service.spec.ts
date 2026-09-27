import { TestBed } from '@angular/core/testing';
import { StorageService, STORAGE_KEYS } from '@lets-ple/game-core';
import { RELEASE_DATA } from './release-data';
import { ReleaseNotesService } from './release-notes.service';

const releases = ['0.3.0', '0.2.0', '0.1.0'].map((version) => ({
  version,
  date: '2026-09-27',
  features: ['Nouveau jeu'],
  fixes: [],
  breaking: [],
}));
describe('ReleaseNotesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: RELEASE_DATA, useValue: { version: '0.3.0', releases } }],
    });
  });
  const storage = () => TestBed.inject(StorageService);
  const service = () => TestBed.inject(ReleaseNotesService);
  it('ne montre que la version courante a la premiere visite', () => {
    expect(
      service()
        .pending()
        .map((r) => r.version),
    ).toEqual(['0.3.0']);
    expect(storage().read(STORAGE_KEYS.releaseNotesRead, null)).toBeNull();
  });
  it('montre toutes les versions manquees puis acquitte', () => {
    storage().write(STORAGE_KEYS.releaseNotesRead, '0.1.0');
    const notes = service();
    expect(notes.pending().map((r) => r.version)).toEqual(['0.3.0', '0.2.0']);
    notes.acknowledge();
    expect(notes.pending()).toEqual([]);
    expect(storage().read(STORAGE_KEYS.releaseNotesRead, null)).toBe('0.3.0');
  });
  it('ne rediminue pas le marqueur apres rollback ou lecture dans un autre onglet', () => {
    storage().write(STORAGE_KEYS.releaseNotesRead, '0.4.0');
    const notes = service();
    expect(notes.pending()).toEqual([]);
    storage().write(STORAGE_KEYS.releaseNotesRead, '0.5.0');
    notes.acknowledge();
    expect(storage().read(STORAGE_KEYS.releaseNotesRead, null)).toBe('0.5.0');
  });
  it.each([{}, 12, 'corrompu', '0.01.0'])('ignore un marqueur invalide %j', (value) => {
    storage().write(STORAGE_KEYS.releaseNotesRead, value);
    expect(
      service()
        .pending()
        .map((r) => r.version),
    ).toEqual(['0.3.0']);
  });
  it('ne montre aucune modale si les notes sont absentes', () => {
    TestBed.overrideProvider(RELEASE_DATA, { useValue: { version: '0.3.0', releases: [] } });
    expect(service().pending()).toEqual([]);
  });
  it('exclut les versions futures', () => {
    TestBed.overrideProvider(RELEASE_DATA, { useValue: { version: '0.2.0', releases } });
    storage().write(STORAGE_KEYS.releaseNotesRead, '0.1.0');
    expect(
      service()
        .pending()
        .map((r) => r.version),
    ).toEqual(['0.2.0']);
  });
});
