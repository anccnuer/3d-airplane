import { useMemo } from 'react';
import { Crosshair, Gauge, HeartPulse, Mountain, Radar, Target } from 'lucide-react';
import { DESK_COLLIDERS, WORLD } from '@classroom-arena/shared';
import type { HudState } from '../game/ThreeGame';
import { cn } from '../lib/utils';

export interface RadarPlayer {
  id: string;
  x: number;
  z: number;
  color: string;
  alive: boolean;
}

interface HudProps {
  hud: HudState;
  killFeed: string[];
  radarPlayers: RadarPlayer[];
  hitFlash: boolean;
}

const MAP_WIDTH = 180;
const MAP_HEIGHT = 140;

function mapX(x: number): number {
  return ((x + WORLD.width / 2) / WORLD.width) * MAP_WIDTH;
}

function mapZ(z: number): number {
  return ((z + WORLD.depth / 2) / WORLD.depth) * MAP_HEIGHT;
}

export function Hud({ hud, killFeed, radarPlayers, hitFlash }: HudProps) {
  const desks = useMemo(
    () =>
      DESK_COLLIDERS.map((desk) => ({
        x: mapX(desk.min[0]),
        y: mapZ(desk.min[2]),
        width: ((desk.max[0] - desk.min[0]) / WORLD.width) * MAP_WIDTH,
        height: ((desk.max[2] - desk.min[2]) / WORLD.depth) * MAP_HEIGHT
      })),
    []
  );

  const hpRatio = Math.max(0, Math.min(1, hud.hp / Math.max(1, hud.maxHp)));
  const spread = Math.min(18, 6 + hud.speed / 18);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none text-ink">
      {hitFlash ? (
        <div className="absolute inset-0 border-[6px] border-danger/40 bg-danger/10" aria-hidden="true" />
      ) : null}

      <section className="hud-panel absolute left-6 top-20 w-[290px] rounded-[13px_9px_14px_8px] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <HeartPulse size={15} className="text-danger" aria-hidden="true" />
            机体状态
          </span>
          <span className="font-mono text-sm text-ink">
            {hud.hp} / {hud.maxHp}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-inset">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-200',
              hpRatio > 0.5 ? 'bg-success' : hpRatio > 0.25 ? 'bg-accent' : 'bg-danger'
            )}
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-surface-inset p-2">
            <Gauge size={14} className="text-sky" aria-hidden="true" />
            <span className="text-ink-muted">速度</span>
            <span className="ml-auto font-mono text-ink">{hud.speed}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface-inset p-2">
            <Mountain size={14} className="text-accent" aria-hidden="true" />
            <span className="text-ink-muted">高度</span>
            <span className="ml-auto font-mono text-ink">{hud.altitude}</span>
          </div>
        </div>
        {hud.invulnerable ? <p className="mt-3 text-xs text-success">重新入场保护中</p> : null}
      </section>

      <section className="hud-panel absolute left-1/2 top-20 flex -translate-x-1/2 items-center gap-6 rounded-[13px_9px_14px_8px] px-6 py-3">
        <div className="text-center">
          <p className="label-caps !text-ink-dim">剩余时间</p>
          <p className="font-mono text-xl font-bold text-ink">{formatTime(hud.timeLeft)}</p>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden="true" />
        <div className="text-center">
          <p className="label-caps !text-ink-dim">击坠</p>
          <p className="font-mono text-xl font-bold text-accent">{hud.kills}</p>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden="true" />
        <div className="text-center">
          <p className="label-caps !text-ink-dim">积分</p>
          <p className="font-mono text-xl font-bold text-sky">{hud.score}</p>
        </div>
      </section>

      <section className="absolute right-6 top-20 flex w-[280px] flex-col gap-2">
        {killFeed.slice(0, 5).map((message, index) => (
          <div
            key={`${message}-${index}`}
            className="hud-panel animate-fade-up rounded-[10px_7px_11px_8px] px-3 py-2 text-xs font-medium text-ink"
          >
            <Target size={12} className="mr-2 inline text-accent" aria-hidden="true" />
            {message}
          </div>
        ))}
      </section>

      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-accent/80"
          style={{ transform: `translate(-50%, -50%) scaleY(${1 + spread / 30})` }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 bg-accent/80"
          style={{ transform: `translate(-50%, -50%) scaleX(${1 + spread / 30})` }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/60" />
        <Crosshair size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink/80" />
      </div>

      <section className="hud-panel absolute bottom-6 left-6 rounded-[13px_9px_14px_8px] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
          <Radar size={14} className="text-sky" aria-hidden="true" />
          教室雷达
        </div>
        <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="rounded-[10px_7px_11px_8px] border border-line" aria-label="教室雷达">
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f2e9d6" />
          {desks.map((desk, index) => (
            <rect
              key={index}
              x={desk.x}
              y={desk.y}
              width={desk.width}
              height={desk.height}
              rx={1}
              fill="#c49a6c"
              opacity={0.72}
            />
          ))}
          <rect x={0} y={0} width={MAP_WIDTH} height={5} fill="#5e8566" />
          {radarPlayers.map((player) => (
            <circle
              key={player.id}
              cx={mapX(player.x)}
              cy={mapZ(player.z)}
              r={player.alive ? 4 : 2}
              fill={player.alive ? player.color : '#64748B'}
              stroke="#2f2a24"
              strokeWidth={1}
            />
          ))}
        </svg>
      </section>

      <section className="hud-panel absolute bottom-6 right-6 rounded-[13px_9px_14px_8px] px-4 py-3 text-xs leading-6 text-ink-muted">
        <p><span className="font-mono text-ink">W/S</span> 油门　<span className="font-mono text-ink">Q/E</span> 滚转</p>
        <p><span className="font-mono text-ink">鼠标</span> 转向/俯仰　<span className="font-mono text-ink">左键</span> 开火</p>
        <p><span className="font-mono text-ink">Esc</span> 释放鼠标</p>
      </section>

      {hud.parked && hud.alive ? (
        <div className="absolute left-1/2 top-[calc(50%+58px)] -translate-x-1/2 rounded-[10px_7px_11px_8px] border-2 border-accent bg-surface-raised px-5 py-2 text-sm font-semibold text-accent shadow-[0_3px_0_var(--paper-edge)]">
          按 <span className="font-mono text-ink">W</span> 起飞
        </div>
      ) : null}

      {!hud.alive ? (
        <div className="absolute inset-0 flex items-center justify-center bg-shell/55 backdrop-blur-sm">
          <div className="hud-panel rounded-[15px_11px_16px_9px] px-10 py-8 text-center">
            <p className="label-caps !text-danger">机体损毁</p>
            <p className="mt-2 font-mono text-5xl font-bold text-ink">{hud.respawnIn.toFixed(1)}</p>
            <p className="mt-2 text-sm text-ink-muted">秒后重新入场</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
