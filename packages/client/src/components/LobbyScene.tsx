import { useEffect, useRef } from 'react';
import { LobbyScene as LobbySceneRenderer } from '../game/scene/lobbyScene';

/**
 * 大厅的实时 3D 背景：由 App 在非对局屏幕外层挂载一次，
 * 菜单 / 机库 / 结算共用，切换屏幕时不重建渲染上下文。
 */
export function LobbyScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new LobbySceneRenderer(host);
    scene.start();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      scene.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      scene.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="lobby-scrim absolute inset-0" />
    </div>
  );
}
