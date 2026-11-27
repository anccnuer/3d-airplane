package rooms

import (
	"log/slog"
	"math"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
	"classroom-arena/server/internal/simulation"
)

type tickOutcome struct {
	room              *Room
	started           bool
	ended             bool
	events            []protocol.GameEvent
	snapshot          protocol.Snapshot
	delta             protocol.SnapshotDelta
	playing           bool
	endsAt            int64
	broadcast         bool
	roomStateInterval int64
}

const (
	// idleRoomStateTicks 是大厅/对局结束状态广播 room_state 的间隔。
	idleRoomStateTicks = int64(6)
	// playingRoomStateTicks 是对局中广播 room_state 的间隔（2Hz），对局内状态已由 snapshot 承载。
	playingRoomStateTicks = int64(30)
)

func (m *Manager) Tick(now int64) {
	dt := 1 / float64(m.tickRate)
	m.mu.Lock()
	rooms := make([]*Room, 0, len(m.Rooms))
	for _, room := range m.Rooms {
		rooms = append(rooms, room)
	}
	m.mu.Unlock()
	for _, room := range rooms {
		m.tickRoom(room, now, dt)
	}
}

func (m *Manager) tickRoom(room *Room, now int64, dt ...float64) {
	step := 1 / float64(m.tickRate)
	if len(dt) > 0 {
		step = dt[0]
	}
	m.mu.Lock()
	m.tickCount++
	tickCount := m.tickCount
	outcome := m.stepRoomLocked(room, now, step)
	m.mu.Unlock()

	if tickCount%outcome.roomStateInterval == 0 {
		m.BroadcastRoomState(outcome.room)
	}
	m.broadcastOutcome(outcome, now)
}

func (m *Manager) Housekeeping(now int64) bool {
	m.mu.Lock()
	changed := m.pruneDisconnectedLocked(now)
	m.mu.Unlock()
	return changed
}

func (m *Manager) broadcastOutcome(outcome tickOutcome, now int64) {
	if outcome.started {
		m.BroadcastRoomState(outcome.room)
		m.SendMatchStart(outcome.room, now, outcome.endsAt)
	}
	m.BroadcastEvents(outcome.room, outcome.events)
	if outcome.playing {
		m.BroadcastSnapshot(outcome.room, outcome.snapshot, outcome.delta)
	}
	if outcome.ended && outcome.broadcast {
		m.BroadcastResult(outcome.room)
	}
}

func (m *Manager) pruneDisconnectedLocked(now int64) bool {
	changed := false
	grace := int64(m.data.DisconnectGraceSeconds * 1000)
	for _, room := range m.Rooms {
		for _, player := range append([]*Player(nil), room.Players...) {
			if !player.Connected && now-player.DisconnectedAt > grace {
				m.leavePlayerLocked(player.ID)
				changed = true
			}
		}
	}
	return changed
}

