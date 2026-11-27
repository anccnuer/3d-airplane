package rooms

import (
	"reflect"
	"testing"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
	"classroom-arena/server/internal/simulation"
)

func TestRoomReplayIsDeterministicWithSameSeed(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}

	run := func() []protocol.Snapshot {
		prng := simulation.NewRoomPRNG(20261127)
		now := int64(1_000_000)
		room := &Room{Code: "REPLAY", Name: "replay", State: "playing", NextEventID: 1, prng: prng, seed: 20261127}
		player := newPlayer(nil, "pilot", "sparrow", 0, data)
		player.ID = "replay-player"
		player.Token = "replay-token"
		player.Parked = false
		player.Input = protocol.InputCommand{Type: "input", Throttle: 1, Fire: true}
		player.LastInputAt = now
		room.Players = append(room.Players, player)

		manager := NewManager(data)
		snapshots := make([]protocol.Snapshot, 0, 12)
		for tick := 0; tick < 12; tick++ {
			now += 16
			outcome := manager.stepRoomLocked(room, now, 1/float64(data.TickRate))
			if outcome.playing {
				snapshots = append(snapshots, outcome.snapshot)
			}
		}
		return snapshots
	}

	first := run()
	second := run()
	if !reflect.DeepEqual(first, second) {
		t.Fatalf("replay snapshots differ for the same room seed")
	}
}
