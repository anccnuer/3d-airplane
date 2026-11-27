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

const ROOM_SLOT_COLORS = ['#22D3EE', '#F59E0B', '#A78BFA', '#34D399'];

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
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-shell/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-[#1b1206] shadow-glow">
              <Plane size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="font-game-title text-sm tracking-[0.08em] text-ink">大家一起打飞机</p>
            </div>
          </div>
          <SignalMeter status={signalStatus} />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1240px] flex-col gap-6 px-6 pb-12 pt-24 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-[460px]">
          <Panel index="BRIEF 01" className="animate-fade-up">
            <h1 className="font-game-title text-5xl leading-[1.05] tracking-tight text-ink text-shadow-glow lg:text-6xl">
              大家一起打飞机
            </h1>
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
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                        planeId === plane.id
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-surface-inset text-ink-muted hover:border-line-strong hover:text-ink'
                      )}
                    >
                      {plane.name}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
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
                <span className="rounded-full border border-line bg-surface-inset px-3 py-1 font-mono text-xs text-ink-muted">
                  {rooms.length} 个待命
                </span>
              }
            />

            <div className="mt-5 flex flex-1 flex-col gap-3">
              {rooms.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-inset/50 p-8 text-center">
                  <Plane size={30} className="text-ink-dim" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-ink-muted">停机坪暂无待命战机</p>
                  <p className="mt-1 text-xs text-ink-dim">创建房间后，房间码会同步给同一局域网的玩家。</p>
                </div>
              ) : (
                rooms.map((room, index) => (
                  <div
                    key={room.code}
                    className="glass-card flex items-center justify-between gap-4 p-4 transition-colors hover:border-line-strong"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
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
                      <span className="font-mono text-xs text-ink-muted">机位 {room.playerCount}/4</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!connected}
                        onClick={() => onJoin({ name: name.trim() || '飞行学员', code: room.code, planeId })}
                      >
                        快速加入
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-xs text-ink-dim">
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
