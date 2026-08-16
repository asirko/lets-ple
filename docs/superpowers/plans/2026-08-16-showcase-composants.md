# Showcase de composants — remplacement de Storybook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer Storybook (bloqué par un bug amont non résolu sur les signal inputs requis)
par un showcase maison dans le portail (`/dev/components`), et republier Compodoc en site
autonome, sans perdre la couverture réelle des 10 fichiers `.stories.ts` actuels.

**Architecture:** Un composant `ShowcaseRenderer` générique monte dynamiquement n'importe quel
composant Angular via `ViewContainerRef.createComponent()` + `componentRef.setInput()` **avant**
le premier `detectChanges()` — l'ordre exact qui manque dans le renderer de
`@storybook/angular-vite` et qui a motivé cette migration. Chaque composant fournit, à côté de son
fichier, une petite spec de contrôles (`ComponentShowcase<T>`) qui remplace son `.stories.ts`.
Une route `/dev/components` dans le portail expose un guide de style (tokens + modules SMACSS
partagés) et une page par composant.

**Tech Stack:** Angular 22 (standalone, signals, zoneless), Vitest (`ng test` via
`@angular/build:unit-test`), SCSS (SMACSS), Compodoc (mode autonome).

**Spec:** `docs/superpowers/specs/2026-08-16-showcase-composants-design.md`

## Global Constraints

- Zéro nouveau `styleUrl` local portant de la couleur/typo/bordure/ombre : tout passe par les
  classes globales SMACSS existantes (`docs/conventions/css.md`).
