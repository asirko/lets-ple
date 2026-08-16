import { defaultFormValues, resolveProps, type ControlSpec } from './showcase.types';

describe('resolveProps', () => {
  it('résout un contrôle enum vers la valeur choisie dans le formulaire', () => {
    const controls: Record<string, ControlSpec> = {
      variant: { kind: 'enum', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    };

    expect(resolveProps(controls, { variant: 'danger' })).toEqual({ variant: 'danger' });
  });

  it('résout un contrôle boolean vers la valeur choisie dans le formulaire', () => {
    const controls: Record<string, ControlSpec> = {
      disabled: { kind: 'boolean', default: false },
    };

    expect(resolveProps(controls, { disabled: true })).toEqual({ disabled: true });
  });

  it('résout un contrôle text vers la valeur choisie dans le formulaire', () => {
    const controls: Record<string, ControlSpec> = {
      title: { kind: 'text', default: 'Cryptogramme' },
    };

    expect(resolveProps(controls, { title: 'Autre titre' })).toEqual({ title: 'Autre titre' });
  });

  it('résout un contrôle number vers la valeur choisie dans le formulaire', () => {
    const controls: Record<string, ControlSpec> = {
      remaining: { kind: 'number', default: 12 },
    };

    expect(resolveProps(controls, { remaining: 7 })).toEqual({ remaining: 7 });
  });

  it('résout un contrôle preset en appelant la fabrique sélectionnée, pas en renvoyant la fabrique elle-même', () => {
    const fabriqueVide = () => [];
    const fabriquePleine = () => ['E', 'T', 'L'];
    const controls: Record<string, ControlSpec> = {
      hand: {
        kind: 'preset',
        options: { 'Main vide': fabriqueVide, 'Main pleine': fabriquePleine },
        default: 'Main vide',
      },
    };

    const props = resolveProps(controls, { hand: 'Main pleine' });

    expect(props['hand']).toEqual(['E', 'T', 'L']);
    expect(props['hand']).not.toBe(fabriquePleine);
    expect(typeof props['hand']).not.toBe('function');
  });

  it('résout chaque contrôle indépendamment quand plusieurs types sont mélangés', () => {
    const controls: Record<string, ControlSpec> = {
      variant: { kind: 'enum', options: ['primary', 'secondary'], default: 'primary' },
      disabled: { kind: 'boolean', default: false },
      cell: {
        kind: 'preset',
        options: { Vide: () => ({ kind: 'letter', filled: null }) },
        default: 'Vide',
      },
    };

    const props = resolveProps(controls, { variant: 'secondary', disabled: true, cell: 'Vide' });

    expect(props).toEqual({
      variant: 'secondary',
      disabled: true,
      cell: { kind: 'letter', filled: null },
    });
  });
});

describe('defaultFormValues', () => {
  it("dérive les valeurs par défaut du formulaire à partir de default de chaque contrôle", () => {
    const controls: Record<string, ControlSpec> = {
      variant: { kind: 'enum', options: ['primary', 'secondary'], default: 'primary' },
      disabled: { kind: 'boolean', default: false },
      title: { kind: 'text', default: 'Cryptogramme' },
      remaining: { kind: 'number', default: 12 },
      hand: { kind: 'preset', options: { 'Main vide': () => [] }, default: 'Main vide' },
    };

    expect(defaultFormValues(controls)).toEqual({
      variant: 'primary',
      disabled: false,
      title: 'Cryptogramme',
      remaining: 12,
      hand: 'Main vide',
    });
  });
});
