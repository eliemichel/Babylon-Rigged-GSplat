import './style.css'
import App from './App'

async function main() {
  // Make sure DOM is loaded before initializing the app
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // Initialize the app
  // and add it to the window object for debugging in Browser console
  const app = new App();
  (window as unknown as { app: App }).app = app;

  // Load sample data
  await app.loadModel("/castle.spz");

  const vase = await app.loadModel("/vase.spz");
  vase.position.y = 1;
}

main();
