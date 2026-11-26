import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLANES, type RoomInfo, type RoomSummary, type Standing } from '@classroom-arena/shared';
import { GameApp } from './game/GameApp';
import { NetClient, type ConnectionStatus } from './game/systems/netClient';
import { LobbyScene } from './components/LobbyScene';
import { Hangar } from './ui/Hangar';
import { MainMenu, type CreateRoomPayload, type JoinRoomPayload } from './ui/MainMenu';
import { ResultPanel } from './ui/ResultPanel';

type Screen = 'menu' | 'hangar' | 'playing' | 'result';

interface ResultState {
  standings: Standing[];
  durationSeconds: number;
}

export function App() {
  const net = useMemo(() => new NetClient(), []);
  const screenRef = useRef<Screen>('menu');
  const [screen, setScreen] = useState<Screen>('menu');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaneId, setSelectedPlaneId] = useState(PLANES[0].id);

  screenRef.current = screen;

  useEffect(() => {
    const offStatus = net.onStatus(setStatus);
    const offRoomList = net.on('room_list', (message) => setRooms(message.rooms));
    const offRoomState = net.on('room_state', (message) => {
      setRoom(message.room);
      const local = message.room.players.find((player) => player.id === net.playerId);
      if (local) setSelectedPlaneId(local.planeId);

      if (local && screenRef.current === 'menu') {
        setError(null);
        setScreen('hangar');
      }
      if (message.room.state === 'lobby' && screenRef.current === 'result') setScreen('hangar');
    });
    const offMatchStart = net.on('match_start', () => {
      setError(null);
      setScreen('playing');
    });
    const offResult = net.on('result', (message) => {
      setResult({ standings: message.standings, durationSeconds: message.durationSeconds });
      setScreen('result');
    });
    const offError = net.on('error', (message) => setError(message.message));

    return () => {
      offStatus();
      offRoomList();
      offRoomState();
      offMatchStart();
      offResult();
      offError();
      net.disconnect();
    };
  }, [net]);

  const handleConnect = useCallback(
    (url: string) => {
      setError(null);
      net.connect(url);
    },
    [net]
  );

  const handleCreate = useCallback(
    (payload: CreateRoomPayload) => {
      if (net.getStatus() !== 'connected') {
        setError('请先连接局域网服务器');
        return;
      }
      setSelectedPlaneId(payload.planeId);
      net.createRoom(payload.name, payload.roomName, payload.planeId);
    },
    [net]
  );

  const handleJoin = useCallback(
    (payload: JoinRoomPayload) => {
      if (net.getStatus() !== 'connected') {
        setError('请先连接局域网服务器');
        return;
      }
      setSelectedPlaneId(payload.planeId);
      net.joinRoom(payload.name, payload.code, payload.planeId);
    },
    [net]
  );

  const handleSelectPlane = useCallback(
    (planeId: string) => {
      setSelectedPlaneId(planeId);
      net.setPlane(planeId);
    },
    [net]
  );

  const handleLeave = useCallback(() => {
    net.leaveRoom();
    setRoom(null);
    setResult(null);
    setScreen('menu');
  }, [net]);

  const handleRematch = useCallback(() => {
    net.setReady(true);
    setScreen('hangar');
  }, [net]);

  const handleFinish = useCallback(() => {
    setScreen('result');
  }, []);

  if (screen === 'playing') {
    return <GameApp net={net} room={room} onFinish={handleFinish} />;
  }

  return (
    <>
      <LobbyScene />
      <div className="relative z-10 min-h-screen">
        {screen === 'hangar' ? (
          <Hangar
            room={room}
            playerId={net.playerId}
            selectedPlaneId={selectedPlaneId}
            error={error}
            onSelectPlane={handleSelectPlane}
            onReady={(ready) => net.setReady(ready)}
            onLeave={handleLeave}
          />
        ) : screen === 'result' && result ? (
          <ResultPanel
            standings={result.standings}
            durationSeconds={result.durationSeconds}
            playerId={net.playerId}
            onRematch={handleRematch}
            onLeave={handleLeave}
          />
        ) : (
          <MainMenu
            status={status}
            error={error}
            rooms={rooms}
            onConnect={handleConnect}
            onCreate={handleCreate}
            onJoin={handleJoin}
          />
        )}
      </div>
    </>
  );
}
