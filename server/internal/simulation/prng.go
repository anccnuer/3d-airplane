package simulation

import "math/rand"

type RoomPRNG struct {
	source *rand.Rand
	seed   int64
}

func NewRoomPRNG(seed int64) *RoomPRNG {
	return &RoomPRNG{source: rand.New(rand.NewSource(seed)), seed: seed}
}

func (p *RoomPRNG) Float64() float64 {
	return p.source.Float64()
}

func (p *RoomPRNG) Seed() int64 {
	return p.seed
}
