package simulation

import (
	"testing"

	"classroom-arena/server/internal/config"
)

func TestBulletHitsDeskMatchesLinearScan(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}
	for _, desk := range data.DeskColliders {
		position := config.Vec3{
			(desk.Min[0] + desk.Max[0]) / 2,
			(desk.Min[1] + desk.Max[1]) / 2,
			(desk.Min[2] + desk.Max[2]) / 2,
		}
		if !BulletHitsDesk(position, data) {
			t.Fatalf("indexed collision missed desk center %v", position)
		}
	}
	if BulletHitsDesk(config.Vec3{0, 8, 0}, data) {
		t.Fatal("unexpected collision above desks")
	}
}
