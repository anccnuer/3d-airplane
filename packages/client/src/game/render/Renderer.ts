import * as THREE from 'three';

class SharedRenderer {
  private renderer: THREE.WebGLRenderer | null = null;

  acquire(): THREE.WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    return this.renderer;
  }

  attach(container: HTMLElement): void {
    const renderer = this.acquire();
    if (renderer.domElement.parentElement !== container) {
      container.appendChild(renderer.domElement);
    }
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    this.resize(container.clientWidth, container.clientHeight);
  }

  resize(width: number, height: number): void {
    this.renderer?.setSize(Math.max(width, 1), Math.max(height, 1), false);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer?.render(scene, camera);
  }

  detach(container: HTMLElement): void {
    const canvas = this.renderer?.domElement;
    if (canvas && canvas.parentElement === container) canvas.remove();
  }
}

export const sharedRenderer = new SharedRenderer();
