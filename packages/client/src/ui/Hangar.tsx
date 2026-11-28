import { ArrowLeft, Check, Clock3, Users } from 'lucide-react';
import { PLANES, getPlane, type RoomInfo } from '@classroom-arena/shared';
import { PlanePreview } from '../components/PlanePreview';
import { Button } from '../components/ui/button';
import { CodeChip } from '../components/ui/codeChip';
import { Panel } from '../components/ui/panel';
import { PlaneCard } from '../components/ui/planeCard';
import { SectionHeader } from '../components/ui/sectionHeader';
import { StatBar } from '../components/ui/statBar';
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
      <header className="fixed inset-x-0 top-0 z-30 border-b-2 border-[#8f704c]/40 bg-[#f6ecd7]/95 shadow-[0_3px_0_rgba(74,60,46,0.18)] backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6">
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <ArrowLeft size={16} aria-hidden="true" />
            返回大厅
          </Button>
          <div className="flex items-center gap-3">
            {room ? <CodeChip code={room.code} label="ROOM" /> : null}
            <span className="rounded-[9px_6px_10px_7px] border border-line-strong bg-surface-raised px-3 py-1.5 font-mono text-xs font-semibold text-ink-muted">
              <Clock3 size={13} className="mr-1.5 inline" aria-hidden="true" />
              {seconds > 0 ? `${seconds} 秒后起飞` : allReady ? '准备完成' : '等待准备'}
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto flex min-h-screen max-w-[1320px] flex-col gap-5 px-6 pb-10 pt-24 lg:flex-row">
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
            <p className="mt-2 text-sm font-semibold text-ink-muted">{plane.role}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{plane.description}</p>

            <div
              className="instrument-grid mt-4 overflow-hidden rounded-[13px_9px_14px_8px] border-2 border-line-strong"
              role="img"
              aria-label={`${plane.name} 的三维模型预览`}
            >
              <div className="h-[280px]">
                <PlanePreview planeId={selectedPlaneId} color={plane.color} />
              </div>
            </div>

            <div className="mt-4 rounded-[13px_9px_14px_8px] border-2 border-line-strong bg-surface-raised p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-title text-sm font-semibold tracking-wide text-ink">统一性能标定</span>
                <span className="font-mono text-xs text-ink-muted">ALL MODELS</span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">五种机型仅外形与配色不同，飞行、生命与火力完全一致。</p>
              <div className="mt-3 flex flex-col gap-2">
                <StatBar label="极速" value={plane.maxSpeed / 20} display={String(plane.maxSpeed)} tone="sky" />
                <StatBar label="加速" value={plane.acceleration / 15} display={String(plane.acceleration)} tone="success" />
                <StatBar label="转向" value={plane.turnRate / 3.5} display={String(plane.turnRate)} tone="violet" />
                <StatBar label="生命" value={plane.hp / 100} display={String(plane.hp)} tone="accent" />
              </div>
              <p className="mt-3 font-mono text-xs text-ink-muted">火力 {plane.damage}×{plane.fireRate}/s</p>
            </div>

            {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}

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
                    'shrink-0 rounded-[8px_6px_9px_5px] border px-2.5 py-1 font-mono text-[11px] font-semibold',
                    player.ready
                      ? 'border-success/50 bg-success/15 text-success'
                      : 'border-line bg-surface-inset text-ink-muted'
                  )}
                >
                  {player.ready ? '已准备' : '待命'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-ink-muted">
            <Users size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>至少 2 人全部准备后进入 3 秒倒计时。对局时长 180 秒，击坠得 100 分。</span>
          </div>
        </Panel>
      </main>
    </div>
  );
}
