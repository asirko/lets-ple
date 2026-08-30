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
  {
    id: 'dernier-mot',
    title: 'Dernier Mot',
    summary: 'À plusieurs, ajoutez une lettre et remportez le dernier mot.',
    route: '/dernier-mot',
    themes: ['multi', 'compétitif'],
    icon: 'word',
  },
];
