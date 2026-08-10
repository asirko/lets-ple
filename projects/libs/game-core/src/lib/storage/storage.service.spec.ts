import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function create(): StorageService {
    return TestBed.inject(StorageService);
  }

  it('retourne le fallback quand la clé est absente', () => {
    expect(create().read('inconnue', 'defaut')).toBe('defaut');
  });

  it('relit une valeur écrite', () => {
    const storage = create();
    storage.write('score', 42);
    expect(storage.read('score', 0)).toBe(42);
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
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota dépassée');
      });

    const storage = create();
    storage.write('score', 42);

    expect(storage.read('score', 0)).toBe(42);
    expect(localStorage.getItem('letsple:v1:score')).toBeNull();

    setItem.mockRestore();
  });
});
