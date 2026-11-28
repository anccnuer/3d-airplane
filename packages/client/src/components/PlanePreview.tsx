import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PLANE_SCALE } from '@classroom-arena/shared';
import { disposeObject3D } from '../game/scene/disposal';
import { createPlaneMesh, getPlanePropellers } from '../game/scene/planeFactory';

interface PlanePreviewProps {
  planeId: string;
  color?: string;
}

export function PlanePreview({ planeId, color }: PlanePreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(4.8, 2.4, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 2.2));
    const keyLight = new THREE.DirectionalLight('#f8fafc', 2.4);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#94a3b8', 0.6);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    const plane = createPlaneMesh(planeId, color);
    plane.scale.setScalar(1 / PLANE_SCALE);
    scene.add(plane);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (reducedMotion) renderer.render(scene, camera);
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
      for (const propeller of getPlanePropellers(plane)) propeller.rotation.z += 0.24;
      renderer.render(scene, camera);
    };
    if (!reducedMotion) animate();

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
