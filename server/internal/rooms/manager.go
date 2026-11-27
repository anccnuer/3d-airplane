package rooms

import (
	"encoding/json"
	"strings"
	"sync"
	"time"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/observability"
	"classroom-arena/server/internal/protocol"
	"classroom-arena/server/internal/transport"
)

type Context struct {
	Room   *Room
	Player *Player
}

type Manager struct {
	mu            sync.Mutex
	Rooms         map[string]*Room
	memberships   map[string]string
	tokens        map[string]string
	clientPlayers map[*transport.Client]string
	data          *config.GameData
	tickRate      int
	tickCount     int64
	bulletPool    *BulletPool
}

func NewManager(data *config.GameData) *Manager {
	return NewManagerWithTickRate(data, data.TickRate)
}

func NewManagerWithTickRate(data *config.GameData, tickRate int) *Manager {
	if tickRate <= 0 {
		tickRate = data.TickRate
	}
	return &Manager{
		Rooms:         make(map[string]*Room),
		memberships:   make(map[string]string),
		tokens:        make(map[string]string),
		clientPlayers: make(map[*transport.Client]string),
		data:          data,
		tickRate:      tickRate,
		bulletPool:    NewBulletPool(),
	}
}

func (m *Manager) CreateRoom(client *transport.Client, name, roomName, planeID string) Result {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.detachClientLocked(client)
	prng, seed := newRoomPRNG()
	room := &Room{
		Code:        generateRoomCode(m.Rooms),
		Name:        roomName,
		State:       "lobby",
		NextEventID: 1,
		prng:        prng,
		seed:        seed,
	}
	player := newPlayer(client, strings.TrimSpace(name), planeID, 0, m.data)
	room.Players = append(room.Players, player)
	m.Rooms[room.Code] = room
	m.registerLocked(player, room.Code)
	m.startActorLocked(room)
	return Result{Room: room, Player: player}
}

func (m *Manager) JoinRoom(client *transport.Client, name, code, planeID string) Result {
	m.mu.Lock()
	defer m.mu.Unlock()

	room := m.Rooms[strings.ToUpper(code)]
	if room == nil {
		return Result{Message: "房间不存在"}
	}
	if room.State != "lobby" {
		return Result{Message: "对局已经开始"}
	}
	if len(room.Players) >= m.data.MaxPlayers {
		return Result{Message: "房间已满"}
	}

	m.detachClientLocked(client)
	player := newPlayer(client, strings.TrimSpace(name), planeID, len(room.Players), m.data)
	room.Players = append(room.Players, player)
	m.registerLocked(player, room.Code)
	return Result{Room: room, Player: player}
}

func (m *Manager) Reconnect(token string, client *transport.Client) Result {
	m.mu.Lock()
	defer m.mu.Unlock()

	playerID := m.tokens[token]
	if playerID == "" {
		return Result{Message: "重连失败，请重新加入房间"}
	}
	room := m.Rooms[m.memberships[playerID]]
	if room == nil {
		return Result{Message: "重连失败，请重新加入房间"}
	}
	player := room.playerByID(playerID)
	if player == nil {
		return Result{Message: "重连失败，请重新加入房间"}
	}

	player.Client = client
	player.Connected = true
	player.DisconnectedAt = 0
	m.clientPlayers[client] = playerID
	return Result{Room: room, Player: player}
}

func (m *Manager) Context(client *transport.Client) Context {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.contextLocked(client)
}

func (m *Manager) contextLocked(client *transport.Client) Context {
	playerID := m.clientPlayers[client]
	if playerID == "" {
		return Context{}
	}
	room := m.Rooms[m.memberships[playerID]]
	if room == nil {
		return Context{}
	}
	player := room.playerByID(playerID)
	if player == nil {
		return Context{}
	}
	return Context{Room: room, Player: player}
}

func (m *Manager) SetPlane(playerID, planeID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	context := m.contextForPlayerLocked(playerID)
	if context.Room == nil || context.Room.State != "lobby" {
		return
	}
	context.Player.PlaneID = planeID
}

func (m *Manager) SetReady(playerID string, ready bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	context := m.contextForPlayerLocked(playerID)
	if context.Room == nil {
		return
	}
	room, player := context.Room, context.Player
	player.Ready = ready

	connected := 0
	allReady := true
	for _, entry := range room.Players {
		if !entry.Connected {
			continue
		}
		connected++
		if !entry.Ready {
			allReady = false
		}
	}
	allReady = allReady && connected >= 2
	now := time.Now().UnixMilli()

	if room.State == "ended" {
		if allReady {
			room.State = "lobby"
			start := now + 1500
			room.StartsAt = &start
			room.EndsAt = nil
			room.ResultSent = false
		}
		return
	}
	if room.State == "lobby" {
		if allReady {
			start := now + 3000
			room.StartsAt = &start
		} else {
			room.StartsAt = nil
		}
	}
}

func (m *Manager) ApplyInput(client *transport.Client, command protocol.InputCommand) {
	m.mu.Lock()
	defer m.mu.Unlock()
	context := m.contextLocked(client)
	if context.Room == nil || !context.Player.Connected || command.Seq <= context.Player.LastSeq {
		return
	}
	context.Player.LastSeq = command.Seq
	context.Player.LastInputAt = time.Now().UnixMilli()
	context.Player.Input = command
}

