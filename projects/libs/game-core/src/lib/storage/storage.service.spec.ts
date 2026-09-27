import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    localStorage.clear();
  });

  function create(): StorageService {
    return TestBed.inject(StorageService);
  }

  it('retourne le fallback quand la clé est absente', () => {
    expect(create().read('inconnue', 'defaut')).toBe('defaut');
  });

  it('garde la derniere valeur en memoire si le stockage devient inaccessible', () => {
    const storage = create();
    storage.write('score', 42);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloque');
    });
    expect(storage.read('score', 0)).toBe(42);
    spy.mockRestore();
  });

  it('conserve les nouvelles valeurs et les suppressions apres un quota depasse', () => {
    const storage = create();
    storage.write('score', 1);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    expect(() => storage.write('score', 42)).not.toThrow();
    expect(storage.read('score', 0)).toBe(42);
    storage.remove('score');
    expect(storage.read('score', null)).toBeNull();
    spy.mockRestore();
  });

  it('relit une valeur écrite', () => {
    const storage = create();
    storage.write('score', 42);
    expect(storage.read('score', 0)).toBe(42);
  });

  it('supprime une valeur écrite', () => {
    const storage = create();
    storage.write('score', 42);

    storage.remove('score');

    expect(storage.read('score', null)).toBeNull();
  });

  it('préfixe les clés dans le backend réel', () => {
    create().write('score', 42);
    expect(localStorage.getItem('letsple:v1:score')).toBe('42');
  });

  it('stocke la version de schéma à la création', () => {
    create();
    expect(localStorage.getItem('letsple:v1:schemaVersion')).toBe('1');
  });

  it('retombe sur une carte en mémoire quand localStorage est indisponible', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota dépassée');
    });

    const storage = create();
    storage.write('score', 42);

    expect(storage.read('score', 0)).toBe(42);
    expect(localStorage.getItem('letsple:v1:score')).toBeNull();

    setItem.mockRestore();
  });
});
