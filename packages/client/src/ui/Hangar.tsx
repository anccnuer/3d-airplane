import { ArrowLeft, Check, Clock3, Users } from 'lucide-react';
import { PLANES, getPlane, type RoomInfo } from '@classroom-arena/shared';
import { PlanePreview } from '../components/PlanePreview';
import { Button } from '../components/ui/button';
import { CodeChip } from '../components/ui/codeChip';
import { Panel } from '../components/ui/panel';
import { PlaneCard } from '../components/ui/planeCard';
import { SectionHeader } from '../components/ui/sectionHeader';
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
    <div className="relative min-h-screen overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-shell/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6">
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <ArrowLeft size={16} aria-hidden="true" />
            返回大厅
          </Button>
          <div className="flex items-center gap-3">
            {room ? <CodeChip code={room.code} label="ROOM" /> : null}
            <span className="rounded-lg border border-line bg-surface-inset px-3 py-1.5 font-mono text-xs text-ink-muted">
              <Clock3 size={13} className="mr-1.5 inline" aria-hidden="true" />
              {seconds > 0 ? `${seconds} 秒后起飞` : allReady ? '准备完成' : '等待准备'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1320px] flex-col gap-5 px-6 pb-10 pt-24 lg:flex-row">
        <Panel index="MODEL" className="w-full animate-fade-up lg:w-[380px]">
          <SectionHeader index="01" label="机型选择" />
          <div className="mt-5 flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
            {PLANES.map((option) => (
              <PlaneCard
                key={option.id}
                plane={option}
                active={option.id === selectedPlaneId}
                onSelect={() => onSelectPlane(option.id)}
              />
            ))}
          </div>
        </Panel>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Panel index="VIEW" className="animate-fade-up [animation-delay:60ms]">
            <SectionHeader index="02" label="当前机体" title={plane.name} />
            <p className="mt-2 text-sm text-ink-muted">{plane.role}</p>
            <p className="mt-1 text-xs leading-5 text-ink-dim">{plane.description}</p>

            <div className="instrument-grid mt-4 overflow-hidden rounded-xl border border-line bg-surface-inset/60">
              <div className="h-[280px]">
                <PlanePreview planeId={selectedPlaneId} color={plane.color} />
              </div>
            </div>

            <div className="instrument-grid mt-4 rounded-xl border border-line bg-surface-inset/60 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-title text-sm font-semibold tracking-wide text-ink">统一性能标定</span>
                <span className="font-mono text-xs text-ink-dim">ALL MODELS</span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                五种机型仅外形与配色不同，飞行、生命与火力完全一致。
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-ink">
                <span>极速 {plane.maxSpeed}</span>
                <span>加速 {plane.acceleration}</span>
                <span>转向 {plane.turnRate}</span>
                <span>生命 {plane.hp}</span>
                <span>火力 {plane.damage}×{plane.fireRate}/s</span>
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

            <Button size="lg" className="mt-4 w-full" disabled={room?.state !== 'lobby'} onClick={() => onReady(!local?.ready)}>
              {local?.ready ? <Check size={18} aria-hidden="true" /> : null}
              {local?.ready ? '取消准备' : '准备起飞'}
            </Button>
          </Panel>
        </div>

        <Panel index="PILOTS" className="w-full animate-fade-up [animation-delay:120ms] lg:w-[320px]">
          <SectionHeader index="03" label="飞行员" />
          <div className="mt-5 flex flex-col gap-3">
            {(room?.players ?? []).map((player) => (
              <div key={player.id} className="glass-card flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{player.name}</p>
                  <p className="mt-0.5 block truncate text-xs text-ink-muted">
                    {getPlane(player.planeId).name}
                    {player.connected ? '' : ' · 断线重连中'}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold',
                    player.ready
                      ? 'bg-success/15 text-success'
                      : 'bg-surface-inset text-ink-muted'
                  )}
                >
                  {player.ready ? '已准备' : '待命'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-ink-dim">
            <Users size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>至少 2 人全部准备后进入 3 秒倒计时。对局时长 180 秒，击坠得 100 分。</span>
          </div>
        </Panel>
      </main>
    </div>
  );
}
