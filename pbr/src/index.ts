import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { TriangleGeometry } from './geometries/triangle';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';
import { PointLight } from './lights/lights';

interface GUIProperties {
  albedo: number[];
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _geometry: TriangleGeometry;
  private _uniforms: Record<string, UniformType | Texture>;

  private _textureExample: Texture2D<HTMLElement> | null;
  private _lights: [PointLight, PointLight, PointLight, PointLight];

  private _camera: Camera;
  private _sphereRadius: number;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    const lightPad = 1;
    const intensity = 0.7;

    const light1 = new PointLight().setPosition(lightPad, lightPad, 3);
    const light2 = new PointLight().setPosition(lightPad, -lightPad, 3);
    const light3 = new PointLight().setPosition(-lightPad, lightPad, 3);
    const light4 = new PointLight().setPosition(-lightPad, -lightPad, 3);
    this._lights = [light1, light2, light3, light4];

    for (const light of this._lights) {
      light.setIntensity(intensity);
    }

    this._sphereRadius = 0.5;
    this._geometry = new SphereGeometry(this._sphereRadius, 50, 50);
    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uModel.localToProjection': mat4.create(),
      'uModel.transform': mat4.create()
    };

    this._shader = new PBRShader();
    this._shader.pointLightCount = 4;
    this._textureExample = null;

    this._guiProperties = {
      albedo: [255, 255, 255]
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry);
    this._context.compileProgram(this._shader);

    // Example showing how to load a texture and upload it to GPU.
    this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._textureExample !== null) {
      this._context.uploadTexture(this._textureExample);
      // You can then use it directly as a uniform:
      // ```uniforms.myTexture = this._textureExample;```
    }

    // Lights
    for (let i = 0; i < this._lights.length; i++) {
      const light = this._lights[i];
      this._uniforms[`uLights[${i}].position`] = light.positionWS;
      this._uniforms[`uLights[${i}].color`] = light.color;
      this._uniforms[`uLights[${i}].intensity`] = light.intensity;
    }
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this._context.gl.drawingBufferWidth /
      this._context.gl.drawingBufferHeight;

    const camera = this._camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 15.0);
    camera.setParameters(aspect);
    camera.update();

    this._uniforms['uCamera.position'] = camera.transform.position;
    this._uniforms['uCamera.rotation'] = camera.transform.rotation;

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );
    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    mat4.copy(
      this._uniforms['uModel.localToProjection'] as mat4,
      camera.localToProjection
    );

    // Draws the triangle.
    //this._context.draw(this._geometry, this._shader, this._uniforms);

    for (let i = 0; i < 10; i++) {
      camera.transform.position[0] = Math.sin(i * 0.1) * 5;
      camera.update();
      this._context.draw(this._geometry, this._shader, this._uniforms);
    }

    // Draws the spheres
    /*
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        this._uniforms['uSphere.position'] = vec3.fromValues(
          row * (this._sphereRadius * 10),
          col * (this._sphereRadius * 10),
          0
        );
        //console.log(this._uniforms['uSphere.position']);

        this._context.draw(this._geometry, this._shader, this._uniforms);
      }
    }
    */
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
