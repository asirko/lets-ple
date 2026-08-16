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
  readonly controls: Partial<Record<Extract<keyof T, string>, ControlSpec>>;
  /** Fragment HTML projeté dans le `<ng-content>` du composant, s'il en a un. */
  readonly content?: string;
}

export type FormValue = string | boolean | number;

/** Calcule les valeurs de props à appliquer au composant monté à partir de l'état du formulaire
 * de contrôles — résout les presets vers leur valeur réelle via leur fabrique. */
export function resolveProps(
  controls: Readonly<Partial<Record<string, ControlSpec>>>,
  formValues: Readonly<Record<string, FormValue>>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, control] of Object.entries(controls)) {
    if (!control) continue;
    props[name] = control.kind === 'preset' ? control.options[formValues[name] as string]() : formValues[name];
  }
  return props;
}

/** Valeurs par défaut du formulaire de contrôles, dérivées de chaque `ControlSpec.default`. */
export function defaultFormValues(
  controls: Readonly<Partial<Record<string, ControlSpec>>>,
): Record<string, FormValue> {
  const values: Record<string, FormValue> = {};
  for (const [name, control] of Object.entries(controls)) {
    if (!control) continue;
    values[name] = control.default as FormValue;
  }
  return values;
}
