import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCard } from './lp-card';

const meta: Meta<LpCard> = {
  title: 'UI/LpCard',
  component: LpCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    interactive: { control: 'boolean' },
  },
  args: {
    title: 'Cryptogramme',
    interactive: false,
  },
  render: (args) => ({
    props: args,
    template: `<lp-card [title]="title" [interactive]="interactive">Décrypte la citation, une lettre à la fois.</lp-card>`,
  }),
};

export default meta;
type Story = StoryObj<LpCard>;

export const Default: Story = {};
export const WithoutTitle: Story = { args: { title: undefined } };
export const Interactive: Story = { args: { interactive: true } };
