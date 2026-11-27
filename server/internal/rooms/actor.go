package rooms

import (
	"context"
	"sync"
	"time"

	"classroom-arena/server/internal/observability"
)

type RoomActor struct {
	manager *Manager
	room    *Room
	stop    chan struct{}
	once    sync.Once
}

func (m *Manager) startActorLocked(room *Room) {
	if room.actor != nil {
		return
	}
	actor := &RoomActor{manager: m, room: room, stop: make(chan struct{})}
	room.actor = actor
	go actor.run()
}

func (m *Manager) stopActorLocked(room *Room) {
	if room.actor == nil {
		return
	}
	room.actor.once.Do(func() { close(room.actor.stop) })
	room.actor = nil
}

func (a *RoomActor) run() {
	interval := time.Second / time.Duration(a.manager.tickRate)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-a.stop:
			return
		case now := <-ticker.C:
			start := time.Now()
			a.manager.tickRoom(a.room, now.UnixMilli())
			if elapsed := time.Since(start); elapsed > 8*time.Millisecond {
				observability.Default.SlowTicks.Add(1)
			}
		}
	}
}

func (m *Manager) RunActors(ctx context.Context) {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			m.StopActors()
			return
		case now := <-ticker.C:
			if m.Housekeeping(now.UnixMilli()) {
				m.BroadcastRoomList()
			}
		}
	}
}

func (m *Manager) StopActors() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, room := range m.Rooms {
		m.stopActorLocked(room)
	}
}
