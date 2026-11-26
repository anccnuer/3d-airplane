package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"sync"
)

//go:embed game_data.json
var gameDataFS embed.FS

type Vec3 [3]float64

type Aabb struct {
	Min Vec3 `json:"min"`
	Max Vec3 `json:"max"`
}

type Plane struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Role         string  `json:"role"`
	Description  string  `json:"description"`
	Color        string  `json:"color"`
	Model        string  `json:"model"`
	MinSpeed     float64 `json:"minSpeed"`
	MaxSpeed     float64 `json:"maxSpeed"`
	Acceleration float64 `json:"acceleration"`
	TurnRate     float64 `json:"turnRate"`
	PitchRate    float64 `json:"pitchRate"`
	HP           float64 `json:"hp"`
	Damage       float64 `json:"damage"`
	FireRate     float64 `json:"fireRate"`
	BulletSpeed  float64 `json:"bulletSpeed"`
	Wingspan     float64 `json:"wingspan"`
}

type World struct {
	Width         float64 `json:"width"`
	Depth         float64 `json:"depth"`
	Height        float64 `json:"height"`
	WallThickness float64 `json:"wallThickness"`
}

type GameData struct {
	TickRate                 int      `json:"tickRate"`
	MatchSeconds             int      `json:"matchSeconds"`
	RespawnSeconds           float64  `json:"respawnSeconds"`
	SpawnInvulnerableSeconds float64  `json:"spawnInvulnerableSeconds"`
	DisconnectGraceSeconds   float64  `json:"disconnectGraceSeconds"`
	MaxPlayers               int      `json:"maxPlayers"`
	RoomCodeLength           int      `json:"roomCodeLength"`
	World                    World    `json:"world"`
	MinFlightHeight          float64  `json:"minFlightHeight"`
	PlayerRadius             float64  `json:"playerRadius"`
	BulletRadius             float64  `json:"bulletRadius"`
	CollisionDamage          float64  `json:"collisionDamage"`
	CollisionCooldownMs      int64    `json:"collisionCooldownMs"`
	SpawnRotation            Vec3     `json:"spawnRotation"`
	SpawnPoints              []Vec3   `json:"spawnPoints"`
	DeskColliders            []Aabb   `json:"deskColliders"`
	Planes                   []Plane  `json:"planes"`
	PlayerColors             []string `json:"playerColors"`
}

var (
	dataOnce sync.Once
	data     *GameData
	dataErr  error
)

func LoadGameData() (*GameData, error) {
	dataOnce.Do(func() {
		raw, err := gameDataFS.ReadFile("game_data.json")
		if err != nil {
			dataErr = fmt.Errorf("read embedded game data: %w", err)
			return
		}
		var loaded GameData
		if err := json.Unmarshal(raw, &loaded); err != nil {
			dataErr = fmt.Errorf("parse embedded game data: %w", err)
			return
		}
		data = &loaded
	})
	return data, dataErr
}

func (d *GameData) Plane(id string) *Plane {
	for i := range d.Planes {
		if d.Planes[i].ID == id {
			return &d.Planes[i]
		}
	}
	return &d.Planes[0]
}

func (d *GameData) Spawn(index int) Vec3 {
	if len(d.SpawnPoints) == 0 {
		return Vec3{}
	}
	return d.SpawnPoints[index%len(d.SpawnPoints)]
}

func (v Vec3) Add(other Vec3) Vec3 {
	return Vec3{v[0] + other[0], v[1] + other[1], v[2] + other[2]}
}

func (v Vec3) Scale(factor float64) Vec3 {
	return Vec3{v[0] * factor, v[1] * factor, v[2] * factor}
}
