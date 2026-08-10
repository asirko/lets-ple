import { TestBed } from '@angular/core/testing';
import { I18nService, I18N_DICTIONARY } from './i18n.service';

function createService(dictionary: Record<string, string>): I18nService {
  TestBed.configureTestingModule({
    providers: [{ provide: I18N_DICTIONARY, useValue: dictionary }],
  });
  return TestBed.inject(I18nService);
}

describe('I18nService', () => {
  it('retourne la clé telle quelle quand elle est absente du dictionnaire', () => {
    expect(createService({}).t('inconnue')).toBe('inconnue');
  });

  it('résout une clé présente dans le dictionnaire', () => {
    expect(createService({ salut: 'Bonjour !' }).t('salut')).toBe('Bonjour !');
  });

  it('interpole un paramètre nommé', () => {
    const service = createService({ bienvenue: 'Bonjour {nom} !' });
    expect(service.t('bienvenue', { nom: 'Alex' })).toBe('Bonjour Alex !');
  });

  it('interpole un nombre', () => {
    const service = createService({ score: 'Score : {n}' });
    expect(service.t('score', { n: 42 })).toBe('Score : 42');
  });

  it('laisse un paramètre non fourni tel quel', () => {
    const service = createService({ bienvenue: 'Bonjour {nom} !' });
    expect(service.t('bienvenue')).toBe('Bonjour {nom} !');
  });

  it('charge le vrai dictionnaire fr.json par défaut, sans provider de test', () => {
    const service = TestBed.inject(I18nService);
    expect(service.t('cle-inexistante')).toBe('cle-inexistante');
  });
});