func (m *Manager) stepRoomLocked(room *Room, now int64, dt float64) tickOutcome {
	outcome := tickOutcome{room: room, events: make([]protocol.GameEvent, 0)}
	if room.State == "playing" {
		outcome.roomStateInterval = playingRoomStateTicks
	} else {
		outcome.roomStateInterval = idleRoomStateTicks
	}

	if room.State == "lobby" && room.StartsAt != nil && now >= *room.StartsAt {
		startMatch(room, now, m.data)
		outcome.started = true
		if room.EndsAt != nil {
			outcome.endsAt = *room.EndsAt
		}
		return outcome
	}
	if room.State != "playing" {
		return outcome
	}

	for _, player := range room.Players {
		if !player.Connected {
			continue
		}
		if !player.Alive && player.RespawnAt > 0 && now >= player.RespawnAt {
			m.respawnPlayerLocked(room, player, now, &outcome.events)
		}
		if !player.Alive {
			continue
		}

		if now-player.LastInputAt > 300 {
			player.Input.Throttle = 0
			player.Input.Pitch = 0
			player.Input.Yaw = 0
			player.Input.Roll = 0
			player.Input.Fire = false
		}

		plane := m.data.Plane(player.PlaneID)
		simulation.AdvanceFlight(&player.FlightBody, player.Input, plane, dt)

		deskHit := simulation.ResolveDeskCollisions(&player.FlightBody, m.data)
		bounds := simulation.ClampToWorld(player.Position, m.data)
		player.Position = bounds.Position

		if !player.Parked && now >= player.InvulnerableUntil &&
			(deskHit || bounds.Hit) && player.Speed > 8 && now >= player.DamageCooldownUntil {
			damage := math.Min(player.HP, m.data.CollisionDamage)
			player.HP -= damage
			player.DamageCooldownUntil = now + m.data.CollisionCooldownMs
			m.emitLocked(room, &outcome.events, "collision", now, nil, &player.ID, vec3Ptr(player.Position), stringPtr(player.Name+" 撞到障碍"))
			if player.HP <= 0 {
				m.killPlayerLocked(room, player, nil, now, &outcome.events)
			}
		}

		if !player.Parked && player.Input.Fire && now >= player.FireCooldownUntil && player.Alive {
			m.spawnBulletLocked(room, player, now, plane, &outcome.events)
			player.FireCooldownUntil = now + int64(1000/plane.FireRate)
		}
	}

	for index := len(room.Bullets) - 1; index >= 0; index-- {
		bullet := room.Bullets[index]
		bullet.TTL -= dt
		bullet.Position = bullet.Position.Add(bullet.Direction.Scale(bullet.Speed * dt))

		remove := bullet.TTL <= 0 || simulation.BulletHitsWorld(bullet.Position, m.data)
		if !remove && simulation.BulletHitsDesk(bullet.Position, m.data) {
			m.emitLocked(room, &outcome.events, "collision", now, nil, nil, vec3Ptr(bullet.Position), nil)
			remove = true
		}

		if !remove {
			for _, target := range room.Players {
				if !target.Alive || target.ID == bullet.OwnerID || now < target.InvulnerableUntil {
					continue
				}
				if !simulation.BulletHitsPlayer(bullet.Position, target.Position, m.data) {
					continue
				}
				damage := math.Min(target.HP, bullet.Damage)
				target.HP -= damage
				owner := room.playerByID(bullet.OwnerID)
				if owner != nil {
					owner.Damage += damage
				}
				m.emitLocked(room, &outcome.events, "hit", now, &bullet.OwnerID, &target.ID, vec3Ptr(bullet.Position), nil)
				if target.HP <= 0 {
					m.killPlayerLocked(room, target, owner, now, &outcome.events)
				}
				remove = true
				break
			}
		}

		if remove {
			m.bulletPool.Put(bullet)
			room.Bullets = append(room.Bullets[:index], room.Bullets[index+1:]...)
		}
	}

	if room.EndsAt != nil && now >= *room.EndsAt {
		room.State = "ended"
		room.StartsAt = nil
		room.Bullets = nil
		outcome.ended = true
		outcome.broadcast = !room.ResultSent
		room.ResultSent = true
		return outcome
	}

	outcome.playing = true
	full := buildSnapshotLocked(room, now, m.tickCount)
	outcome.snapshot = full
	const baselineInterval = int64(30)
	if room.SnapshotBase == nil || m.tickCount%baselineInterval == 0 {
		outcome.delta = protocol.SnapshotDelta{
			Type:       "snapshot_delta",
			BaseTick:   full.Tick,
			Tick:       full.Tick,
			ServerTime: full.ServerTime,
			Players:    full.Players,
			Bullets:    full.Bullets,
		}
		room.SnapshotBase = cloneSnapshot(full)
	} else {
		outcome.delta = buildSnapshotDeltaLocked(room.SnapshotBase, full)
	}
	return outcome
}

func cloneSnapshot(snapshot protocol.Snapshot) *protocol.Snapshot {
	clone := snapshot
	clone.Players = append([]protocol.PlayerState(nil), snapshot.Players...)
	clone.Bullets = append([]protocol.BulletState(nil), snapshot.Bullets...)
	for index := range clone.Players {
		clone.Players[index].Position = cloneVec3(snapshot.Players[index].Position)
		clone.Players[index].Rotation = cloneVec3(snapshot.Players[index].Rotation)
		clone.Players[index].Velocity = cloneVec3(snapshot.Players[index].Velocity)
	}
	for index := range clone.Bullets {
		clone.Bullets[index].Position = cloneVec3(snapshot.Bullets[index].Position)
		clone.Bullets[index].Direction = cloneVec3(snapshot.Bullets[index].Direction)
	}
	return &clone
}

