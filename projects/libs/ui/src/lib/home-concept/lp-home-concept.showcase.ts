import type { ComponentShowcase } from '../showcase.types';
import { LpHomeConcept, type HomeGame } from './lp-home-concept';

const games: HomeGame[] = [
  {
    id: 'cryptogramme',
    title: 'Cryptogramme',
    summary: 'Reconstitue une citation lettre par lettre : chaque symbole cache une lettre.',
    route: '/cryptogramme',
    themes: ['mots', 'citations'],
  },
  {
    id: 'dernier-mot',
    title: 'Dernier Mot',
    summary: 'À plusieurs, ajoutez une lettre et remportez le dernier mot.',
    route: '/dernier-mot',
    themes: ['multi', 'compétitif'],
  },
  {
    id: 'quiz',
    title: 'Géoquizz',
    summary:
      '10 questions pour explorer les pays du monde. Cash, Carré ou Duo : à vous de choisir !',
    route: '/quiz',
    themes: ['géographie'],
  },
];

export const LP_HOME_CONCEPT_SHOWCASE: ComponentShowcase<LpHomeConcept> = {
  component: LpHomeConcept,
  controls: {
    query: { kind: 'text', default: '' },
    games: {
      kind: 'preset',
      default: 'Catalogue',
      options: {
        Catalogue: () => games,
        'Catalogue étendu (démonstration)': () => [
          ...games,
          ...Array.from({ length: 21 }, (_, i) => ({
            id: 'demo-' + i,
            title: 'Jeu de démonstration ' + (i + 1),
            summary:
              'Exemple utilisé uniquement dans le showcase pour vérifier la grille avec de nombreux jeux.',
            route: '#',
            themes: ['démonstration'],
          })),
        ],
        'Catalogue vide': () => [],
      },
    },
  },
};
