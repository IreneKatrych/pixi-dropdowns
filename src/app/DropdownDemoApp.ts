import { Application, Graphics, Texture } from 'pixi.js';
import { Dropdown } from '../components/dropdown/Dropdown';
import { COLORS } from '../theme/colors';
import { APP_CONFIG } from './appConfig';

const TEMPORARY_BACKGROUND_SIZE = 48;
const TEMPORARY_BACKGROUND_RADIUS = 12;
const TEMPORARY_BACKGROUND_SLICE = 16;

export class DropdownDemoApp {
  private application: Application | null = null;
  private dropdown: Dropdown | null = null;
  private dropdownTexture: Texture | null = null;

  public constructor(private readonly mountElement: HTMLElement) {}

  public async init(): Promise<void> {
    if (this.application) {
      return;
    }

    const application = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: COLORS.canvasBackground,
      antialias: true,
      resolution: Math.min(
        window.devicePixelRatio || 1,
        APP_CONFIG.maxRendererResolution,
      ),
      autoDensity: true,
    });

    this.application = application;
    this.mountElement.appendChild(application.view as HTMLCanvasElement);
    window.addEventListener('resize', this.handleResize);

    try {
      this.dropdownTexture = this.createTemporaryDropdownTexture(application);
      this.dropdown = new Dropdown(
        {
          id: 'primary',
          options: [
            { id: 'first', label: 'First option' },
            { id: 'second', label: 'Second option', disabled: true },
            { id: 'third', label: 'Third option' },
          ],
          label: 'Primary account',
          placeholder: 'Select an option',
        },
        {
          headerBackground: this.createBackgroundResource(
            this.dropdownTexture,
          ),
          listBackground: this.createBackgroundResource(this.dropdownTexture),
        },
      );

      application.stage.addChild(this.dropdown);
      this.layout();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);

    this.dropdown?.destroy({ children: true });
    this.dropdown = null;

    this.dropdownTexture?.destroy(true);
    this.dropdownTexture = null;

    this.application?.destroy(true, { children: true });
    this.application = null;
  }

  private createTemporaryDropdownTexture(application: Application): Texture {
    const graphics = new Graphics();
    graphics.beginFill(COLORS.surface);
    graphics.lineStyle(2, COLORS.surfaceBorder, 1);
    graphics.drawRoundedRect(
      0,
      0,
      TEMPORARY_BACKGROUND_SIZE,
      TEMPORARY_BACKGROUND_SIZE,
      TEMPORARY_BACKGROUND_RADIUS,
    );
    graphics.endFill();

    const texture = application.renderer.generateTexture(graphics);
    graphics.destroy();

    return texture;
  }

  private createBackgroundResource(texture: Texture) {
    return {
      texture,
      borders: {
        left: TEMPORARY_BACKGROUND_SLICE,
        top: TEMPORARY_BACKGROUND_SLICE,
        right: TEMPORARY_BACKGROUND_SLICE,
        bottom: TEMPORARY_BACKGROUND_SLICE,
      },
    };
  }

  private layout(): void {
    if (!this.application || !this.dropdown) {
      return;
    }

    const screen = this.application.screen;
    this.dropdown.x = Math.max(16, (screen.width - this.dropdown.width) / 2);
    this.dropdown.y = Math.max(16, (screen.height - this.dropdown.height) / 2);
  }

  private readonly handleResize = (): void => {
    if (!this.application) {
      return;
    }

    this.application.renderer.resize(window.innerWidth, window.innerHeight);
    this.layout();
  };
}
