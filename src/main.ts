import * as PIXI from 'pixi.js';
import { Dropdown } from './components/Dropdown';

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xf5f5f5,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.view as HTMLCanvasElement);

window.addEventListener('resize', () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});


async function init(): Promise<void> {
  // const [backgroundTexture, buttonTexture] = await Promise.all([
  //   PIXI.Assets.load<PIXI.Texture>('/assets/w-r15-ds.png'),
  //   PIXI.Assets.load<PIXI.Texture>('/assets/w-r-ds_fog.png'),
  //   // ...
  // ]);

  // Just for example 
  const bgGraphics = new PIXI.Graphics();
  bgGraphics.beginFill(0xf3f3f3);
  bgGraphics.lineStyle(2, 0x5555aa, 1);
  bgGraphics.drawRoundedRect(0, 0, 260, 48, 8);
  bgGraphics.endFill();
  const backgroundTexture = app.renderer.generateTexture(bgGraphics);
  bgGraphics.destroy();

  const dropdown = new Dropdown(backgroundTexture, backgroundTexture);

  dropdown.x = app.renderer.width  / (2 * app.renderer.resolution) - 130;
  dropdown.y = app.renderer.height / (2 * app.renderer.resolution) - 24;

  app.stage.addChild(dropdown);
}

init();
