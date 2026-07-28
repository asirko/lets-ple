import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpButton } from './lp-button';

const meta: Meta<LpButton> = {
  title: 'UI/LpButton',
  component: LpButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'danger'] },
    type: { control: 'radio', options: ['button', 'submit'] },
    disabled: { control: 'boolean' },
  },
  args: {
    variant: 'primary',
    type: 'button',
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<lp-button [variant]="variant" [type]="type" [disabled]="disabled">Valider</lp-button>`,
  }),
};

export default meta;
type Story = StoryObj<LpButton>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };
