export interface GameDescriptor {
  id: string;
  title: string;
  summary: string;
  route: string;
  themes: string[];
  icon: string;
}

export const GAME_REGISTRY: readonly GameDescriptor[] = [
  {
    id: 'cryptogramme',
    title: 'Cryptogramme',
    summary: "Reconstitue une citation lettre par lettre : chaque symbole cache une lettre.",
    route: '/cryptogramme',
    themes: ['mots', 'citations'],
    icon: 'cipher',
  },
];