func (m *Manager) MarkDisconnected(client *transport.Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	playerID := m.clientPlayers[client]
	if playerID == "" {
		return
	}
	delete(m.clientPlayers, client)
	room := m.Rooms[m.memberships[playerID]]
	if room == nil {
		return
	}
	player := room.playerByID(playerID)
	if player == nil {
		return
	}
	player.Connected = false
	player.Client = nil
	player.DisconnectedAt = time.Now().UnixMilli()
	player.Input.Fire = false
}

func (m *Manager) PruneDisconnected(now int64) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
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

func (m *Manager) LeavePlayer(playerID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.leavePlayerLocked(playerID)
}

func (m *Manager) leavePlayerLocked(playerID string) {
	room := m.Rooms[m.memberships[playerID]]
	if room == nil {
		return
	}
	index := room.indexOf(playerID)
	if index < 0 {
		return
	}
	player := room.Players[index]
	room.Players = append(room.Players[:index], room.Players[index+1:]...)
	delete(m.memberships, playerID)
	delete(m.tokens, player.Token)
	if player.Client != nil {
		delete(m.clientPlayers, player.Client)
	}
	if len(room.Players) == 0 {
		m.stopActorLocked(room)
		delete(m.Rooms, room.Code)
	}
}

func (m *Manager) Summarize() []protocol.RoomSummary {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]protocol.RoomSummary, 0, len(m.Rooms))
	for _, room := range m.Rooms {
		if room.State != "lobby" {
			continue
		}
		result = append(result, protocol.RoomSummary{
			Code:        room.Code,
			Name:        room.Name,
			State:       room.State,
			PlayerCount: len(room.Players),
		})
	}
	return result
}

func (m *Manager) AllClients() []*transport.Client {
	m.mu.Lock()
	defer m.mu.Unlock()
	clients := make([]*transport.Client, 0, len(m.clientPlayers))
	for client := range m.clientPlayers {
		clients = append(clients, client)
	}
	return clients
}

func (m *Manager) SendWelcome(client *transport.Client, result Result, now int64) {
	client.Enqueue(protocol.Welcome{
		Type:       "welcome",
		PlayerID:   result.Player.ID,
		Token:      result.Player.Token,
		ServerTime: now,
	})
}

func (m *Manager) SendError(client *transport.Client, message string) {
	client.Enqueue(protocol.ErrorMessage{Type: "error", Message: message})
}

func (m *Manager) BroadcastRoomList() {
	message := protocol.RoomList{Type: "room_list", Rooms: m.Summarize()}
	for _, client := range m.AllClients() {
		client.Enqueue(message)
	}
}

func (m *Manager) BroadcastRoomState(room *Room) {
	m.mu.Lock()
	message := protocol.RoomState{Type: "room_state", Room: publicRoom(room)}
	m.mu.Unlock()
	m.broadcast(room, message)
}

func (m *Manager) BroadcastEvents(room *Room, events []protocol.GameEvent) {
	if len(events) == 0 {
		return
	}
	m.broadcast(room, protocol.GameEvents{Type: "game_events", Events: events})
}

func (m *Manager) BroadcastSnapshot(room *Room, snapshot protocol.Snapshot, delta protocol.SnapshotDelta) {
	clients := m.roomClients(room)
	if len(clients) == 0 {
		return
	}
	fullPayload, err := json.Marshal(snapshot)
	if err != nil {
		return
	}
	deltaPayload, err := protocol.MarshalEnvelope(delta, uint32(delta.Tick), 0)
	if err != nil {
		return
	}
	for _, client := range clients {
		if client.Version() >= 2 {
			client.EnqueuePayload(deltaPayload, true)
			observability.Default.Snapshot(len(deltaPayload))
		} else {
			client.EnqueuePayload(fullPayload, false)
			observability.Default.Snapshot(len(fullPayload))
		}
	}
}

func (m *Manager) BroadcastResult(room *Room) {
	m.mu.Lock()
	message := protocol.Result{
		Type:            "result",
		Standings:       standings(room),
		DurationSeconds: m.data.MatchSeconds,
	}
	m.mu.Unlock()
	m.broadcast(room, message)
}

func (m *Manager) SendMatchStart(room *Room, startsAt, endsAt int64) {
	m.broadcast(room, protocol.MatchStart{Type: "match_start", StartsAt: startsAt, EndsAt: endsAt})
}

func (m *Manager) roomClients(room *Room) []*transport.Client {
	m.mu.Lock()
	defer m.mu.Unlock()
	clients := make([]*transport.Client, 0, len(room.Players))
	for _, player := range room.Players {
		if player.Connected && player.Client != nil {
			clients = append(clients, player.Client)
		}
	}
	return clients
}

func (m *Manager) broadcast(room *Room, message any) {
	for _, client := range m.roomClients(room) {
		client.Enqueue(message)
	}
}

func (m *Manager) contextForPlayerLocked(playerID string) Context {
	room := m.Rooms[m.memberships[playerID]]
	if room == nil {
		return Context{}
	}
	player := room.playerByID(playerID)
	if player == nil {
		return Context{}
	}
	return Context{Room: room, Player: player}
}

func (m *Manager) registerLocked(player *Player, roomCode string) {
	m.memberships[player.ID] = roomCode
	m.tokens[player.Token] = player.ID
	m.clientPlayers[player.Client] = player.ID
}

func (m *Manager) detachClientLocked(client *transport.Client) {
	if playerID := m.clientPlayers[client]; playerID != "" {
		m.leavePlayerLocked(playerID)
	}
}
