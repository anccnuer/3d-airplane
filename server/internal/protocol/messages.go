package protocol

import "classroom-arena/server/internal/config"

type Vec3 = config.Vec3

type Hello struct {
	Type     string `json:"type"`
	Versions []int  `json:"versions"`
}

type HelloAck struct {
	Type       string `json:"type"`
	Version    int    `json:"version"`
	TickRate   int    `json:"tickRate"`
	ServerTime int64  `json:"serverTime"`
}

type InputCommand struct {
	Type     string  `json:"type"`
	Seq      int64   `json:"seq"`
	Tick     int64   `json:"tick"`
	Throttle float64 `json:"throttle"`
	Pitch    float64 `json:"pitch"`
	Yaw      float64 `json:"yaw"`
	Roll     float64 `json:"roll"`
	Fire     bool    `json:"fire"`
}

type SnapshotDelta struct {
	Type           string        `json:"type"`
	BaseTick       int64         `json:"baseTick"`
	Tick           int64         `json:"tick"`
	ServerTime     int64         `json:"serverTime"`
	RemovedPlayers []string      `json:"removedPlayers,omitempty"`
	RemovedBullets []int64       `json:"removedBullets,omitempty"`
	Players        []PlayerState `json:"players,omitempty"`
	Bullets        []BulletState `json:"bullets,omitempty"`
}

type CreateRoom struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	RoomName string `json:"roomName"`
	PlaneID  string `json:"planeId"`
}

type JoinRoom struct {
	Type    string `json:"type"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	PlaneID string `json:"planeId"`
}

type Reconnect struct {
	Type  string `json:"type"`
	Token string `json:"token"`
}

type SetPlane struct {
	Type    string `json:"type"`
	PlaneID string `json:"planeId"`
}

type SetReady struct {
	Type  string `json:"type"`
	Ready bool   `json:"ready"`
}

type LeaveRoom struct {
	Type string `json:"type"`
}

type Ping struct {
	Type string `json:"type"`
	At   int64  `json:"at"`
}

type Welcome struct {
	Type       string `json:"type"`
	PlayerID   string `json:"playerId"`
	Token      string `json:"token"`
	ServerTime int64  `json:"serverTime"`
}

type RoomSummary struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	State       string `json:"state"`
	PlayerCount int    `json:"playerCount"`
}

type PublicPlayer struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PlaneID   string `json:"planeId"`
	Ready     bool   `json:"ready"`
	Connected bool   `json:"connected"`
	HP        int    `json:"hp"`
	Alive     bool   `json:"alive"`
	Score     int    `json:"score"`
	Kills     int    `json:"kills"`
	Deaths    int    `json:"deaths"`
	Damage    int    `json:"damage"`
}

type RoomInfo struct {
	Code     string         `json:"code"`
	Name     string         `json:"name"`
	State    string         `json:"state"`
	Players  []PublicPlayer `json:"players"`
	StartsAt *int64         `json:"startsAt"`
	EndsAt   *int64         `json:"endsAt"`
}

type RoomList struct {
	Type  string        `json:"type"`
	Rooms []RoomSummary `json:"rooms"`
}

type RoomState struct {
	Type string   `json:"type"`
	Room RoomInfo `json:"room"`
}

type MatchStart struct {
	Type     string `json:"type"`
	StartsAt int64  `json:"startsAt"`
	EndsAt   int64  `json:"endsAt"`
}

type PlayerState struct {
	ID                string  `json:"id"`
	Position          Vec3    `json:"position"`
	Rotation          Vec3    `json:"rotation"`
	Velocity          Vec3    `json:"velocity"`
	Speed             float64 `json:"speed"`
	HP                float64 `json:"hp"`
	Alive             bool    `json:"alive"`
	InvulnerableUntil int64   `json:"invulnerableUntil"`
	RespawnAt         int64   `json:"respawnAt"`
	Parked            bool    `json:"parked"`
}

type BulletState struct {
	ID        int64  `json:"id"`
	OwnerID   string `json:"ownerId"`
	Position  Vec3   `json:"position"`
	Direction Vec3   `json:"direction"`
}

type Snapshot struct {
	Type       string        `json:"type"`
	Tick       int64         `json:"tick"`
	ServerTime int64         `json:"serverTime"`
	Players    []PlayerState `json:"players"`
	Bullets    []BulletState `json:"bullets"`
}

type GameEvent struct {
	ID       int64   `json:"id"`
	Type     string  `json:"type"`
	At       int64   `json:"at"`
	SourceID *string `json:"sourceId,omitempty"`
	TargetID *string `json:"targetId,omitempty"`
	Position *Vec3   `json:"position,omitempty"`
	Text     *string `json:"text,omitempty"`
}

type GameEvents struct {
	Type   string      `json:"type"`
	Events []GameEvent `json:"events"`
}

type Standing struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	PlaneID string `json:"planeId"`
	Score   int    `json:"score"`
	Kills   int    `json:"kills"`
	Deaths  int    `json:"deaths"`
	Damage  int    `json:"damage"`
}

type Result struct {
	Type            string     `json:"type"`
	Standings       []Standing `json:"standings"`
	DurationSeconds int        `json:"durationSeconds"`
}

type ErrorMessage struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type Pong struct {
	Type       string `json:"type"`
	At         int64  `json:"at"`
	ServerTime int64  `json:"serverTime"`
}

func Clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func StringPtr(value string) *string { return &value }
func Vec3Ptr(value Vec3) *Vec3       { return &value }
func Int64Ptr(value int64) *int64    { return &value }
