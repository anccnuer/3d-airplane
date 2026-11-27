package observability

import "sync/atomic"

type Counters struct {
	SlowTicks        atomic.Int64
	SnapshotBytes    atomic.Int64
	SnapshotSends    atomic.Int64
	DroppedSnapshots atomic.Int64
	Disconnects      atomic.Int64
}

var Default Counters

func (c *Counters) Snapshot(payloadBytes int) {
	c.SnapshotSends.Add(1)
	c.SnapshotBytes.Add(int64(payloadBytes))
}
