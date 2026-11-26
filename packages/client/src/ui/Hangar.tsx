import type { ReactNode } from 'react';
import { ArrowLeft, Check, Clock3, Gauge, Plane, Shield, Users, Zap } from 'lucide-react';
import { PLANES, getPlane, type RoomInfo } from '@classroom-arena/shared';
import { PlanePreview } from '../components/PlanePreview';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

interface HangarProps {
  room: RoomInfo | null;
  playerId: string;
  selectedPlaneId: string;
  error: string | null;
  onSelectPlane: (planeId: string) => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
}

function StatBar({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-20 items-center gap-1.5 text-xs text-slate-400">{icon}{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-300"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs text-slate-300">{Math.round(value * 100)}</span>
    </div>
  );
}

export function Hangar({
  room,
  playerId,
  selectedPlaneId,
  error,
  onSelectPlane,
  onReady,
  onLeave
}: HangarProps) {
  const plane = getPlane(selectedPlaneId);
  const local = room?.players.find((player) => player.id === playerId);
  const connectedPlayers = room?.players.filter((player) => player.connected) ?? [];
  const allReady = connectedPlayers.length >= 2 && connectedPlayers.every((player) => player.ready);
  const seconds = room?.startsAt ? Math.max(0, Math.ceil((room.startsAt - Date.now()) / 1000)) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1220]">
      <div className="arena-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-white/10 bg-[#0B1220]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <Button variant="ghost" onClick={onLeave}>
            <ArrowLeft size={16} aria-hidden="true" />
            返回大厅
          </Button>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 font-mono text-cyan-200">
              {room?.code ?? '-----'}
            </span>
            <span>{room?.name ?? '等待房间信息'}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col gap-5 px-6 pb-10 pt-24 lg:flex-row">
        <section className="glass-panel w-full rounded-2xl p-5 lg:w-[360px]">
          <div className="flex items-center gap-2 text-cyan-300">
            <Plane size={18} aria-hidden="true" />
            <span className="label-caps !text-cyan-300">选择机型</span>
          </div>
          <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
            {PLANES.map((option) => {
              const active = option.id === selectedPlaneId;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={room?.state !== 'lobby'}
                  onClick={() => onSelectPlane(option.id)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 text-left transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    active
                      ? 'border-cyan-300/60 bg-cyan-400/10 shadow-glow'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{option.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{option.role}</p>
                    </div>
                    <span
                      className="h-3 w-3 rounded-full border-2 border-white/30"
                      style={{ backgroundColor: option.color }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{option.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-panel flex min-h-[420px] flex-1 flex-col rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-caps">当前机体</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{plane.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{plane.description}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
              <Clock3 size={14} className="mr-1 inline" aria-hidden="true" />
              {seconds > 0 ? `${seconds} 秒后起飞` : allReady ? '准备完成' : '等待准备'}
            </div>
          </div>

          <div className="min-h-[220px] flex-1">
            <PlanePreview planeId={selectedPlaneId} color={plane.color} />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <StatBar label="速度" value={plane.maxSpeed / 22} icon={<Gauge size={14} aria-hidden="true" />} />
            <StatBar label="转向" value={Math.min(1, plane.turnRate / 2.5)} icon={<Plane size={14} aria-hidden="true" />} />
            <StatBar label="生命" value={plane.hp / 140} icon={<Shield size={14} aria-hidden="true" />} />
            <StatBar label="火力" value={(plane.damage * plane.fireRate) / 110} icon={<Zap size={14} aria-hidden="true" />} />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={room?.state !== 'lobby'}
            onClick={() => onReady(!local?.ready)}
          >
            {local?.ready ? <Check size={18} aria-hidden="true" /> : null}
            {local?.ready ? '取消准备' : '准备起飞'}
          </Button>
        </section>

        <section className="glass-panel w-full rounded-2xl p-5 lg:w-[300px]">
          <div className="flex items-center gap-2 text-cyan-300">
            <Users size={18} aria-hidden="true" />
            <span className="label-caps !text-cyan-300">飞行员</span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {(room?.players ?? []).map((player) => (
              <div key={player.id} className="glass-card flex items-center justify-between rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{player.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getPlane(player.planeId).name}
                    {player.connected ? '' : ' · 断线重连中'}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    player.ready
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-slate-500/15 text-slate-400'
                  )}
                >
                  {player.ready ? '已准备' : '待命'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            至少 2 人全部准备后进入 3 秒倒计时。对局时长 180 秒，击坠得 100 分。
          </p>
        </section>
      </main>
    </div>
  );
}
