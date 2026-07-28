import type { Preview } from '@storybook/angular-vite'
import '../../../libs/ui/src/styles/index.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;