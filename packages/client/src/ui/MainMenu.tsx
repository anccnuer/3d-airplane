import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Plane, Radio, Users, Wifi, WifiOff } from 'lucide-react';
import { PLANES, type RoomSummary } from '@classroom-arena/shared';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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

export function MainMenu({ status, error, rooms, onConnect, onCreate, onJoin }: MainMenuProps) {
  const defaultUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname || 'localhost'}:8080`;
  }, []);

  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [name, setName] = useState('飞行学员');
  const [roomName, setRoomName] = useState('三年二班空域');
  const [code, setCode] = useState('');
  const [planeId, setPlaneId] = useState(PLANES[0].id);

  const connected = status === 'connected';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1220] text-slate-100">
      <div className="arena-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]"
        aria-hidden="true"
      />

      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-white/10 bg-[#0B1220]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-glow">
              <Plane size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">教室空域</p>
              <p className="text-[11px] text-slate-500">CLASSROOM SKY ARENA</p>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
              connected
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
            )}
          >
            {connected ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
            {status === 'connected' ? '服务已连接' : status === 'connecting' ? '正在连接' : '等待连接'}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1180px] flex-col gap-6 px-6 pb-12 pt-24 lg:flex-row">
        <section className="glass-panel w-full rounded-2xl p-6 lg:w-[420px]">
          <div className="flex items-center gap-2 text-cyan-300">
            <Radio size={18} aria-hidden="true" />
            <span className="label-caps !text-cyan-300">联机设置</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white text-shadow-glow">
            在课桌间
            <br />
            打一场空中缠斗
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            连接局域网服务器，创建房间或输入伙伴的房间码。房间最多容纳 4 架飞机。
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Input
              label="服务器地址"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="ws://192.168.1.10:8080"
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
                      'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
                      planeId === plane.id
                        ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-200'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:text-white'
                    )}
                  >
                    {plane.name}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
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
        </section>

        <section className="glass-panel flex min-h-[420px] flex-1 flex-col rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300">
              <Users size={18} aria-hidden="true" />
              <span className="label-caps !text-cyan-300">公开房间</span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
              {rooms.length} 个等待中
            </span>
          </div>

          <div className="mt-5 flex flex-1 flex-col gap-3">
            {rooms.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <Plane size={32} className="text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-300">暂无等待中的房间</p>
                <p className="mt-1 text-xs text-slate-500">创建房间后，房间码会同步给同一局域网的玩家。</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.code}
                  className="glass-card flex items-center justify-between rounded-xl p-4 transition-colors hover:border-cyan-300/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{room.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      房间码 {room.code} · {room.playerCount}/4 人
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!connected}
                    onClick={() => onJoin({ name: name.trim() || '飞行学员', code: room.code, planeId })}
                  >
                    快速加入
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-500">
            <span>W/S 油门</span>
            <span>Q/E 滚转</span>
            <span>鼠标转向/俯仰</span>
            <span>左键开火</span>
            <span>课桌起飞：按 W</span>
          </div>
        </section>
      </main>
    </div>
  );
}