func cloneVec3(value config.Vec3) config.Vec3 {
	return value
}

func buildSnapshotDeltaLocked(base *protocol.Snapshot, current protocol.Snapshot) protocol.SnapshotDelta {
	delta := protocol.SnapshotDelta{
		Type:       "snapshot_delta",
		BaseTick:   base.Tick,
		Tick:       current.Tick,
		ServerTime: current.ServerTime,
	}
	basePlayers := make(map[string]protocol.PlayerState, len(base.Players))
	for _, player := range base.Players {
		basePlayers[player.ID] = player
	}
	currentPlayers := make(map[string]bool, len(current.Players))
	for _, player := range current.Players {
		currentPlayers[player.ID] = true
		if previous, ok := basePlayers[player.ID]; !ok || !playerStateEqual(previous, player) {
			delta.Players = append(delta.Players, player)
		}
	}
	for id := range basePlayers {
		if !currentPlayers[id] {
			delta.RemovedPlayers = append(delta.RemovedPlayers, id)
		}
	}

	baseBullets := make(map[int64]protocol.BulletState, len(base.Bullets))
	for _, bullet := range base.Bullets {
		baseBullets[bullet.ID] = bullet
	}
	currentBullets := make(map[int64]bool, len(current.Bullets))
	for _, bullet := range current.Bullets {
		currentBullets[bullet.ID] = true
		if previous, ok := baseBullets[bullet.ID]; !ok || !bulletStateEqual(previous, bullet) {
			delta.Bullets = append(delta.Bullets, bullet)
		}
	}
	for id := range baseBullets {
		if !currentBullets[id] {
			delta.RemovedBullets = append(delta.RemovedBullets, id)
		}
	}
	return delta
}

func playerStateEqual(a, b protocol.PlayerState) bool {
	return a.ID == b.ID && vec3Equal(a.Position, b.Position) && vec3Equal(a.Rotation, b.Rotation) &&
		vec3Equal(a.Velocity, b.Velocity) && a.Speed == b.Speed && a.HP == b.HP && a.Alive == b.Alive &&
		a.InvulnerableUntil == b.InvulnerableUntil && a.RespawnAt == b.RespawnAt && a.Parked == b.Parked
}

func bulletStateEqual(a, b protocol.BulletState) bool {
	return a.ID == b.ID && a.OwnerID == b.OwnerID && vec3Equal(a.Position, b.Position) && vec3Equal(a.Direction, b.Direction)
}

func vec3Equal(a, b config.Vec3) bool {
	return a[0] == b[0] && a[1] == b[1] && a[2] == b[2]
}

func (m *Manager) emitLocked(room *Room, events *[]protocol.GameEvent, eventType string, at int64, sourceID, targetID *string, position *config.Vec3, text *string) {
	event := protocol.GameEvent{
		ID:       room.NextEventID,
		Type:     eventType,
		At:       at,
		SourceID: sourceID,
		TargetID: targetID,
		Position: position,
		Text:     text,
	}
	room.NextEventID++
	*events = append(*events, event)
}

func (m *Manager) killPlayerLocked(room *Room, target *Player, attacker *Player, now int64, events *[]protocol.GameEvent) {
	if !target.Alive {
		return
	}
	target.Alive = false
	target.HP = 0
	target.Deaths++
	respawnDelay := int64(m.data.RespawnSeconds * 1000)
	if respawnDelay < 1000 {
		respawnDelay = 1000
	}
	target.RespawnAt = now + respawnDelay
	target.Input = protocol.InputCommand{Type: "input"}

	text := target.Name + " 撞毁"
	if attacker != nil && attacker.ID != target.ID {
		attacker.Kills++
		attacker.Score += 100
		text = attacker.Name + " 击落 " + target.Name
	}
	m.emitLocked(room, events, "kill", now, idPtr(attacker), &target.ID, vec3Ptr(target.Position), &text)
}

