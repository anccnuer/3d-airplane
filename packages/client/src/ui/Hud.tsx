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
    <div className="pointer-events-none fixed inset-0 z-20 select-none text-slate-100">
      {hitFlash ? (
        <div className="absolute inset-0 border-[6px] border-rose-500/40 bg-rose-500/10" aria-hidden="true" />
      ) : null}

      <section className="hud-panel absolute left-6 top-20 w-[290px] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <HeartPulse size={15} className="text-rose-300" aria-hidden="true" />
            机体状态
          </span>
          <span className="font-mono text-sm text-white">
            {hud.hp} / {hud.maxHp}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-200',
              hpRatio > 0.5 ? 'bg-emerald-400' : hpRatio > 0.25 ? 'bg-amber-400' : 'bg-rose-500'
            )}
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
            <Gauge size={14} className="text-cyan-300" aria-hidden="true" />
            <span className="text-slate-400">速度</span>
            <span className="ml-auto font-mono text-white">{hud.speed}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
            <Mountain size={14} className="text-amber-300" aria-hidden="true" />
            <span className="text-slate-400">高度</span>
            <span className="ml-auto font-mono text-white">{hud.altitude}</span>
          </div>
        </div>
        {hud.invulnerable ? (
          <p className="mt-3 text-xs text-emerald-300">重新入场保护中</p>
        ) : null}
      </section>

      <section className="hud-panel absolute left-1/2 top-20 flex -translate-x-1/2 items-center gap-6 rounded-xl px-6 py-3">
        <div className="text-center">
          <p className="label-caps !text-slate-500">剩余时间</p>
          <p className="font-mono text-xl font-bold text-white">{formatTime(hud.timeLeft)}</p>
        </div>
        <div className="h-8 w-px bg-white/10" aria-hidden="true" />
        <div className="text-center">
          <p className="label-caps !text-slate-500">击坠</p>
          <p className="font-mono text-xl font-bold text-amber-300">{hud.kills}</p>
        </div>
        <div className="h-8 w-px bg-white/10" aria-hidden="true" />
        <div className="text-center">
          <p className="label-caps !text-slate-500">积分</p>
          <p className="font-mono text-xl font-bold text-cyan-300">{hud.score}</p>
        </div>
      </section>

      <section className="absolute right-6 top-20 flex w-[280px] flex-col gap-2">
        {killFeed.slice(0, 5).map((message, index) => (
          <div
            key={`${message}-${index}`}
            className="hud-panel animate-fade-up rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <Target size={12} className="mr-2 inline text-amber-300" aria-hidden="true" />
            {message}
          </div>
        ))}
      </section>

      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-cyan-300/80"
          style={{ transform: `translate(-50%, -50%) scaleY(${1 + spread / 30})` }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 bg-cyan-300/80"
          style={{ transform: `translate(-50%, -50%) scaleX(${1 + spread / 30})` }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200" />
        <Crosshair size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70" />
      </div>

      <section className="hud-panel absolute bottom-6 left-6 rounded-xl p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
          <Radar size={14} className="text-cyan-300" aria-hidden="true" />
          教室雷达
        </div>
        <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="rounded-lg bg-[#08111F]" aria-label="教室雷达">
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0B1726" />
          {desks.map((desk, index) => (
            <rect
              key={index}
              x={desk.x}
              y={desk.y}
              width={desk.width}
              height={desk.height}
              rx={1}
              fill="#9A6B46"
              opacity={0.75}
            />
          ))}
          <rect x={0} y={0} width={MAP_WIDTH} height={5} fill="#166534" />
          {radarPlayers.map((player) => (
            <circle
              key={player.id}
              cx={mapX(player.x)}
              cy={mapZ(player.z)}
              r={player.alive ? 4 : 2}
              fill={player.alive ? player.color : '#64748B'}
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          ))}
        </svg>
      </section>

      <section className="hud-panel absolute bottom-6 right-6 rounded-xl px-4 py-3 text-xs leading-6 text-slate-400">
        <p><span className="font-mono text-white">W/S</span> 油门　<span className="font-mono text-white">Q/E</span> 滚转</p>
        <p><span className="font-mono text-white">鼠标</span> 转向/俯仰　<span className="font-mono text-white">左键</span> 开火</p>
        <p><span className="font-mono text-white">Esc</span> 释放鼠标</p>
      </section>

      {hud.parked && hud.alive ? (
        <div className="absolute left-1/2 top-[calc(50%+58px)] -translate-x-1/2 rounded-full border border-amber-300/40 bg-[#0B1220]/80 px-5 py-2 text-sm font-semibold text-amber-200 shadow-lg backdrop-blur-sm">
          按 <span className="font-mono text-white">W</span> 起飞
        </div>
      ) : null}

      {!hud.alive ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050A14]/55 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl px-10 py-8 text-center">
            <p className="label-caps !text-rose-300">机体损毁</p>
            <p className="mt-2 text-5xl font-bold text-white">{hud.respawnIn.toFixed(1)}</p>
            <p className="mt-2 text-sm text-slate-400">秒后重新入场</p>
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
