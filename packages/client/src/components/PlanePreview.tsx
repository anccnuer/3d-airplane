import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PLANE_SCALE } from '@classroom-arena/shared';
import { createPlaneMesh } from '../game/scene/planeFactory';
import { disposeObject3D } from '../game/scene/disposal';

interface PlanePreviewProps {
  planeId: string;
  color?: string;
}

export function PlanePreview({ planeId, color }: PlanePreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(5.8, 3.2, 7.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 2.2));
    const keyLight = new THREE.DirectionalLight('#f8fafc', 2.4);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const plane = createPlaneMesh(planeId, color);
    plane.scale.setScalar(1 / PLANE_SCALE);
    scene.add(plane);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId = 0;
    let lastFrameTime = performance.now();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const frameTime = performance.now();
      plane.rotation.y += Math.min((frameTime - lastFrameTime) / 1000, 0.05) * 0.5;
      lastFrameTime = frameTime;
      const propellers = plane.userData.propellers ?? (plane.userData.propeller ? [plane.userData.propeller] : []);
      for (const propeller of propellers) propeller.rotation.z += 0.24;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      scene.remove(plane);
      disposeObject3D(plane);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [planeId, color]);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
