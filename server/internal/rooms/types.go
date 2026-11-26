package rooms

import (
	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
	"classroom-arena/server/internal/simulation"
	"classroom-arena/server/internal/transport"
	"math/rand"
	"sort"
	"time"
)

const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

type Player struct {
	simulation.FlightBody
	ID                  string
	Token               string
	Name                string
	PlaneID             string
	HP                  float64
	Alive               bool
	Client              *transport.Client
	Connected           bool
	DisconnectedAt      int64
	Ready               bool
	Score               int
	Kills               int
	Deaths              int
	Damage              float64
	Input               protocol.InputCommand
	LastSeq             int64
	LastInputAt         int64
	FireCooldownUntil   int64
	DamageCooldownUntil int64
	InvulnerableUntil   int64
	RespawnAt           int64
}

type Bullet struct {
	ID        int64
	OwnerID   string
	Position  config.Vec3
	Direction config.Vec3
	Speed     float64
	Damage    float64
	TTL       float64
}

type Room struct {
	Code        string
	Name        string
	State       string
	Players     []*Player
	Bullets     []*Bullet
	StartsAt    *int64
	EndsAt      *int64
	NextEventID int64
	ResultSent  bool
}

type Result struct {
	Room    *Room
	Player  *Player
	Message string
}

func (r *Result) OK() bool { return r.Room != nil && r.Player != nil }

func generateRoomCode(existing map[string]*Room) string {
	for {
		code := make([]byte, 5)
		for i := range code {
			code[i] = codeChars[rand.Intn(len(codeChars))]
		}
		value := string(code)
		if _, taken := existing[value]; !taken {
			return value
		}
	}
}

func newPlayer(client *transport.Client, name, planeID string, index int, data *config.GameData) *Player {
	plane := data.Plane(planeID)
	now := time.Now().UnixMilli()
	return &Player{
		FlightBody: simulation.FlightBody{
			Position: data.Spawn(index),
			Rotation: data.SpawnRotation,
			Velocity: config.Vec3{},
			Speed:    0,
			Parked:   true,
		},
		ID:          randomHex(16),
		Token:       randomHex(24),
		Name:        name,
		PlaneID:     planeID,
		HP:          plane.HP,
		Alive:       true,
		Client:      client,
		Connected:   true,
		LastInputAt: now,
		Input:       protocol.InputCommand{Type: "input"},
	}
}

func randomHex(size int) string {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	const digits = "0123456789abcdef"
	out := make([]byte, len(buf)*2)
	for i, b := range buf {
		out[i*2] = digits[b>>4]
		out[i*2+1] = digits[b&0x0f]
	}
	return string(out)
}

func (r *Room) indexOf(id string) int {
	for i, player := range r.Players {
		if player.ID == id {
			return i
		}
	}
	return -1
}

func (r *Room) playerByID(id string) *Player {
	if index := r.indexOf(id); index >= 0 {
		return r.Players[index]
	}
	return nil
}

func (r *Room) playerByClient(client *transport.Client) *Player {
	for _, player := range r.Players {
		if player.Client == client {
			return player
		}
	}
	return nil
}

func publicPlayer(player *Player) protocol.PublicPlayer {
	return protocol.PublicPlayer{
		ID:        player.ID,
		Name:      player.Name,
		PlaneID:   player.PlaneID,
		Ready:     player.Ready,
		Connected: player.Connected,
		HP:        int(protocol.Clamp(float64(int(player.HP+0.5)), 0, 10000)),
		Alive:     player.Alive,
		Score:     player.Score,
		Kills:     player.Kills,
		Deaths:    player.Deaths,
		Damage:    int(player.Damage + 0.5),
	}
}

func publicRoom(room *Room) protocol.RoomInfo {
	players := make([]protocol.PublicPlayer, 0, len(room.Players))
	for _, player := range room.Players {
		players = append(players, publicPlayer(player))
	}
	return protocol.RoomInfo{
		Code:     room.Code,
		Name:     room.Name,
		State:    room.State,
		Players:  players,
		StartsAt: room.StartsAt,
		EndsAt:   room.EndsAt,
	}
}

func standings(room *Room) []protocol.Standing {
	result := make([]protocol.Standing, 0, len(room.Players))
	for _, player := range room.Players {
		result = append(result, protocol.Standing{
			ID:      player.ID,
			Name:    player.Name,
			PlaneID: player.PlaneID,
			Score:   player.Score,
			Kills:   player.Kills,
			Deaths:  player.Deaths,
			Damage:  int(player.Damage + 0.5),
		})
	}
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].Score != result[j].Score {
			return result[i].Score > result[j].Score
		}
		if result[i].Kills != result[j].Kills {
			return result[i].Kills > result[j].Kills
		}
		return result[i].Deaths < result[j].Deaths
	})
	return result
}

func startMatch(room *Room, now int64, data *config.GameData) {
	room.State = "playing"
	room.StartsAt = nil
	end := now + int64(data.MatchSeconds)*1000
	room.EndsAt = &end
	room.Bullets = nil
	room.ResultSent = false

	for index, player := range room.Players {
		plane := data.Plane(player.PlaneID)
		player.Position = data.Spawn(index)
		player.Rotation = data.SpawnRotation
		player.Velocity = config.Vec3{}
		player.Speed = 0
		player.Parked = true
		player.HP = plane.HP
		player.Alive = true
		player.Ready = false
		player.Score = 0
		player.Kills = 0
		player.Deaths = 0
		player.Damage = 0
		player.InvulnerableUntil = 0
		player.DamageCooldownUntil = 0
		player.RespawnAt = 0
		player.FireCooldownUntil = 0
		player.Input.Fire = false
	}
}
