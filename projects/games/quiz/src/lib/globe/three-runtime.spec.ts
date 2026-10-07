import { describe, it, expect, vi, afterEach } from 'vitest';
const mocks = vi.hoisted(() => ({
  pixelRatio: vi.fn(),
  dispose: vi.fn(),
  lose: vi.fn(),
  lost: vi.fn(() => false),
  rendererOptions: vi.fn(),
}));
vi.mock('three', () => ({
  WebGLRenderer: class {
    domElement = document.createElement('canvas');
    constructor(options: unknown) {
      mocks.rendererOptions(options);
    }
    setPixelRatio = mocks.pixelRatio;
    dispose = mocks.dispose;
    forceContextLoss = mocks.lose;
    getContext() {
      return { isContextLost: mocks.lost };
    }
  },
}));
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor(..._args: unknown[]) {}
    enablePan = true;
    enableDamping = true;
    autoRotate = true;
    enableZoom = true;
    minDistance = 0;
    maxDistance = Infinity;
  },
}));
import {
  createGlobeRenderer,
  createGlobeControls,
  disposeGlobeRenderer,
  createGlobeFrameLoop,
} from './three-runtime';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('shared Three runtime', () => {
  it('caps both renderer variants and releases a context once', () => {
    vi.stubGlobal('devicePixelRatio', 3);
    const host = document.createElement('div');
    const renderer = createGlobeRenderer(host, { alpha: true });
    expect(mocks.pixelRatio).toHaveBeenCalledWith(1.5);
    expect(mocks.rendererOptions).toHaveBeenCalledWith({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    disposeGlobeRenderer(renderer);
    disposeGlobeRenderer(renderer);
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.lose).toHaveBeenCalledOnce();
    expect(host.children).toHaveLength(0);
  });
  it('keeps lost contexts and disables autonomous motion for both views', () => {
    mocks.lost.mockReturnValueOnce(true);
    disposeGlobeRenderer(createGlobeRenderer(document.createElement('div'), { alpha: false }));
    expect(mocks.lose).not.toHaveBeenCalled();
    const controls = createGlobeControls({} as never, document.createElement('canvas'), {
      minDistance: 1.7,
      maxDistance: 6,
      wheelZoom: false,
    });
    expect(controls.enableDamping).toBe(false);
    expect(controls.autoRotate).toBe(false);
    expect(controls.enablePan).toBe(false);
    expect(controls.enableZoom).toBe(false);
    expect(controls.minDistance).toBe(1.7);
  });
  it('coalesces frames, pauses offscreen, and disconnects on disposal', () => {
    let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
    let callback: FrameRequestCallback = () => {};
    const raf = vi.fn((f: FrameRequestCallback) => {
      callback = f;
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const draw = vi.fn(),
      loop = createGlobeFrameLoop(document.createElement('div'), draw);
    loop.invalidate();
    loop.invalidate();
    expect(raf).toHaveBeenCalledOnce();
    callback(0);
    expect(draw).toHaveBeenCalledOnce();
    intersect([{ isIntersecting: false }]);
    loop.invalidate();
    expect(raf).toHaveBeenCalledOnce();
    intersect([{ isIntersecting: true }]);
    expect(raf).toHaveBeenCalledTimes(2);
    loop.dispose();
    callback(0);
    expect(draw).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
