import { Clock, Color, WebGLRenderer } from 'three';
import { Example } from './example';

// @ts-ignore
const modules = import.meta.glob('./*-example.ts');

/**
 * Extracts the modules found in `modules`, and instanciate
 * each example
 *
 * @param renderer - The renderer used to instanciate each example
 *
 * @return An array of example
 */
async function loadExamples(renderer: WebGLRenderer): Promise<Example[]> {
  const promises = [];
  for (const path in modules) {
    const name = path.split('/').pop()?.replace('.ts', '');
    const p = modules[path]().then((mod: any) => {
      const example = new mod.default(renderer);
      example['_name'] = name;
      return example;
    })
    promises.push(p);
  }
  return Promise.all(promises);
}

/**
 * Switch from example `previous` to `next`. This function will call
 * the lifecycle methods `destroy()` and `initialize()`
 *
 * @param next - Next example to run
 * @param previous - Previous example to destroy, if any
 */
function switchExample(next: Example, previous?: Example | null): void {
  next.initialize();
  next.resize(canvas.width, canvas.height);
  if (previous) {
    previous.destroy();
  }

  const title = document.getElementById('title');
  if (title) {
    // Not optimized to look it up each time, but I am lazy :)
    title.innerText = next.name;
  }
}

/**
 * Renderer Initialization.
 */

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(new Color('#464646'));

/**
 * Examples Initialization.
 */

const examples = await loadExamples(renderer);
const params = new URLSearchParams(window.location.search);
const exampleId = params.get('tp') ?? params.get('example') ?? 'texture-example';
let exampleIndex = examples.findIndex((e) => e.name === exampleId);
exampleIndex = exampleIndex === -1 ? 0 : exampleIndex;

/**
 * UI Initialization.
 */

const previousButton = document.getElementById('previous');
const nextButton = document.getElementById('next');
if (previousButton) {
  previousButton.addEventListener('click', () => {
    const previous = examples[exampleIndex];
    exampleIndex = (exampleIndex - 1);
    if (exampleIndex < 0) { exampleIndex = examples.length -1; }
    const example = examples[exampleIndex];
    switchExample(example, previous);
  });
}
if (nextButton) {
  nextButton.addEventListener('click', () => {
    const previous = examples[exampleIndex];
    exampleIndex = (exampleIndex + 1) % examples.length;
    switchExample(examples[exampleIndex], previous);
  });
}

/**
 * Lifecycle: Initialization.
 */

const clock = new Clock();

switchExample(examples[exampleIndex]);

/**
 * Lifecycle: Update & Render.
 */

function animate() {
  const example = examples[exampleIndex];
  if (example) {
    example.update(clock.getDelta(), clock.getElapsedTime());
    example.render();
  }
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Lifecycle: Resize.
 */

const resizeObserver = new ResizeObserver(entries => {
  const example = examples[exampleIndex];
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    renderer.setSize(canvas.width, canvas.height, false);
    if (example) {
      example.resize(canvas.width, canvas.height);
    }
  }
});

resizeObserver.observe(canvas);