- La route `/dev/components` reste dans le bundle de production (décision explicite de
  l'utilisateur) — ne pas l'exclure via un garde d'environnement.
- Storybook et le showcase coexistent jusqu'à la Tâche 16 : ne pas supprimer un `.stories.ts`
  avant que l'équivalent showcase du même composant soit vérifié.
- Chaque `.showcase.ts` est exporté depuis le `public-api.ts` de sa lib (`@lets-ple/ui` ou
  `@lets-ple/cryptogramme`), jamais importé par un chemin relatif traversant les frontières de
  projet.

---

## File Structure

```
projects/apps/portal/src/app/dev/
├─ showcase.types.ts                    ComponentShowcase<T>, ControlSpec, resolveProps()
├─ contrast-ratio.ts (+ .spec.ts)        utilitaire WCAG pur, sans dépendance Angular
├─ showcase-renderer/
│  ├─ showcase-renderer.ts (+ .spec.ts)  monte dynamiquement le composant cible + formulaire de contrôles
├─ component-page/
│  └─ component-page.ts                  route générique : résout la spec depuis les route data, l'affiche
├─ dev-home/
│  └─ dev-home-page.ts                   liste de liens vers /style et chaque composant migré
├─ style-guide/
│  └─ style-guide-page.ts                tokens + modules SMACSS partagés, ratios de contraste calculés
└─ dev.routes.ts                         routes enfants de /dev/components

projects/apps/portal/src/styles/
└─ _dev-showcase.scss                    classes du showcase (formulaire de contrôles, mise en page du guide de style)

projects/libs/ui/src/lib/<composant>/<composant>.showcase.ts        (button, card, panel)
projects/games/cryptogramme/src/lib/ui/<composant>/<composant>.showcase.ts
  (cryptogram-cell, cipher-table, cryptogram-deck, cryptogram-hand, error-counter, cryptogram-grid, game-page)
```

---

### Task 1: Types de contrôle et utilitaire de contraste

**Files:**
- Create: `projects/apps/portal/src/app/dev/showcase.types.ts`
- Create: `projects/apps/portal/src/app/dev/contrast-ratio.ts`
- Test: `projects/apps/portal/src/app/dev/contrast-ratio.spec.ts`

**Interfaces:**
- Produces: `ControlSpec` (union `enum | boolean | text | number | preset`), `ComponentShowcase<T>`
  (`{ component: Type<T>; controls: Readonly<Record<string, ControlSpec>>; content?: string }`),
  `resolveProps(controls, formValues): Record<string, unknown>`, `contrastRatio(colorA, colorB):
  number`, `parseRgb(color: string): readonly [number, number, number]` — tous consommés par les
  tâches suivantes.

- [ ] **Step 1: Écrire le test qui échoue pour `contrastRatio`**

```ts
// projects/apps/portal/src/app/dev/contrast-ratio.spec.ts
import { contrastRatio } from './contrast-ratio';

describe('contrastRatio', () => {
  it('renvoie 21 pour blanc contre noir', () => {
    expect(contrastRatio('rgb(255, 255, 255)', 'rgb(0, 0, 0)')).toBeCloseTo(21, 1);
  });

  it('renvoie 1 pour deux couleurs identiques', () => {
    expect(contrastRatio('rgb(120, 80, 40)', 'rgb(120, 80, 40)')).toBeCloseTo(1, 5);
  });

  it('est symétrique', () => {
    const a = contrastRatio('rgb(250, 247, 242)', 'rgb(107, 97, 82)');
    const b = contrastRatio('rgb(107, 97, 82)', 'rgb(250, 247, 242)');
    expect(a).toBeCloseTo(b, 10);
  });

  it('retrouve le ratio texte-atténué / fond mesuré sur les tokens actuels (~5.68:1)', () => {
    expect(contrastRatio('rgb(107, 97, 82)', 'rgb(250, 247, 242)')).toBeCloseTo(5.68, 1);
  });

  it('accepte une couleur avec canal alpha', () => {
    expect(contrastRatio('rgba(255, 255, 255, 1)', 'rgb(0, 0, 0)')).toBeCloseTo(21, 1);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `ng test portal`
Expected: FAIL — `Cannot find module './contrast-ratio'`

- [ ] **Step 3: Implémenter `contrast-ratio.ts`**

```ts
// projects/apps/portal/src/app/dev/contrast-ratio.ts
/**
 * Ratio de contraste WCAG entre deux couleurs CSS calculées (format `getComputedStyle`).
 * Formule officielle : https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Parse une couleur au format `rgb(r, g, b)` ou `rgba(r, g, b, a)` — le format que renvoie
 * `getComputedStyle` dans tous les navigateurs. */
export function parseRgb(color: string): readonly [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Couleur non reconnue : ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Ratio de contraste WCAG entre deux couleurs, de 1 (identiques) à 21 (noir/blanc). */
export function contrastRatio(colorA: string, colorB: string): number {
  const lumA = relativeLuminance(parseRgb(colorA));
  const lumB = relativeLuminance(parseRgb(colorB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `ng test portal`
Expected: PASS (5/5 tests de `contrastRatio`)

- [ ] **Step 5: Créer `showcase.types.ts` (pas de test dédié — types + une fonction pure triviale
      couverte indirectement par la Tâche 2)**

```ts
// projects/apps/portal/src/app/dev/showcase.types.ts
import type { Type } from '@angular/core';

export type ControlSpec =
  | { readonly kind: 'enum'; readonly options: readonly string[]; readonly default: string }
  | { readonly kind: 'boolean'; readonly default: boolean }
  | { readonly kind: 'text'; readonly default: string }
  | { readonly kind: 'number'; readonly default: number }
  | {
      readonly kind: 'preset';
      /** Fabriques plutôt que valeurs statiques : certaines fixtures (ex. le plateau du
       * cryptogramme) sont le résultat d'un appel au moteur de jeu, pas un littéral. */
      readonly options: Readonly<Record<string, () => unknown>>;
      readonly default: string;
    };

export interface ComponentShowcase<T> {
  readonly component: Type<T>;
  readonly controls: Readonly<Record<string, ControlSpec>>;
  /** Fragment HTML projeté dans le `<ng-content>` du composant, s'il en a un. */
  readonly content?: string;
}

export type FormValue = string | boolean | number;

/** Calcule les valeurs de props à appliquer au composant monté à partir de l'état du formulaire
 * de contrôles — résout les presets vers leur valeur réelle via leur fabrique. */
export function resolveProps(
  controls: Readonly<Record<string, ControlSpec>>,
  formValues: Readonly<Record<string, FormValue>>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, control] of Object.entries(controls)) {
    props[name] = control.kind === 'preset' ? control.options[formValues[name] as string]() : formValues[name];
  }
  return props;
}

/** Valeurs par défaut du formulaire de contrôles, dérivées de chaque `ControlSpec.default`. */
export function defaultFormValues(controls: Readonly<Record<string, ControlSpec>>): Record<string, FormValue> {
  const values: Record<string, FormValue> = {};
  for (const [name, control] of Object.entries(controls)) {
    values[name] = control.default as FormValue;
  }
  return values;
}
```

- [ ] **Step 6: Commit**

```bash
git add projects/apps/portal/src/app/dev/showcase.types.ts projects/apps/portal/src/app/dev/contrast-ratio.ts projects/apps/portal/src/app/dev/contrast-ratio.spec.ts
git commit -m "feat(portal): types de contrôle et utilitaire de contraste pour le showcase"
```

---

### Task 2: `ShowcaseRenderer` — montage dynamique sans NG0950

**Files:**
- Create: `projects/apps/portal/src/app/dev/showcase-renderer/showcase-renderer.ts`
- Test: `projects/apps/portal/src/app/dev/showcase-renderer/showcase-renderer.spec.ts`

**Interfaces:**
- Consumes: `ComponentShowcase<T>`, `ControlSpec`, `resolveProps`, `defaultFormValues`,
  `FormValue` (Task 1).
- Produces: `ShowcaseRenderer<T>` (composant standalone, sélecteur `app-showcase-renderer`, input
  requis `showcase: ComponentShowcase<T>`) — consommé par `ComponentPage` (Task 3).

- [ ] **Step 1: Écrire le test qui échoue — le garde-fou anti-NG0950**

```ts
// projects/apps/portal/src/app/dev/showcase-renderer/showcase-renderer.spec.ts
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShowcaseRenderer } from './showcase-renderer';
import type { ComponentShowcase } from '../showcase.types';

@Component({
  selector: 'app-required-input-fixture',
  template: `<span class="fixture-label">{{ label() }}</span>`,
})
class RequiredInputFixture {
  readonly label = input.required<string>();
}

describe('ShowcaseRenderer', () => {
  it('monte un composant à input requis sans lever NG0950', () => {
    const showcase: ComponentShowcase<RequiredInputFixture> = {
      component: RequiredInputFixture,
      controls: {
        label: { kind: 'text', default: 'bonjour' },
      },
    };

    const fixture = TestBed.createComponent(ShowcaseRenderer<RequiredInputFixture>);
    fixture.componentRef.setInput('showcase', showcase);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.fixture-label').textContent).toContain('bonjour');
  });

  it('remonte le composant avec la nouvelle valeur quand un contrôle change', () => {
    const showcase: ComponentShowcase<RequiredInputFixture> = {
      component: RequiredInputFixture,
      controls: {
        label: { kind: 'text', default: 'bonjour' },
      },
    };

    const fixture = TestBed.createComponent(ShowcaseRenderer<RequiredInputFixture>);
    fixture.componentRef.setInput('showcase', showcase);
    fixture.detectChanges();

    fixture.componentInstance.setValue('label', 'au revoir');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fixture-label').textContent).toContain('au revoir');
  });

  it('projette le contenu HTML fourni par la spec', () => {
    const showcase: ComponentShowcase<RequiredInputFixture> = {
      component: RequiredInputFixture,
      controls: { label: { kind: 'text', default: 'x' } },
      content: 'Contenu projeté',
    };

    const fixture = TestBed.createComponent(ShowcaseRenderer<RequiredInputFixture>);
    fixture.componentRef.setInput('showcase', showcase);
    fixture.detectChanges();

    // RequiredInputFixture n'a pas de <ng-content>, donc le contenu projeté n'apparaît nulle
    // part dans le rendu — ce test vérifie seulement que createComponent() ne lève pas quand
    // des projectableNodes sont fournis à un composant qui ne les consomme pas.
    expect(fixture.nativeElement.querySelector('.fixture-label').textContent).toContain('x');
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `ng test portal`
Expected: FAIL — `Cannot find module './showcase-renderer'`

- [ ] **Step 3: Implémenter `ShowcaseRenderer`**

```ts
// projects/apps/portal/src/app/dev/showcase-renderer/showcase-renderer.ts
import { ChangeDetectionStrategy, Component, ViewContainerRef, effect, input, signal, viewChild } from '@angular/core';
import type { ComponentShowcase, ControlSpec, FormValue } from '../showcase.types';
import { defaultFormValues, resolveProps } from '../showcase.types';

function projectableNodesFromHtml(html: string): Node[][] {
  const template = document.createElement('template');
  template.innerHTML = html;
  return [Array.from(template.content.childNodes)];
}

@Component({
  selector: 'app-showcase-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="dev-showcase-controls">
      @for (entry of controlEntries(); track entry.name) {
        <label class="dev-showcase-control">
          <span class="dev-showcase-control-label">{{ entry.name }}</span>
          @switch (entry.control.kind) {
            @case ('boolean') {
              <input
                type="checkbox"
                [checked]="formValue(entry.name) === true"
                (change)="setValue(entry.name, $any($event.target).checked)"
              />
            }
            @case ('text') {
              <input
                type="text"
                [value]="formValue(entry.name)"
                (input)="setValue(entry.name, $any($event.target).value)"
              />
            }
            @case ('number') {
              <input
                type="number"
                [value]="formValue(entry.name)"
                (input)="setValue(entry.name, $any($event.target).valueAsNumber)"
              />
            }
            @default {
              <select (change)="setValue(entry.name, $any($event.target).value)">
                @for (option of controlOptions(entry.control); track option) {
                  <option [value]="option" [selected]="option === formValue(entry.name)">{{ option }}</option>
                }
              </select>
            }
          }
        </label>
      }
    </form>
    <div class="dev-showcase-stage" #stage></div>
  `,
})
export class ShowcaseRenderer<T> {
  readonly showcase = input.required<ComponentShowcase<T>>();

  private readonly stageRef = viewChild.required('stage', { read: ViewContainerRef });
  private readonly formValues = signal<Record<string, FormValue>>({});

  protected readonly controlEntries;

  constructor() {
    this.controlEntries = () =>
      Object.entries(this.showcase().controls).map(([name, control]) => ({ name, control }));

    // Réinitialise le formulaire à ses valeurs par défaut à chaque nouvelle spec (changement de
    // composant affiché). Angular 22 autorise nativement l'écriture de signals dans un effect
    // (l'option `allowSignalWrites` des versions antérieures a été retirée de l'API).
    effect(() => {
      this.formValues.set(defaultFormValues(this.showcase().controls));
    });

    // Remonte le composant cible à chaque changement de spec ou de valeur de contrôle.
    // setInput() pour CHAQUE prop est appelé avant detectChanges() — c'est cette relation
    // d'ordre, absente du renderer de @storybook/angular-vite, qui évite NG0950 sur les
    // composants à signal input requis (`input.required()`).
    effect(() => {
      const showcase = this.showcase();
      const values = this.formValues();
      const stage = this.stageRef();
      stage.clear();

      const props = resolveProps(showcase.controls, values);
      const componentRef = stage.createComponent(showcase.component, {
        projectableNodes: showcase.content ? projectableNodesFromHtml(showcase.content) : undefined,
      });
      for (const [name, value] of Object.entries(props)) {
        componentRef.setInput(name, value);
      }
      componentRef.changeDetectorRef.detectChanges();
    });
  }

  protected controlOptions(control: ControlSpec): readonly string[] {
    if (control.kind === 'enum') return control.options;
    if (control.kind === 'preset') return Object.keys(control.options);
    return [];
  }

  protected formValue(name: string): FormValue {
    return this.formValues()[name];
  }

  setValue(name: string, value: FormValue): void {
    this.formValues.update((values) => ({ ...values, [name]: value }));
  }
}
```

**Note d'implémentation** : `controlEntries` est assigné dans le constructeur plutôt qu'en
initialiseur de champ car il ferme sur `this.showcase` — un initialiseur de champ standard
fonctionnerait aussi ici (les champs de classe s'initialisent après que `showcase` existe comme
signal, avant tout accès), mais l'assignation en constructeur documente explicitement l'intention
et reste cohérente avec le style du fichier.

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `ng test portal`
Expected: PASS (3/3 tests de `ShowcaseRenderer`, 5/5 de `contrastRatio`)

- [ ] **Step 5: Commit**

```bash
git add projects/apps/portal/src/app/dev/showcase-renderer/
git commit -m "feat(portal): ShowcaseRenderer, montage dynamique sans NG0950"
```

---

### Task 3: Routage `/dev/components` — socle

**Files:**
- Create: `projects/apps/portal/src/app/dev/component-page/component-page.ts`
- Create: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Create: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ShowcaseRenderer` (Task 2), `ComponentShowcase` (Task 1).
- Produces: route `data.loadShowcase: () => Promise<ComponentShowcase<unknown>>` — le contrat que
  chaque tâche de migration (4-14) doit respecter en ajoutant son entrée à `dev.routes.ts`.

- [ ] **Step 1: Créer `ComponentPage`**

```ts
// projects/apps/portal/src/app/dev/component-page/component-page.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ShowcaseRenderer } from '../showcase-renderer/showcase-renderer';
import type { ComponentShowcase } from '../showcase.types';

@Component({
  selector: 'app-component-page',
  imports: [ShowcaseRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showcase(); as showcase) {
      <app-showcase-renderer [showcase]="showcase" />
    }
  `,
})
export class ComponentPage {
  protected readonly showcase = signal<ComponentShowcase<unknown> | null>(null);

  constructor(route: ActivatedRoute) {
    const loadShowcase = route.snapshot.data['loadShowcase'] as () => Promise<ComponentShowcase<unknown>>;
    loadShowcase().then((showcase) => this.showcase.set(showcase));
  }
}
```

- [ ] **Step 2: Créer `DevHomePage`**

```ts
// projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dev-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Showcase de composants</h1>
    <ul class="dev-home-list">
      <li><a routerLink="style">Guide de style</a></li>
    </ul>
  `,
})
export class DevHomePage {}
```

- [ ] **Step 3: Créer `dev.routes.ts`**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts
import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
];
```

- [ ] **Step 4: Brancher la route dans `app.routes.ts`**

```ts
// projects/apps/portal/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home-page').then((m) => m.HomePage) },
  {
    path: 'cryptogramme',
    loadChildren: () => import('@lets-ple/cryptogramme').then((m) => m.CRYPTOGRAMME_ROUTES),
  },
  {
    path: 'dev/components',
    loadChildren: () => import('./dev/dev.routes').then((m) => m.DEV_ROUTES),
  },
];
```

- [ ] **Step 5: Vérifier que le portail démarre et sert la route**

Run: `npm start`
Ouvrir `http://localhost:4200/dev/components` dans un navigateur.
Expected: la page affiche « Showcase de composants » avec un lien « Guide de style » (qui mène à
une route pas encore créée — normal à ce stade, sera fait Tâche 4). Arrêter le serveur
(Ctrl+C) une fois vérifié.

- [ ] **Step 6: Commit**

```bash
git add projects/apps/portal/src/app/dev/component-page/ projects/apps/portal/src/app/dev/dev-home/ projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/app.routes.ts
git commit -m "feat(portal): route /dev/components, page d'accueil du showcase"
```

---

### Task 4: Guide de style — tokens et modules SMACSS partagés

**Files:**
- Create: `projects/apps/portal/src/app/dev/style-guide/style-guide-page.ts`
- Create: `projects/apps/portal/src/styles/_dev-showcase.scss`
- Modify: `projects/apps/portal/src/styles.scss`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `parseRgb` (Task 1).
- Produces: rien de consommé par une tâche suivante — page terminale.

**Portée** : uniquement les tokens et modules **globaux**, déjà chargés par le portail
(`libs/ui/src/styles/`). Les classes propres à un jeu (`.crypto-*`) ne sont volontairement pas ici
— `_cryptogramme.scss` n'est chargé que dans le chunk lazy du jeu (voir
`docs/conventions/css.md#Chargement`), et les y importer romprait cette frontière. Leur revue se
fait plutôt via la page showcase de chaque composant du jeu (Tâches 8-14), où elles sont
naturellement chargées et visibles.

- [ ] **Step 1: Créer le module SCSS du showcase**

```scss
// projects/apps/portal/src/styles/_dev-showcase.scss
.dev-showcase-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lp-space-4);
  padding: var(--lp-space-4);
  margin-bottom: var(--lp-space-4);
  background: var(--lp-color-surface-raised);
  border: 1px solid var(--lp-color-border);
  border-radius: var(--lp-radius-md);
}

.dev-showcase-control {
  display: flex;
  flex-direction: column;
  gap: var(--lp-space-1);
  font-size: var(--lp-font-size-sm);
}

.dev-showcase-control-label {
  color: var(--lp-color-text-muted);
}

.dev-showcase-stage {
  padding: var(--lp-space-5);
  border: 1px dashed var(--lp-color-border);
  border-radius: var(--lp-radius-md);
}

.dev-home-list {
  display: flex;
  flex-direction: column;
  gap: var(--lp-space-2);
}

.dev-style-section {
  margin-bottom: var(--lp-space-6);
}

.dev-style-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--lp-space-3);
}

.dev-style-token-card {
  padding: var(--lp-space-3);
  border: 1px solid var(--lp-color-border);
  border-radius: var(--lp-radius-md);
}

.dev-style-token-swatch {
  height: 3rem;
  border-radius: var(--lp-radius-sm);
  border: 1px solid var(--lp-color-border);
  margin-bottom: var(--lp-space-2);
}

.dev-style-contrast-fail {
  color: var(--lp-color-danger);
  font-weight: var(--lp-font-weight-bold);
}
```

- [ ] **Step 2: L'ajouter au point d'entrée de style du portail**

```scss
// projects/apps/portal/src/styles.scss
@use '../../../libs/ui/src/styles/index.scss';
@use './styles/dev-showcase';
```

- [ ] **Step 3: Créer `StyleGuidePage`**

```ts
// projects/apps/portal/src/app/dev/style-guide/style-guide-page.ts
import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { contrastRatio } from '../contrast-ratio';

interface ColorToken {
  readonly name: string;
  readonly cssVar: string;
}

interface ColorTokenRow extends ColorToken {
  readonly resolvedColor: string;
  readonly contrastVsBackground: number;
  readonly contrastVsSurface: number;
}

const COLOR_TOKENS: readonly ColorToken[] = [
  { name: 'Fond', cssVar: '--lp-color-background' },
  { name: 'Surface', cssVar: '--lp-color-surface' },
  { name: 'Surface (élevée)', cssVar: '--lp-color-surface-raised' },
  { name: 'Bordure', cssVar: '--lp-color-border' },
  { name: 'Texte', cssVar: '--lp-color-text' },
  { name: 'Texte atténué', cssVar: '--lp-color-text-muted' },
  { name: 'Primaire', cssVar: '--lp-color-primary' },
  { name: 'Primaire (contraste)', cssVar: '--lp-color-primary-contrast' },
  { name: 'Primaire (survol)', cssVar: '--lp-color-primary-hover' },
  { name: 'Succès', cssVar: '--lp-color-success' },
  { name: 'Danger', cssVar: '--lp-color-danger' },
  { name: 'Anneau de focus', cssVar: '--lp-color-focus-ring' },
];

/** Seuil WCAG AA pour un élément d'UI (bordure, icône) — texte normal exige 4.5:1. */
const AA_UI_THRESHOLD = 3;

@Component({
  selector: 'app-style-guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Guide de style</h1>

    <section class="dev-style-section">
      <h2>Couleurs</h2>
      <p>Ratio de contraste WCAG calculé contre le fond et la surface. Un élément d'UI (bordure,
      icône) doit atteindre 3:1 ; un texte normal, 4.5:1.</p>
      <div class="dev-style-token-grid">
        @for (token of colorRows(); track token.cssVar) {
          <div class="dev-style-token-card">
            <div class="dev-style-token-swatch" [style.background]="token.resolvedColor"></div>
            <strong>{{ token.name }}</strong>
            <div><code>{{ token.cssVar }}</code></div>
            <div [class.dev-style-contrast-fail]="token.contrastVsBackground < AA_UI_THRESHOLD">
              vs fond : {{ token.contrastVsBackground | number: '1.2-2' }}:1
            </div>
            <div [class.dev-style-contrast-fail]="token.contrastVsSurface < AA_UI_THRESHOLD">
              vs surface : {{ token.contrastVsSurface | number: '1.2-2' }}:1
            </div>
          </div>
        }
      </div>
    </section>

    <section class="dev-style-section">
      <h2>Typographie</h2>
      <p style="font-size: var(--lp-font-size-xs)">xs — texte fin</p>
      <p style="font-size: var(--lp-font-size-sm)">sm — texte secondaire</p>
      <p style="font-size: var(--lp-font-size-base)">base — texte courant</p>
      <p style="font-size: var(--lp-font-size-lg)">lg — sous-titre</p>
      <p style="font-size: var(--lp-font-size-xl)">xl — titre</p>
      <p style="font-size: var(--lp-font-size-2xl)">2xl — titre principal</p>
    </section>

    <section class="dev-style-section">
      <h2>Boutons (.b-button)</h2>
      <button type="button" class="b-button b-primary">Primaire</button>
      <button type="button" class="b-button b-secondary">Secondaire</button>
      <button type="button" class="b-button b-danger">Danger</button>
      <button type="button" class="b-button b-primary is-disabled" disabled>Désactivé</button>
    </section>

    <section class="dev-style-section">
      <h2>Carte (.card)</h2>
      <article class="card">
        <h3 class="card-title">Titre de carte</h3>
        <div class="card-body">Corps de la carte.</div>
      </article>
      <article class="card card-interactive" tabindex="0" role="button">
        <h3 class="card-title">Carte interactive</h3>
        <div class="card-body">Survolable et focusable.</div>
      </article>
    </section>

    <section class="dev-style-section">
      <h2>Panneau (.panel)</h2>
      <section class="panel panel-padding-md">Panneau standard.</section>
      <section class="panel panel-elevated panel-padding-md">Panneau élevé.</section>
    </section>
  `,
})
export class StyleGuidePage {
  protected readonly AA_UI_THRESHOLD = AA_UI_THRESHOLD;
  protected readonly colorRows = signal<readonly ColorTokenRow[]>([]);

  constructor() {
    // getComputedStyle exige que les styles soient appliqués au DOM — afterNextRender()
    // garantit qu'on est côté navigateur, après le premier rendu.
    afterNextRender(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const background = rootStyle.getPropertyValue('--lp-color-background').trim();
      const surface = rootStyle.getPropertyValue('--lp-color-surface').trim();
      const resolve = (cssVar: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${cssVar})`;
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      };
      const backgroundResolved = resolve('--lp-color-background');
      const surfaceResolved = resolve('--lp-color-surface');

      this.colorRows.set(
        COLOR_TOKENS.map((token) => {
          const resolvedColor = resolve(token.cssVar);
          return {
            ...token,
            resolvedColor,
            contrastVsBackground: contrastRatio(resolvedColor, backgroundResolved),
            contrastVsSurface: contrastRatio(resolvedColor, surfaceResolved),
          };
        }),
      );
      // `background`/`surface` (valeurs brutes de la variable CSS, potentiellement un nom ou un
      // hex non résolu) ne servent qu'à documenter l'intention ci-dessus ; le calcul utilise
      // exclusivement les couleurs résolues par le navigateur (`backgroundResolved`/`surfaceResolved`).
      void background;
      void surface;
    });
  }
}
```

**Note** : `resolve()` crée un élément sonde temporaire plutôt que de lire directement
`rootStyle.getPropertyValue(token.cssVar)`, car cette dernière renvoie la valeur brute de la
variable (ex. `#faf7f2`, ou une référence non résolue si le token est défini via `var()` imbriqué)
alors qu'on veut la couleur **calculée** par le navigateur au format `rgb()` qu'attend
`contrastRatio`. Passer par `color` sur un élément réel force cette résolution.

- [ ] **Step 4: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts
import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
  { path: 'style', loadComponent: () => import('./style-guide/style-guide-page').then((m) => m.StyleGuidePage) },
];
```

`dev-home-page.ts` n'a pas besoin de changer : le lien « Guide de style » a déjà été ajouté à la
Tâche 3 et pointe déjà vers `style`.

- [ ] **Step 5: Vérifier dans le navigateur**

Run: `npm start`
Ouvrir `http://localhost:4200/dev/components/style`.
Expected : nuanciers de couleur avec ratios affichés, échelle typographique, boutons/carte/panneau
rendus avec leurs classes globales. Les ratios affichés en rouge (`.dev-style-contrast-fail`)
identifient les tokens sous 3:1 — comparer avec l'audit de l'issue #3 (le token `border` doit y
apparaître en échec, cohérent avec le ratio ~1.37:1 mesuré). Arrêter le serveur une fois vérifié.

- [ ] **Step 6: Commit**

```bash
git add projects/apps/portal/src/app/dev/style-guide/ projects/apps/portal/src/styles/_dev-showcase.scss projects/apps/portal/src/styles.scss projects/apps/portal/src/app/dev/dev.routes.ts
git commit -m "feat(portal): guide de style avec ratios de contraste calcules"
```

---

### Task 5: Migrer `LpButton`

**Files:**
- Create: `projects/libs/ui/src/lib/button/lp-button.showcase.ts`
- Modify: `projects/libs/ui/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/libs/ui/src/lib/button/lp-button.stories.ts`

**Interfaces:**
- Consumes: `ComponentShowcase` (Task 1), `LpButton` (existant).

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/libs/ui/src/lib/button/lp-button.showcase.ts
import type { ComponentShowcase } from '../../../../../apps/portal/src/app/dev/showcase.types';
import { LpButton } from './lp-button';

export const LP_BUTTON_SHOWCASE: ComponentShowcase<LpButton> = {
  component: LpButton,
  content: 'Valider',
  controls: {
    variant: { kind: 'enum', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    type: { kind: 'enum', options: ['button', 'submit'], default: 'button' },
    disabled: { kind: 'boolean', default: false },
  },
};
```

**Attention au chemin d'import relatif** : `projects/libs/ui` n'a pas d'alias vers
`projects/apps/portal`. Pour éviter ce chemin relatif fragile (5 niveaux de `../`), l'étape 1bis
ci-dessous le remplace par l'alias `@lets-ple/portal-dev` avant de continuer — voir la note après
ce step.

- [ ] **Step 1bis : ajouter un alias TypeScript pour `showcase.types.ts`**

`showcase.types.ts` n'a aucune dépendance vers le reste du portail (pas d'Angular Router, pas de
composants) : c'est un fichier de types pur, candidat naturel à devenir un point d'échange partagé
plutôt qu'un import traversant vers une app depuis une lib. Ajouter l'alias dans `tsconfig.json` :

```json
// tsconfig.json — dans "compilerOptions.paths", à côté des alias existants
"@lets-ple/showcase-types": ["./projects/apps/portal/src/app/dev/showcase.types.ts"]
```

Puis corriger l'import dans `lp-button.showcase.ts` :

```ts
// projects/libs/ui/src/lib/button/lp-button.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpButton } from './lp-button';

export const LP_BUTTON_SHOWCASE: ComponentShowcase<LpButton> = {
  component: LpButton,
  content: 'Valider',
  controls: {
    variant: { kind: 'enum', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    type: { kind: 'enum', options: ['button', 'submit'], default: 'button' },
    disabled: { kind: 'boolean', default: false },
  },
};
```

Cet alias sera réutilisé tel quel par toutes les tâches de migration suivantes (6 à 14) — il n'est
documenté qu'une fois ici.

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/libs/ui/src/public-api.ts
/*
 * Public API Surface of ui
 */

export * from './lib/button/lp-button';
export * from './lib/button/lp-button.showcase';
export * from './lib/card/lp-card';
export * from './lib/panel/lp-panel';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts
import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
  { path: 'style', loadComponent: () => import('./style-guide/style-guide-page').then((m) => m.StyleGuidePage) },
  {
    path: 'lp-button',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_BUTTON_SHOWCASE) },
  },
];
```

```ts
// projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dev-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Showcase de composants</h1>
    <ul class="dev-home-list">
      <li><a routerLink="style">Guide de style</a></li>
      <li><a routerLink="lp-button">LpButton</a></li>
    </ul>
  `,
})
export class DevHomePage {}
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start`
Ouvrir `http://localhost:4200/dev/components/lp-button`.
Expected : formulaire avec `variant` (menu), `type` (menu), `disabled` (case à cocher) ; le bouton
« Valider » se remonte avec les bonnes classes (`b-primary`/`b-secondary`/`b-danger`) et l'attribut
`disabled` en cochant la case. Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story**

```bash
git rm projects/libs/ui/src/lib/button/lp-button.stories.ts
```

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json projects/libs/ui/src/lib/button/lp-button.showcase.ts projects/libs/ui/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(ui): migre LpButton de storybook vers le showcase"
```

---

### Task 6: Migrer `LpCard`

**Files:**
- Create: `projects/libs/ui/src/lib/card/lp-card.showcase.ts`
- Modify: `projects/libs/ui/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/libs/ui/src/lib/card/lp-card.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/libs/ui/src/lib/card/lp-card.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpCard } from './lp-card';

export const LP_CARD_SHOWCASE: ComponentShowcase<LpCard> = {
  component: LpCard,
  content: 'Décrypte la citation, une lettre à la fois.',
  controls: {
    title: { kind: 'text', default: 'Cryptogramme' },
    interactive: { kind: 'boolean', default: false },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/libs/ui/src/public-api.ts
export * from './lib/button/lp-button';
export * from './lib/button/lp-button.showcase';
export * from './lib/card/lp-card';
export * from './lib/card/lp-card.showcase';
export * from './lib/panel/lp-panel';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-card',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_CARD_SHOWCASE) },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-card">LpCard</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-card`.
Expected : champ `title` (texte) et `interactive` (case à cocher) ; la carte se remonte avec le
bon titre et bascule entre `.card`/`.card-interactive`. Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/libs/ui/src/lib/card/lp-card.stories.ts
git add projects/libs/ui/src/lib/card/lp-card.showcase.ts projects/libs/ui/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(ui): migre LpCard de storybook vers le showcase"
```

---

### Task 7: Migrer `LpPanel`

**Files:**
- Create: `projects/libs/ui/src/lib/panel/lp-panel.showcase.ts`
- Modify: `projects/libs/ui/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/libs/ui/src/lib/panel/lp-panel.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/libs/ui/src/lib/panel/lp-panel.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpPanel } from './lp-panel';

export const LP_PANEL_SHOWCASE: ComponentShowcase<LpPanel> = {
  component: LpPanel,
  content: 'Contenu du panneau.',
  controls: {
    elevated: { kind: 'boolean', default: false },
    padding: { kind: 'enum', options: ['none', 'sm', 'md', 'lg'], default: 'md' },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/libs/ui/src/public-api.ts
export * from './lib/button/lp-button';
export * from './lib/button/lp-button.showcase';
export * from './lib/card/lp-card';
export * from './lib/card/lp-card.showcase';
export * from './lib/panel/lp-panel';
export * from './lib/panel/lp-panel.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-panel',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_PANEL_SHOWCASE) },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-panel">LpPanel</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-panel`.
Expected : menu `padding` (none/sm/md/lg) et case `elevated` ; le panneau applique les bonnes
classes `.panel-padding-*`/`.panel-elevated`. Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/libs/ui/src/lib/panel/lp-panel.stories.ts
git add projects/libs/ui/src/lib/panel/lp-panel.showcase.ts projects/libs/ui/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(ui): migre LpPanel de storybook vers le showcase"
```

---

### Task 8: Migrer `LpCryptogramCell`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cryptogram-cell/lp-cryptogram-cell.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/cryptogram-cell/lp-cryptogram-cell.stories.ts`

**Interfaces:**
- Consumes: `Cell` (`projects/games/cryptogramme/src/lib/domain/types.ts`).

Premier composant à input requis migré — c'est le cas que le test `ShowcaseRenderer` (Task 2)
protège explicitement. Trois presets couvrent, combinés aux contrôles `selected`/`playable`, les
5 états des stories d'origine (`Fixe`/`Vide`/`Jouable`/`Selectionnee`/`Remplie`) :

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/cryptogram-cell/lp-cryptogram-cell.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import type { Cell } from '../../domain/types';
import { LpCryptogramCell } from './lp-cryptogram-cell';

const FIXE: Cell = { kind: 'fixed', char: ' ' };
const VIDE: Cell = { kind: 'letter', code: 7, char: 'e', filled: null, given: false };
const REMPLIE: Cell = { kind: 'letter', code: 3, char: 'l', filled: 'L', given: true };

export const LP_CRYPTOGRAM_CELL_SHOWCASE: ComponentShowcase<LpCryptogramCell> = {
  component: LpCryptogramCell,
  controls: {
    cell: {
      kind: 'preset',
      options: { Fixe: () => FIXE, Vide: () => VIDE, Remplie: () => REMPLIE },
      default: 'Vide',
    },
    selected: { kind: 'boolean', default: false },
    playable: { kind: 'boolean', default: false },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts
export * from './lib/store/game.store';
export * from './lib/ui/cryptogram-cell/lp-cryptogram-cell';
export * from './lib/ui/cryptogram-cell/lp-cryptogram-cell.showcase';
export * from './lib/ui/cryptogram-grid/lp-cryptogram-grid';
export * from './lib/ui/cryptogram-hand/lp-cryptogram-hand';
export * from './lib/ui/cryptogram-deck/lp-cryptogram-deck';
export * from './lib/ui/cipher-table/lp-cipher-table';
export * from './lib/ui/error-counter/lp-error-counter';
export * from './lib/ui/game-page/lp-game-page';
export * from './lib/routes';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-cryptogram-cell',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_CELL_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-cryptogram-cell">LpCryptogramCell</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-cryptogram-cell`.
Expected : menu `cell` (Fixe/Vide/Remplie) + cases `selected`/`playable` ; **aucune erreur
`NG0950` dans la console** — c'est précisément le composant qui plantait dans Storybook. Vérifier
que la case « Remplie » affiche bien la lettre « L » avec un contraste lisible (le point de départ
de cette session de revue design). Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/cryptogram-cell/lp-cryptogram-cell.stories.ts
git add projects/games/cryptogramme/src/lib/ui/cryptogram-cell/lp-cryptogram-cell.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpCryptogramCell de storybook vers le showcase"
```

---

### Task 9: Migrer `LpCipherTable`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cipher-table/lp-cipher-table.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/cipher-table/lp-cipher-table.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/cipher-table/lp-cipher-table.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import type { Sym } from '../../domain/types';
import { LpCipherTable } from './lp-cipher-table';

const QUELQUES_CORRESPONDANCES: ReadonlyMap<number, Sym> = new Map([
  [3, 'E'],
  [7, 'A'],
  [12, 'S'],
]);

export const LP_CIPHER_TABLE_SHOWCASE: ComponentShowcase<LpCipherTable> = {
  component: LpCipherTable,
  controls: {
    known: {
      kind: 'preset',
      options: {
        Vide: () => new Map<number, Sym>(),
        'Quelques correspondances': () => QUELQUES_CORRESPONDANCES,
      },
      default: 'Quelques correspondances',
    },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne cryptogram-cell.showcase
export * from './lib/ui/cipher-table/lp-cipher-table';
export * from './lib/ui/cipher-table/lp-cipher-table.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-cipher-table',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CIPHER_TABLE_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-cipher-table">LpCipherTable</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-cipher-table`.
Expected : menu `known` (Vide/Quelques correspondances) ; la table affiche 3 lignes
code→symbole avec « Quelques correspondances » sélectionné. Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/cipher-table/lp-cipher-table.stories.ts
git add projects/games/cryptogramme/src/lib/ui/cipher-table/lp-cipher-table.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpCipherTable de storybook vers le showcase"
```

---

### Task 10: Migrer `LpCryptogramDeck`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cryptogram-deck/lp-cryptogram-deck.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/cryptogram-deck/lp-cryptogram-deck.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/cryptogram-deck/lp-cryptogram-deck.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpCryptogramDeck } from './lp-cryptogram-deck';

export const LP_CRYPTOGRAM_DECK_SHOWCASE: ComponentShowcase<LpCryptogramDeck> = {
  component: LpCryptogramDeck,
  controls: {
    remaining: { kind: 'number', default: 12 },
    handFull: { kind: 'boolean', default: false },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne cipher-table.showcase
export * from './lib/ui/cryptogram-deck/lp-cryptogram-deck';
export * from './lib/ui/cryptogram-deck/lp-cryptogram-deck.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-cryptogram-deck',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_DECK_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-cryptogram-deck">LpCryptogramDeck</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur, incluant l'état épuisé et main pleine**

Run: `npm start` → `http://localhost:4200/dev/components/lp-cryptogram-deck`.
Expected : champ `remaining` (nombre) et case `handFull` ; passer `remaining` à 0 ou cocher
`handFull` désactive le bouton (`[disabled]`). Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/cryptogram-deck/lp-cryptogram-deck.stories.ts
git add projects/games/cryptogramme/src/lib/ui/cryptogram-deck/lp-cryptogram-deck.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpCryptogramDeck de storybook vers le showcase"
```

---

### Task 11: Migrer `LpCryptogramHand`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cryptogram-hand/lp-cryptogram-hand.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/cryptogram-hand/lp-cryptogram-hand.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/cryptogram-hand/lp-cryptogram-hand.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import type { Sym } from '../../domain/types';
import { LpCryptogramHand } from './lp-cryptogram-hand';

export const LP_CRYPTOGRAM_HAND_SHOWCASE: ComponentShowcase<LpCryptogramHand> = {
  component: LpCryptogramHand,
  controls: {
    hand: {
      kind: 'preset',
      options: {
        'Main vide': () => [] as readonly Sym[],
        'Une carte': () => ['E'] as readonly Sym[],
        'Cinq cartes': () => ['E', 'T', 'L', 'A', 'S'] as readonly Sym[],
      },
      default: 'Cinq cartes',
    },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne cryptogram-deck.showcase
export * from './lib/ui/cryptogram-hand/lp-cryptogram-hand';
export * from './lib/ui/cryptogram-hand/lp-cryptogram-hand.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-cryptogram-hand',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_HAND_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-cryptogram-hand">LpCryptogramHand</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-cryptogram-hand`.
Expected : menu `hand` (Main vide/Une carte/Cinq cartes) ; avec « Cinq cartes », seule la
dernière carte (dessus de la pile) est stylée `.crypto-hand-card-top` et cliquable. Arrêter le
serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/cryptogram-hand/lp-cryptogram-hand.stories.ts
git add projects/games/cryptogramme/src/lib/ui/cryptogram-hand/lp-cryptogram-hand.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpCryptogramHand de storybook vers le showcase"
```

---

### Task 12: Migrer `LpErrorCounter`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/error-counter/lp-error-counter.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/error-counter/lp-error-counter.stories.ts`

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/error-counter/lp-error-counter.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpErrorCounter } from './lp-error-counter';

export const LP_ERROR_COUNTER_SHOWCASE: ComponentShowcase<LpErrorCounter> = {
  component: LpErrorCounter,
  controls: {
    errors: { kind: 'number', default: 0 },
    maxErrors: { kind: 'number', default: 3 },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne cryptogram-hand.showcase
export * from './lib/ui/error-counter/lp-error-counter';
export * from './lib/ui/error-counter/lp-error-counter.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-error-counter',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_ERROR_COUNTER_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-error-counter">LpErrorCounter</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur, y compris l'état « partie perdue »**

Run: `npm start` → `http://localhost:4200/dev/components/lp-error-counter`.
Expected : champs `errors`/`maxErrors` (nombres) ; passer `errors` à 3 avec `maxErrors` à 3
affiche 3 croix pleines (état perdu). Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/error-counter/lp-error-counter.stories.ts
git add projects/games/cryptogramme/src/lib/ui/error-counter/lp-error-counter.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpErrorCounter de storybook vers le showcase"
```

---

### Task 13: Migrer `LpCryptogramGrid`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/cryptogram-grid/lp-cryptogram-grid.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/cryptogram-grid/lp-cryptogram-grid.stories.ts`

**Interfaces:**
- Consumes: `createGame`, `isPlayable` (`../../domain/game.ts`).

Le plateau est **identique** entre les 3 stories d'origine (même citation, même graine, aucune
case n'est jamais remplie par un `DRAW`) — un seul preset `board` suffit ; seuls `selectedCell` et
`playableCells` varient, calculés via le même état de partie que les stories d'origine.

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/cryptogram-grid/lp-cryptogram-grid.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { createGame, isPlayable, reduce } from '../../domain/game';
import type { Cell } from '../../domain/types';
import { LpCryptogramGrid } from './lp-cryptogram-grid';

const CITATION = "Rien n'est plus puissant qu'une idee dont l'heure est venue.";

function partieDemo() {
  return createGame('q1', CITATION, { seed: 'grille-demo' });
}

function partieAvecMainTiree() {
  return reduce(partieDemo(), { type: 'DRAW' });
}

export const LP_CRYPTOGRAM_GRID_SHOWCASE: ComponentShowcase<LpCryptogramGrid> = {
  component: LpCryptogramGrid,
  controls: {
    board: {
      kind: 'preset',
      options: { 'Citation de démonstration': () => partieDemo().board as readonly Cell[] },
      default: 'Citation de démonstration',
    },
    selectedCell: {
      kind: 'preset',
      options: {
        Aucune: () => null,
        'Première case vide': () => {
          const state = partieAvecMainTiree();
          return state.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
        },
      },
      default: 'Aucune',
    },
    playableCells: {
      kind: 'preset',
      options: {
        Aucune: () => [] as readonly boolean[],
        'Après une pioche': () => {
          const state = partieAvecMainTiree();
          return state.board.map((_c, i) => isPlayable(state, i));
        },
      },
      default: 'Aucune',
    },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne error-counter.showcase
export * from './lib/ui/cryptogram-grid/lp-cryptogram-grid';
export * from './lib/ui/cryptogram-grid/lp-cryptogram-grid.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-cryptogram-grid',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_GRID_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-cryptogram-grid">LpCryptogramGrid</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-cryptogram-grid`.
Expected : le plateau de la citation de démo s'affiche, groupé par mot ; passer `selectedCell` à
« Première case vide » surligne bien une case ; passer `playableCells` à « Après une pioche »
marque en pointillés les cases jouables. Arrêter le serveur une fois vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/cryptogram-grid/lp-cryptogram-grid.stories.ts
git add projects/games/cryptogramme/src/lib/ui/cryptogram-grid/lp-cryptogram-grid.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpCryptogramGrid de storybook vers le showcase"
```

---

### Task 14: Migrer `LpGamePage`

**Files:**
- Create: `projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.showcase.ts`
- Modify: `projects/games/cryptogramme/src/public-api.ts`
- Modify: `projects/apps/portal/src/app/dev/dev.routes.ts`
- Modify: `projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts`
- Delete: `projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.stories.ts`

Dernier composant du jeu : 5 inputs requis, tous du texte simple — aucun preset nécessaire. C'est
la première fois que `_cryptogramme.scss` (le module SCSS complet du jeu, avec toutes les classes
`.crypto-*`) se charge dans le showcase, puisque `LpGamePage` est le seul composant à le référencer
via `styleUrls` (voir l'en-tête de `lp-game-page.ts`).

- [ ] **Step 1: Créer la spec showcase**

```ts
// projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.showcase.ts
import type { ComponentShowcase } from '@lets-ple/showcase-types';
import { LpGamePage } from './lp-game-page';

export const LP_GAME_PAGE_SHOWCASE: ComponentShowcase<LpGamePage> = {
  component: LpGamePage,
  controls: {
    quoteId: { kind: 'text', default: 'litterature-02' },
    text: { kind: 'text', default: 'Le cœur a ses raisons que la raison ne connaît point.' },
    author: { kind: 'text', default: 'Blaise Pascal' },
    source: { kind: 'text', default: 'Pensées, 1670' },
    seed: { kind: 'text', default: 'partie-demo' },
  },
};
```

- [ ] **Step 2: Exporter depuis `public-api.ts`**

```ts
// projects/games/cryptogramme/src/public-api.ts — après la ligne cryptogram-grid.showcase
export * from './lib/ui/game-page/lp-game-page';
export * from './lib/ui/game-page/lp-game-page.showcase';
```

- [ ] **Step 3: Ajouter la route et le lien**

```ts
// projects/apps/portal/src/app/dev/dev.routes.ts — ajouter à DEV_ROUTES
{
  path: 'lp-game-page',
  loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
  data: {
    loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_GAME_PAGE_SHOWCASE),
  },
},
```

```html
<!-- dev-home-page.ts — ajouter à la liste -->
<li><a routerLink="lp-game-page">LpGamePage</a></li>
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: `npm start` → `http://localhost:4200/dev/components/lp-game-page`.
Expected : la partie complète se rend (compteur d'erreurs, pioche, main, plateau, table de
correspondance), pioche/jeu fonctionnels au clic. C'est aussi le premier endroit où l'on peut
vérifier visuellement toutes les classes `.crypto-*` en conditions réelles (le guide de style,
Tâche 4, ne les couvre volontairement pas — voir sa note de portée). Arrêter le serveur une fois
vérifié.

- [ ] **Step 5: Supprimer l'ancien fichier de story et commit**

```bash
git rm projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.stories.ts
git add projects/games/cryptogramme/src/lib/ui/game-page/lp-game-page.showcase.ts projects/games/cryptogramme/src/public-api.ts projects/apps/portal/src/app/dev/dev.routes.ts projects/apps/portal/src/app/dev/dev-home/dev-home-page.ts
git commit -m "feat(cryptogramme): migre LpGamePage de storybook vers le showcase"
```

---

### Task 15: Checklist de parité — vérification finale avant retrait de Storybook

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Confirmer qu'il ne reste plus de fichier `.stories.ts`**

Run: `git ls-files '*.stories.ts'`
Expected: sortie vide (les 10 fichiers d'origine ont tous été supprimés dans les Tâches 5-14).

- [ ] **Step 2: Confirmer qu'il ne reste plus de fichier `.showcase.ts` manquant**

Run: `git ls-files '*.showcase.ts'`
Expected: 10 fichiers listés — un par composant migré (button, card, panel, cryptogram-cell,
cipher-table, cryptogram-deck, cryptogram-hand, error-counter, cryptogram-grid, game-page).

- [ ] **Step 3: Suite de tests complète**

Run: `npm run test:all`
Expected: PASS — tous les tests domaine (vitest) et Angular (`ng test`, y compris
`contrast-ratio.spec.ts` et `showcase-renderer.spec.ts`).

- [ ] **Step 4: Build de production du portail**

Run: `npm run build`
Expected: PASS sans avertissement de chunk manquant ; `dist/portal` contient un chunk séparé pour
`/dev/components` et pour `@lets-ple/cryptogramme` (vérifiable via la sortie de la commande, qui
liste les chunks générés et leur taille).

- [ ] **Step 5: Revue manuelle finale dans le navigateur**

Run: `npm start`
Parcourir `http://localhost:4200/dev/components` et chacun des 10 liens + `/style` un par un.
Expected: chaque page se rend sans erreur console, les contrôles modifient bien le composant
affiché. C'est la dernière vérification avant de supprimer Storybook — si un écart avec le
comportement d'origine des stories est trouvé ici, le corriger avant de continuer (revenir à la
tâche de migration concernée).

Aucun commit pour cette tâche (vérification pure) — passer directement à la Tâche 16 une fois tout
confirmé.

---

### Task 16: Retirer Storybook et republier Compodoc en mode autonome

**Files:**
- Delete: `projects/apps/storybook/` (dossier entier)
- Modify: `angular.json`
- Modify: `tsconfig.json`
- Modify: `tsconfig.doc.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Modify: `CLAUDE.md`
- Modify: `docs/conventions/components.md`
- Modify: `docs/conventions/css.md`

- [ ] **Step 1: Supprimer le projet Storybook**

```bash
git rm -r projects/apps/storybook
```

- [ ] **Step 2: Retirer les cibles et le projet `storybook` de `angular.json`**

Supprimer entièrement l'entrée de projet `"storybook": { ... }` (la trouver via
`grep -n '"storybook"' angular.json` avant édition — c'est le bloc commençant à la ligne où
`"projectType": "application"` suit immédiatement `"storybook": {`, jusqu'à l'accolade fermante
correspondante, incluant ses cibles `build`/`test`/`storybook`/`build-storybook`).

- [ ] **Step 3: Retirer les références au projet storybook de `tsconfig.json`**

```json
// tsconfig.json — dans "references", supprimer ces deux entrées
{
  "path": "./projects/apps/storybook/tsconfig.app.json"
},
{
  "path": "./projects/apps/storybook/tsconfig.spec.json"
}
```

- [ ] **Step 4: Mettre à jour l'en-tête de `tsconfig.doc.json`**

```json
// tsconfig.doc.json
/* Tsconfig dédié à Compodoc, exécuté en mode autonome (`npm run docs`).
   Le tsconfig.json racine est un fichier "solution style" (`files: []` + `references`), que
   Compodoc ne sait pas résoudre — il lui faut un tsconfig listant directement les sources via
   `include`. On documente ici toutes les libs/jeux dont les composants sont publiés. */
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": []
  },
  "include": [
    "projects/libs/ui/src/**/*.ts",
    "projects/libs/game-core/src/**/*.ts",
    "projects/games/cryptogramme/src/**/*.ts"
  ],
  "exclude": ["**/*.spec.ts"]
}
```

(Le contenu ne change pas — seul le commentaire d'en-tête, qui référençait Storybook.)

- [ ] **Step 5: Retirer les dépendances Storybook et ajouter le script Compodoc dans `package.json`**

```bash
npm uninstall storybook @storybook/angular-vite @storybook/addon-a11y @storybook/addon-docs @storybook/addon-vitest @chromatic-com/storybook @analogjs/vite-plugin-angular
```

Puis, dans `package.json`, remplacer les scripts `storybook`/`build-storybook` :

```json
"docs": "compodoc -p tsconfig.doc.json -s",
```

(Retirer les lignes `"storybook": "ng run storybook:storybook",` et
`"build-storybook": "ng run storybook:build-storybook",`.)

- [ ] **Step 6: Retirer l'étape `build-storybook` de la CI**

```yaml
# .github/workflows/ci.yml — supprimer ce step
- run: npm run build-storybook
```

- [ ] **Step 7: Mettre à jour le commentaire `.gitignore`**

```
# Généré par Compodoc (voir tsconfig.doc.json, npm run docs)
/documentation.json
```

- [ ] **Step 8: Mettre à jour `CLAUDE.md`**

Dans la section « Architecture », remplacer la ligne décrivant `apps/storybook` :

```
│  └─ portal/          le seul app déployée : shell, accueil, catalogue de jeux, PWA, et /dev/components (showcase de composants)
```

(l'entrée `storybook/` disparaît de l'arborescence `projects/apps/` puisque le dossier n'existe
plus). Dans la section « Commands », ajouter à la liste des commandes :

```
npm run docs                   # publie la doc Compodoc en site statique autonome (dist/documentation)
```

- [ ] **Step 9: Mettre à jour `docs/conventions/components.md`**

Remplacer chaque mention de « Storybook » par une référence au showcase (`/dev/components`), en
particulier la Règle d'or (« se conçoit et se construit d'abord dans Storybook » →
« se conçoit et se construit d'abord dans le showcase de composants (`/dev/components`) ») et
l'exemple de `LpGamePage` (« chacun conçu et documenté dans Storybook avant son intégration ici »
→ « chacun conçu et documenté dans le showcase avant son intégration ici »).

- [ ] **Step 10: Mettre à jour `docs/conventions/css.md`**

Dans la section « Chargement », remplacer :

```
- **Storybook** (`.storybook/preview.ts`) : importe le même `index.scss`, plus — en dev seulement —
  le module de chaque jeu dont des stories existent.
```

par :

```
- **Showcase de composants** (`/dev/components`, dans le portail) : le portail importe déjà
  `index.scss` globalement ; le module SCSS d'un jeu (`_cryptogramme.scss`) n'est chargé que
  lorsque la page showcase d'un composant de ce jeu (ex. `LpGamePage`) est visitée, via le même
  mécanisme de chunk lazy que la route `/cryptogramme` elle-même.
```

- [ ] **Step 11: Vérifier que tout compile et teste toujours après le nettoyage**

Run: `npm ci && npm run test:all && npm run build`
Expected: PASS, aucune référence résiduelle à un paquet `storybook`/`@storybook/*`.

Run: `npm run docs`
Expected: Compodoc génère `dist/documentation/index.html` et sert un site local (Ctrl+C pour
arrêter une fois vérifié dans le navigateur que la doc des composants s'affiche).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: retire storybook, republie compodoc en mode autonome"
```

---

## Self-Review

**Couverture de la spec** : Compodoc autonome (Tâche 16), showcase avec route `/dev/components`
(Tâches 3-4), guide de style SMACSS (Tâche 4), `ShowcaseRenderer` respectant l'ordre
`setInput` → `detectChanges` (Tâche 2) avec test de non-régression NG0950 (Tâche 2), les 5 types de
contrôle identifiés (`enum`/`boolean`/`text`/`number`/`preset`, Tâche 1), les presets sous forme de
fabriques pour `LpCryptogramGrid` (Tâche 13), migration incrémentale des 10 fichiers `.stories.ts`
avec coexistence Storybook/showcase (Tâches 5-14), checklist de parité (Tâche 15), retrait complet
de Storybook avec mise à jour des docs (Tâche 16). Aucune section de la spec sans tâche
correspondante.

**Cohérence des types** : `ComponentShowcase<T>`/`ControlSpec`/`resolveProps`/`defaultFormValues`
(Task 1) sont utilisés à l'identique dans `ShowcaseRenderer` (Task 2) et dans chaque
`.showcase.ts` (Tâches 5-14) — noms de champs (`kind`, `options`, `default`, `controls`,
`content`) vérifiés cohérents partout. `loadShowcase` (route `data`) a la même signature
(`() => Promise<ComponentShowcase<unknown>>`) dans `ComponentPage` (Task 3) et dans chaque entrée
de route ajoutée (Tâches 5-14).

**Alias `@lets-ple/showcase-types`** introduit à la Tâche 5 (avant, seul `lp-button.showcase.ts`
existe et n'a pas encore besoin de l'alias — il est donc introduit au bon endroit, à la première
utilisation réelle depuis une lib).