func (m *Manager) respawnPlayerLocked(room *Room, player *Player, now int64, events *[]protocol.GameEvent) {
	plane := m.data.Plane(player.PlaneID)
	index := room.indexOf(player.ID)
	if index < 0 {
		index = 0
	}
	player.Alive = true
	player.HP = plane.HP
	player.Position = m.data.Spawn(index)
	player.Rotation = m.data.SpawnRotation
	player.Velocity = config.Vec3{}
	player.Speed = 0
	player.Parked = true
	player.InvulnerableUntil = now + int64(m.data.SpawnInvulnerableSeconds*1000)
	player.DamageCooldownUntil = now + 2500
	player.RespawnAt = 0
	player.FireCooldownUntil = 0
	player.Input = protocol.InputCommand{Type: "input"}
	text := player.Name + " 重新入场"
	m.emitLocked(room, events, "respawn", now, nil, &player.ID, vec3Ptr(player.Position), &text)
}

func (m *Manager) spawnBulletLocked(room *Room, player *Player, now int64, plane *config.Plane, events *[]protocol.GameEvent) {
	forward := simulation.ForwardFromRotation(player.Rotation)
	if room.prng == nil {
		room.prng, room.seed = newRoomPRNG()
	}
	spread := (room.prng.Float64() - 0.5) * 0.022
	direction := config.Vec3{
		forward[0] + spread,
		forward[1] + spread*0.5,
		forward[2] + spread,
	}
	length := math.Sqrt(direction[0]*direction[0] + direction[1]*direction[1] + direction[2]*direction[2])
	if length > 0 {
		direction = direction.Scale(1 / length)
	}
	bullet := m.bulletPool.Get()
	bullet.ID = room.NextEventID
	bullet.OwnerID = player.ID
	bullet.Position = player.Position.Add(direction.Scale(1.6))
	bullet.Direction = direction
	bullet.Speed = plane.BulletSpeed
	bullet.Damage = plane.Damage
	bullet.TTL = 2.2
	room.Bullets = append(room.Bullets, bullet)
	room.NextEventID++
	m.emitLocked(room, events, "fire", now, &player.ID, nil, vec3Ptr(player.Position), nil)
}

func buildSnapshotLocked(room *Room, now int64, tick int64) protocol.Snapshot {
	players := make([]protocol.PlayerState, 0, len(room.Players))
	for _, player := range room.Players {
		alive, hp, respawnAt := player.Alive, player.HP, player.RespawnAt
		if !alive && (respawnAt <= now || hp > 0) {
			slog.Warn("inconsistent death state in snapshot",
				"room", room.Code,
				"player", player.ID,
				"hp", hp,
				"respawnAt", respawnAt,
				"now", now)
			alive = true
			if hp <= 0 {
				hp = 1
			}
			respawnAt = 0
		}
		players = append(players, protocol.PlayerState{
			ID:                player.ID,
			Position:          player.Position,
			Rotation:          player.Rotation,
			Velocity:          player.Velocity,
			Speed:             player.Speed,
			HP:                hp,
			Alive:             alive,
			InvulnerableUntil: player.InvulnerableUntil,
			RespawnAt:         respawnAt,
			Parked:            player.Parked,
		})
	}
	bullets := make([]protocol.BulletState, 0, len(room.Bullets))
	for _, bullet := range room.Bullets {
		bullets = append(bullets, protocol.BulletState{
			ID:        bullet.ID,
			OwnerID:   bullet.OwnerID,
			Position:  bullet.Position,
			Direction: bullet.Direction,
		})
	}
	return protocol.Snapshot{
		Type:       "snapshot",
		Tick:       tick,
		ServerTime: now,
		Players:    players,
		Bullets:    bullets,
	}
}

func idPtr(player *Player) *string {
	if player == nil {
		return nil
	}
	return &player.ID
}

func vec3Ptr(value config.Vec3) *config.Vec3 { return &value }
func stringPtr(value string) *string         { return &value }
