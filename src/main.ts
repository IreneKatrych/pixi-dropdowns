import { DropdownDemoApp } from './app/DropdownDemoApp';

const demoApp = new DropdownDemoApp(document.body);

void demoApp.init().catch((error: unknown) => {
  console.error('Failed to initialize the dropdown demo.', error);
});

if (import.meta.hot) {
  // Dispose Pixi resources before Vite replaces this module during HMR.
  import.meta.hot.dispose(() => demoApp.destroy());
}
