import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpPanel } from './lp-panel';

const meta: Meta<LpPanel> = {
  title: 'UI/LpPanel',
  component: LpPanel,
  tags: ['autodocs'],
  argTypes: {
    elevated: { control: 'boolean' },
    padding: { control: 'radio', options: ['none', 'sm', 'md', 'lg'] },
  },
  args: {
    elevated: false,
    padding: 'md',
  },
  render: (args) => ({
    props: args,
    template: `<lp-panel [elevated]="elevated" [padding]="padding">Contenu du panneau.</lp-panel>`,
  }),
};

export default meta;
type Story = StoryObj<LpPanel>;

export const Default: Story = {};
export const Elevated: Story = { args: { elevated: true } };
export const NoPadding: Story = { args: { padding: 'none' } };
export const LargePadding: Story = { args: { padding: 'lg' } };
