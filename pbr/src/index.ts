import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { TriangleGeometry } from './geometries/triangle';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PonctualLightsShader } from './shader/ponctual-lights-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';
import { PointLight } from './lights/lights';
import { Transform } from './transform';
import { IBLShader } from './shader/ibl-shader';

interface GUIProperties {
  albedo: number[];
  intensity: number;
  ponctualLights: boolean;
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

  private _IBLShader: IBLShader;
  private _ponctualLightsShader: PonctualLightsShader;

  private _geometry: TriangleGeometry;
  private _uniforms: Record<string, UniformType | Texture>;

  //private _textureExample: Texture2D<HTMLElement> | null;
  private _preComputedIBL: Texture2D<HTMLElement> | null;
  private _diffuseIBL: Texture2D<HTMLElement> | null;
  private _specularIBL: Texture2D<HTMLElement> | null;
  private _lights: [PointLight, PointLight, PointLight, PointLight];

  private _camera: Camera;
  private _sphereRadius: number;
  private _sphereSpacing: number;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    const lightPad = 3;
    const light1 = new PointLight().setPosition(lightPad, lightPad, 4);
    const light2 = new PointLight().setPosition(lightPad, -lightPad, 4);
    const light3 = new PointLight().setPosition(-lightPad, lightPad, 4);
    const light4 = new PointLight().setPosition(-lightPad, -lightPad, 4);
    this._lights = [light1, light2, light3, light4];

    this._sphereSpacing = 1.3;
    this._sphereRadius = 0.5;
    this._geometry = new SphereGeometry(this._sphereRadius, 50, 50);
    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uModel.localToProjection': mat4.create(),
      'uModel.transform': mat4.create()
    };

    /* Shaders */
    this._IBLShader = new IBLShader();
    this._IBLShader.pointLightCount = 4;

    this._ponctualLightsShader = new PonctualLightsShader();
    this._ponctualLightsShader.pointLightCount = 4;

    /* Textures */
    //this._textureExample = null;
    this._diffuseIBL = null;
    this._specularIBL = null;
    this._preComputedIBL = null;

    /* GUI */
    this._guiProperties = {
      albedo: [255, 255, 255],
      intensity: 300,
      ponctualLights: true
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry);
    this._context.compileProgram(this._ponctualLightsShader);
    this._context.compileProgram(this._IBLShader);

    // Example showing how to load a texture and upload it to GPU.
    /*this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );*/
    this._preComputedIBL = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    this._diffuseIBL = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
    );
    this._specularIBL = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-specular-RGBM.png'
    );

    if (this._preComputedIBL !== null) {
      this._context.uploadTexture(this._preComputedIBL);
      this._uniforms.uPreComputedIBL = this._preComputedIBL;
    }

    if (this._diffuseIBL !== null) {
      this._context.uploadTexture(this._diffuseIBL);
      this._uniforms.uDiffuseIBL = this._diffuseIBL;
    }

    if (this._specularIBL !== null) {
      this._context.uploadTexture(this._specularIBL);
      this._uniforms.uSpecularIBL = this._specularIBL;
    }

    // You can then use it directly as a uniform:
    // ```uniforms.myTexture = this._textureExample;```

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
    vec3.set(camera.transform.position, 0.0, 0.0, 10.0);
    camera.setParameters(aspect);
    camera.update();

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    for (let i = 0; i < this._lights.length; i++) {
      this._uniforms[`uLights[${i}].intensity`] = props.intensity;
      /*this._uniforms[`uLights[${i}].position`] = vec3.fromValues(
        props.lightOffsetX,
        props.lightOffsetY,
        props.lightOffsetZ
      );*/
    }

    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    this._uniforms['uModel.localToProjection'] = camera.localToProjection;

    // Camera uniforms
    this._uniforms['uCamera.position'] = camera.transform.position;
    this._uniforms['uCamera.rotation'] = camera.transform.rotation;
    this._uniforms['uCamera.projection'] = camera.projection;

    // Spheres rendering
    let model = new Transform();
    for (let y = 0; y < 5; ++y) {
      this._uniforms['uMaterial.metallic'] = y / 5.0;

      for (let x = 0; x < 5; ++x) {
        let clamped = x / 5.0 < 0.05 ? 0.05 : x / 5.0;

        this._uniforms['uMaterial.roughness'] = clamped;
        model.position = vec3.fromValues(
          (x - 5 / 2) * this._sphereSpacing + 1,
          (y - 5 / 2) * this._sphereSpacing + 0.8,
          0
        );

        this._uniforms['uModel.transform'] = model.combine();
        this._context.draw(
          this._geometry,
          props.ponctualLights ? this._ponctualLightsShader : this._IBLShader,
          this._uniforms
        );
      }
    }
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
    gui.add(this._guiProperties, 'intensity', 0, 400);
    gui.add(this._guiProperties, 'ponctualLights');
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
