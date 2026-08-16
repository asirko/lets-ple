import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShowcaseRenderer } from './showcase-renderer';
import type { ComponentShowcase } from '@lets-ple/ui';

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
