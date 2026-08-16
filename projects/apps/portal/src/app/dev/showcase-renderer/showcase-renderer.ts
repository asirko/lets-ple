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
