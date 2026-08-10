import * as PIXI from 'pixi.js';


export interface DropdownItem {
  label: string;
  disabled: boolean;
}

/**
 * Dropdown — a PixiJS Canvas dropdown selector.
 *
 * The constructor receives pre-generated textures so that no image
 * loading is required (textures are created in main.ts via Graphics).
 */
export class Dropdown extends PIXI.Container {
  /** Texture used for the closed-state background / header. */
  private readonly backgroundTexture: PIXI.Texture;

  /** Texture used for each list item row. */
  private readonly buttonTexture: PIXI.Texture;

  /** Whether the dropdown panel is currently open. */
  private isOpen: boolean = false;

  protected togler?: PIXI.Text;

  constructor(backgroundTexture: PIXI.Texture, buttonTexture: PIXI.Texture) {
    super();

    this.backgroundTexture = backgroundTexture;
    this.buttonTexture = buttonTexture;

    this.createElement();

    // TODO: Add GSAP animations for open/close
    //   - On open:  animate the list container scaleY from 0 → 1 and fade in
    //     (alpha 0 → 1) using gsap.to() with an appropriate ease (e.g. power2.out).
    //   - On close: reverse the animation, then set visible = false on complete.
    //   - Consider staggering individual item entrances with gsap.from() + stagger.
  }

  private createElement(): void {
    this.createHeader();

    // TODO: Implement Factory pattern for items
    //   - Create a DropdownItemFactory (or static factory method) that
    //     produces item display objects from a DropdownItem descriptor.
    //   - Each item should know whether it is disabled and render accordingly
    //     (e.g. reduced alpha, non-interactive cursor, different tint).
  }

  private createHeader (){ 
    const header = new PIXI.Sprite(this.backgroundTexture);
    
    header.eventMode = 'static';
    header.cursor = 'pointer';

    const label = new PIXI.Text('Select an option', {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0x000000,
    });

    label.x = 12;
    label.y = (header.height - label.height) / 2;


    this.togler = new PIXI.Text("▾", {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0x000000,
    })

    this.togler.x = 230;
    this.togler.y = 15;

    header.on('pointerdown', () => this._toggle());

    this.addChild(header, label, this.togler);
  }

  /** Toggles the open/closed state of the dropdown. */
  private _toggle(): void {
    this.isOpen = !this.isOpen;

    // TODO: Trigger GSAP open/close animation here
    //   Call this._open() or this._close() depending on this.isOpen.
  }


  /**
   * Opens the dropdown list panel.
   * TODO: Implement — show item list, play open animation.
   */
  public open(): void {
    // TODO: implement
  }

  /**
   * Closes the dropdown list panel.
   * TODO: Implement — play close animation, then hide item list.
   */
  public close(): void {
    // TODO: implement
  }

  /**
   * Returns the label of the currently selected item, or null if nothing
   * has been selected yet.
   * TODO: Track selected state and return the correct value.
   */
  public getSelectedLabel(): string | null {
    // TODO: implement
    return null;
  }

  public destroy (...config: Parameters<PIXI.Container['destroy']>) {
    // TODO: Clearing

    return super.destroy(...config);
  }
}
