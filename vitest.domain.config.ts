import { defineConfig } from 'vitest/config';

/**
 * Configuration dédiée au moteur pur et aux outils.
 *
 * Ces tests n'ont aucune dépendance Angular : ils tournent en environnement Node, sans
 * navigateur ni compilation du framework. Le runner Angular (`ng test`) met une quinzaine de
 * secondes à démarrer un environnement de test, l'essentiel passé à monter le DOM — un coût
 * intenable pour le cycle rouge-vert du moteur, qu'on relance des dizaines de fois par heure.
 *
 * Le fichier porte un nom explicite plutôt que `vitest.config.ts` pour ne pas être ramassé
 * par la configuration interne du builder Angular.
 */
export default defineConfig({
  test: {
    name: 'domain',
    include: ['projects/games/**/domain/**/*.spec.ts', 'projects/games/**/tools/**/*.spec.ts'],
    environment: 'node',
  },
});
