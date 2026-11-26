import { useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS, type RoomInfo, type Snapshot } from '@classroom-arena/shared';
import { ThreeGame, type HudState } from './ThreeGame';
import type { NetClient } from './systems/netClient';
import { Hud, type RadarPlayer } from '../ui/Hud';

interface GameAppProps {
  net: NetClient;
  room: RoomInfo | null;
  onFinish: () => void;
}

const EMPTY_HUD: HudState = {
  hp: 100,
  maxHp: 100,
  speed: 0,
  altitude: 0,
  score: 0,
  kills: 0,
  alive: true,
  respawnIn: 0,
  invulnerable: false,
  parked: true,
  timeLeft: 180
};

export function GameApp({ net, room, onFinish }: GameAppProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<ThreeGame | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const roomRef = useRef<RoomInfo | null>(room);
  const flashTimer = useRef<number | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [radarPlayers, setRadarPlayers] = useState<RadarPlayer[]>([]);
  const [hitFlash, setHitFlash] = useState(false);

  roomRef.current = room;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = new ThreeGame(container, {
      sendInput: (input) => net.sendInput(input),
      onHud: setHud
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [net]);

  useEffect(() => {
    if (!room) return;
    gameRef.current?.setRoomInfo(room);
    const local = room.players.find((player) => player.id === net.playerId);
    if (local) gameRef.current?.setLocalPlayer(local.id, local.planeId);
  }, [room, net]);

  useEffect(() => {
    const offSnapshot = net.on('snapshot', (message) => {
      snapshotRef.current = message;
      gameRef.current?.applySnapshot(message);
    });

    const offEvents = net.on('game_events', (message) => {
      gameRef.current?.handleEvents(message.events);

      const messages = message.events
        .filter((event) => event.text)
        .map((event) => event.text as string)
        .reverse();
      if (messages.length > 0) {
        setKillFeed((previous) => [...messages, ...previous].slice(0, 5));
      }

      const localHit = message.events.some(
        (event) =>
          (event.type === 'hit' || event.type === 'collision') &&
          event.targetId === net.playerId
      );
      if (localHit) {
        setHitFlash(true);
        if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setHitFlash(false), 180);
      }
    });

    const offResult = net.on('result', onFinish);

    return () => {
      offSnapshot();
      offEvents();
      offResult();
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, [net, onFinish]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const snapshot = snapshotRef.current;
      const currentRoom = roomRef.current;
      if (!snapshot || !currentRoom) return;

      setRadarPlayers(
        snapshot.players.map((player, index) => ({
          id: player.id,
          x: player.position[0],
          z: player.position[2],
          color: PLAYER_COLORS[index % PLAYER_COLORS.length],
          alive: player.alive
        }))
      );
    }, 150);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B1220]">
      <div ref={containerRef} className="absolute inset-0" />
      <Hud hud={hud} killFeed={killFeed} radarPlayers={radarPlayers} hitFlash={hitFlash} />
    </div>
  );
}
