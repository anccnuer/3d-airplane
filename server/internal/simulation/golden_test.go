package simulation

import (
	"encoding/json"
	"math"
	"os"
	"testing"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
)

type goldenVector struct {
	Name    string `json:"name"`
	PlaneID string `json:"planeId"`
	Body    struct {
		Position config.Vec3 `json:"position"`
		Rotation config.Vec3 `json:"rotation"`
		Velocity config.Vec3 `json:"velocity"`
		Speed    float64     `json:"speed"`
		Parked   bool        `json:"parked"`
	} `json:"body"`
	Input struct {
		Throttle float64 `json:"throttle"`
		Pitch    float64 `json:"pitch"`
		Yaw      float64 `json:"yaw"`
		Roll     float64 `json:"roll"`
	} `json:"input"`
	DT       float64 `json:"dt"`
	Expected struct {
		Position config.Vec3 `json:"position"`
		Rotation config.Vec3 `json:"rotation"`
		Velocity config.Vec3 `json:"velocity"`
		Speed    float64     `json:"speed"`
		Parked   bool        `json:"parked"`
	} `json:"expected"`
}

func TestGoldenFlightVectors(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile("testdata/golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var vectors []goldenVector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatal(err)
	}
	if len(vectors) == 0 {
		t.Fatal("no golden vectors")
	}

	for _, vector := range vectors {
		t.Run(vector.Name, func(t *testing.T) {
			body := FlightBody{
				Position: vector.Body.Position,
				Rotation: vector.Body.Rotation,
				Velocity: vector.Body.Velocity,
				Speed:    vector.Body.Speed,
				Parked:   vector.Body.Parked,
			}
			input := protocol.InputCommand{
				Throttle: vector.Input.Throttle,
				Pitch:    vector.Input.Pitch,
				Yaw:      vector.Input.Yaw,
				Roll:     vector.Input.Roll,
			}
			AdvanceFlight(&body, input, data.Plane(vector.PlaneID), vector.DT)

			assertVec3(t, "position", body.Position, vector.Expected.Position)
			assertVec3(t, "rotation", body.Rotation, vector.Expected.Rotation)
			assertVec3(t, "velocity", body.Velocity, vector.Expected.Velocity)
			if math.Abs(body.Speed-vector.Expected.Speed) > 1e-9 {
				t.Errorf("speed = %v, want %v", body.Speed, vector.Expected.Speed)
			}
			if body.Parked != vector.Expected.Parked {
				t.Errorf("parked = %v, want %v", body.Parked, vector.Expected.Parked)
			}
		})
	}
}

func assertVec3(t *testing.T, label string, got, want config.Vec3) {
	t.Helper()
	for i := 0; i < 3; i++ {
		if math.Abs(got[i]-want[i]) > 1e-9 {
			t.Errorf("%s[%d] = %v, want %v", label, i, got[i], want[i])
		}
	}
}
