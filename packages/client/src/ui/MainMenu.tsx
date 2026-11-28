import { useState } from 'react';
import { ArrowRight, AlertTriangle, Plane } from 'lucide-react';
import { PLANES, type RoomSummary } from '@classroom-arena/shared';
import { Button } from '../components/ui/button';
import { CodeChip } from '../components/ui/codeChip';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { SectionHeader } from '../components/ui/sectionHeader';
import { SignalMeter } from '../components/ui/signalMeter';
import { cn } from '../lib/utils';

export interface CreateRoomPayload {
  name: string;
  roomName: string;
  planeId: string;
}

export interface JoinRoomPayload {
  name: string;
  code: string;
  planeId: string;
}

interface MainMenuProps {
  status: 'connected' | 'connecting' | 'disconnected';
  error: string | null;
  rooms: RoomSummary[];
  onConnect: (url: string) => void;
  onCreate: (payload: CreateRoomPayload) => void;
  onJoin: (payload: JoinRoomPayload) => void;
}

const ROOM_SLOT_COLORS = ['#4d7f8c', '#b76132', '#8b74a8', '#56865f'];

export function MainMenu({ status, error, rooms, onConnect, onCreate, onJoin }: MainMenuProps) {
  const defaultUrl = 'ws://192.167.2.201:60000';

  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [name, setName] = useState('飞行学员');
  const [roomName, setRoomName] = useState('三年二班空域');
  const [code, setCode] = useState('');
  const [planeId, setPlaneId] = useState(PLANES[0].id);

  const connected = status === 'connected';
  const signalStatus = connected ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-30 border-b-2 border-[#8f704c]/40 bg-[#f6ecd7]/95 shadow-[0_3px_0_rgba(74,60,46,0.18)] backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 -rotate-6 items-center justify-center rounded-[11px_8px_12px_7px] border-2 border-[#8f4d2a] bg-accent text-[#fff6e6] shadow-[0_3px_0_var(--paper-edge)]">
              <Plane size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-base font-bold uppercase tracking-[0.1em] text-ink">大家一起打飞机</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">flight journal · 飞行日志</p>
            </div>
          </div>
          <SignalMeter status={signalStatus} />
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto flex min-h-screen max-w-[1240px] flex-col gap-6 px-6 pb-12 pt-24 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-[460px]">
          <Panel index="BRIEF 01" className="animate-fade-up">
            <div className="relative">
              <svg
                className="pointer-events-none absolute -right-2 -top-3 h-16 w-28 text-[#b76132]/45"
                viewBox="0 0 120 64"
                fill="none"
                aria-hidden="true"
              >
                <path d="M8 44c18-16 36-16 54 0s36 16 52 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 26l16-9 8 12-12 3z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink text-shadow-glow lg:text-6xl">
                大家一起打飞机
              </h1>
              <p className="mt-3 max-w-[340px] text-sm leading-6 text-ink-muted">
                填好飞行计划，选一架纸飞机，叫上同桌一起起飞。
              </p>
            </div>
          </Panel>

          <Panel index="PRE-FLIGHT" className="animate-fade-up [animation-delay:60ms]">
            <SectionHeader index="01" label="飞行前检查" />

            <div className="mt-5 flex flex-col gap-4">
              <Input
                label="服务器地址"
                value={serverUrl}
                onChange={(event) => setServerUrl(event.target.value)}
                placeholder="ws://192.168.1.10:60000"
              />
              <Input
                label="飞行员昵称"
                value={name}
                maxLength={16}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：纸翼小队"
              />
              <Input
                label="房间名称"
                value={roomName}
                maxLength={24}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="例如：三年二班空域"
              />
              <Input
                label="房间码"
                value={code}
                maxLength={5}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="输入 5 位房间码"
              />

              <div className="flex flex-col gap-2">
                <span className="label-caps">初始机型</span>
                <div className="flex flex-wrap gap-2">
                  {PLANES.map((plane) => (
                    <button
                      key={plane.id}
                      type="button"
                      onClick={() => setPlaneId(plane.id)}
                      aria-pressed={planeId === plane.id}
                      className={cn(
                        'cursor-pointer rounded-[9px_6px_10px_7px] border-2 px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                        planeId === plane.id
                          ? '-rotate-1 border-accent bg-accent-soft text-accent shadow-[0_2px_0_var(--paper-edge)]'
                          : 'border-line bg-surface-raised text-ink-muted hover:border-accent/70 hover:text-ink'
                      )}
                    >
                      {plane.name}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-[10px_7px_11px_8px] border-2 border-danger/40 bg-[#f6e4dc] p-3 text-xs font-medium text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" className="flex-1" onClick={() => onConnect(serverUrl)}>
                  连接服务器
                </Button>
                <Button
                  className="flex-1"
                  disabled={!connected || !name.trim() || !roomName.trim()}
                  onClick={() => onCreate({ name: name.trim(), roomName: roomName.trim(), planeId })}
                >
                  创建房间
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
              <Button
                variant="secondary"
                disabled={!connected || !name.trim() || code.length !== 5}
                onClick={() => onJoin({ name: name.trim(), code, planeId })}
              >
                加入房间 {code}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel index="APRON" className="flex min-h-[420px] flex-1 flex-col animate-fade-up [animation-delay:120ms]">
            <SectionHeader
              index="02"
              label="待命停机坪"
              right={
                <span className="rounded-[9px_6px_10px_7px] border border-line-strong bg-surface-raised px-3 py-1 font-mono text-xs font-semibold text-ink-muted">
                  {rooms.length} 个待命
                </span>
              }
            />

            <div className="mt-5 flex flex-1 flex-col gap-3">
              {rooms.length === 0 ? (
                <div className="instrument-grid flex flex-1 flex-col items-center justify-center rounded-[13px_9px_14px_8px] border-2 border-dashed border-line-strong p-8 text-center">
                  <svg className="h-16 w-24 text-ink-muted/70" viewBox="0 0 100 60" fill="none" aria-hidden="true">
                    <path d="M8 48c16-14 32-14 48 0s28 14 40 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M36 26l22-13 9 20-17 4z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M58 13l-3 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="mt-3 text-sm font-semibold text-ink">停机坪暂无待命战机</p>
                  <p className="mt-1 text-xs text-ink-muted">创建房间后，房间码会同步给同一局域网的玩家。</p>
                </div>
              ) : (
                rooms.map((room, index) => {
                  const full = room.playerCount >= 4;
                  return (
                    <div
                      key={room.code}
                      className="glass-card flex items-center justify-between gap-4 p-4 transition-colors hover:border-accent/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rotate-45 border border-line-strong"
                          style={{ backgroundColor: ROOM_SLOT_COLORS[index % ROOM_SLOT_COLORS.length] }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{room.name}</p>
                          <div className="mt-1">
                            <CodeChip code={room.code} />
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-mono text-xs font-semibold text-ink-muted">
                          机位 {room.playerCount}/4 · {full ? '已满' : '可加入'}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!connected || full}
                          onClick={() => onJoin({ name: name.trim() || '飞行学员', code: room.code, planeId })}
                        >
                          快速加入
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-dashed border-line pt-4 font-mono text-xs text-ink-muted">
              <span>W/S 油门</span>
              <span>Q/E 滚转</span>
              <span>鼠标转向 / 俯仰</span>
              <span>左键开火</span>
              <span>课桌起飞：按 W</span>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
