package rooms

import (
	"testing"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
)

func TestParkedPlayersStayAliveWithoutInput(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}

	now := int64(1_000_000)
	room := &Room{
		Code:        "TEST1",
		Name:        "parked test",
		State:       "lobby",
		NextEventID: 1,
	}
	for index, planeID := range []string{"sparrow", "falcon"} {
		room.Players = append(room.Players, newPlayer(nil, "pilot"+string(rune('A'+index)), planeID, index, data))
	}

	manager := NewManager(data)
	startMatch(room, now, data)
	dt := 1 / float64(data.TickRate)
	stepMs := int64(1000 / data.TickRate)

	for tick := 0; tick < data.TickRate*5; tick++ {
		now += stepMs
		outcome := manager.stepRoomLocked(room, now, dt)
		for _, event := range outcome.events {
			if event.Type == "kill" || event.Type == "respawn" {
				t.Fatalf("unexpected lifecycle event at tick %d: %s", tick, event.Type)
			}
		}

		snapshot := buildSnapshotLocked(room, now, int64(tick))
		assertSnapshotPlayersAlive(t, snapshot, room, tick)
	}
}

func TestSnapshotNeverReportsInconsistentDeath(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}

	now := int64(1_000_000)
	room := &Room{Code: "TEST2", Name: "snapshot test", State: "playing", NextEventID: 1}
	player := newPlayer(nil, "pilot", "sparrow", 0, data)
	room.Players = append(room.Players, player)

	manager := NewManager(data)
	manager.killPlayerLocked(room, player, nil, now, &[]protocol.GameEvent{})
	if player.Alive || player.HP != 0 || player.RespawnAt <= now {
		t.Fatalf("kill state invalid: alive=%v hp=%v respawnAt=%v now=%v", player.Alive, player.HP, player.RespawnAt, now)
	}

	snapshot := buildSnapshotLocked(room, now, 1)
	if len(snapshot.Players) != 1 {
		t.Fatalf("snapshot players = %d, want 1", len(snapshot.Players))
	}
	state := snapshot.Players[0]
	if state.Alive || state.HP != 0 || state.RespawnAt <= now {
		t.Fatalf("snapshot death state invalid: alive=%v hp=%v respawnAt=%v now=%v", state.Alive, state.HP, state.RespawnAt, now)
	}
}

func assertSnapshotPlayersAlive(t *testing.T, snapshot protocol.Snapshot, room *Room, tick int) {
	t.Helper()
	if len(snapshot.Players) != len(room.Players) {
		t.Fatalf("tick %d: snapshot players = %d, want %d", tick, len(snapshot.Players), len(room.Players))
	}
	for index, state := range snapshot.Players {
		player := room.Players[index]
		if !state.Alive || state.HP <= 0 {
			t.Fatalf("tick %d: player %s reported dead: alive=%v hp=%v", tick, state.ID, state.Alive, state.HP)
		}
		if state.ID != player.ID || state.HP != player.HP || state.Parked != player.Parked {
			t.Fatalf("tick %d: snapshot state mismatch for %s", tick, state.ID)
		}
		if state.RespawnAt != 0 {
			t.Fatalf("tick %d: player %s has unexpected respawnAt %d", tick, state.ID, state.RespawnAt)
		}
	}
}
