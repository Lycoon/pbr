import { GUI } from 'dat.gui';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
} from 'three';

/**
 * An example constaints its own scene and camera.
 *
 * This is used to create different assignment / experience.\
 *
 * Later, we can cycle through all our examples in a small
 * application.
 */
export class Example {

  /**
   * Renderer used to render this example. This is obtained
   * on instanciation.
   *
   * @hidden
   */
  protected _renderer: WebGLRenderer;

  /**
   * Scene to use for this example
   *
   * @hidden
   */
  protected _scene: Scene;

  /**
   * Camera to use for this example
   *
   * @hidden
   */
  protected _cam: PerspectiveCamera;

  /**
   * GUI of this example. Please have a look at what dat.gui
   * is and how to use it. It's really useful to create quickly
   * UI for testing purposes
   *
   * @hidden
   */
  protected _gui: GUI;

  private readonly _name: string;

  constructor(renderer: WebGLRenderer) {
    this._renderer = renderer;
    this._scene = new Scene();
    this._cam = new PerspectiveCamera(45);
    this._cam.position.set(0, 0.25, 1.75);

    this._gui = new GUI();
    this._gui.hide();

    this._name = '';
  }

  /**
   * Called when the example is initialized.
   *
   * This is called each time you switch example
   */
  public initialize() {
    this._gui.show();
  }

  /**
   * Called when the example is getting destroyed.
   *
   * This is called each time you switch example
   */
  public destroy() {
    this._gui.hide();
  }

  /**
   * Called every animation frame, ~60 times a second.
   *
   * This method is called before `render()`
   */
  public update(delta: number, elapsed: number) {
    // Empty.
  }

  /**
   * Called every animation frame, ~60 times a second.
   *
   * This method is called after `update()`
   */
  public render() {
    this._renderer.render(this._scene, this._cam);
  }

  /**
   * Called each time the canvas is resized
   */
  public resize(w: number, h: number) {
    this._cam.aspect = w / h;
    this._cam.updateProjectionMatrix();
  }

  public get name() {
    return this._name;
  }

}
