package simulation

import (
	"math"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
)

type FlightBody struct {
	Position config.Vec3
	Rotation config.Vec3
	Velocity config.Vec3
	Speed    float64
	Parked   bool
}

func clamp(value, min, max float64) float64 {
	return math.Min(max, math.Max(min, value))
}

func lerp(from, to, amount float64) float64 {
	return from + (to-from)*amount
}

func wrapAngle(angle float64) float64 {
	const twoPi = math.Pi * 2
	return math.Mod(math.Mod(angle+math.Pi, twoPi)+twoPi, twoPi) - math.Pi
}

func forwardFromRotation(rotation config.Vec3) config.Vec3 {
	horizontal := math.Cos(rotation[1])
	return config.Vec3{
		math.Sin(rotation[0]) * horizontal,
		math.Sin(rotation[1]),
		math.Cos(rotation[0]) * horizontal,
	}
}

func ForwardFromRotation(rotation config.Vec3) config.Vec3 {
	return forwardFromRotation(rotation)
}

func AdvanceFlight(body *FlightBody, input protocol.InputCommand, plane *config.Plane, dt float64) {
	if body.Parked {
		if input.Throttle <= 0 {
			body.Velocity = config.Vec3{}
			body.Speed = 0
			return
		}
		body.Parked = false
		body.Speed = plane.MinSpeed
	}

	yawInput := clamp(input.Yaw+input.Roll*0.18, -1, 1)

	body.Rotation[0] = wrapAngle(body.Rotation[0] - yawInput*plane.TurnRate*dt)
	body.Rotation[1] = clamp(body.Rotation[1]+input.Pitch*plane.PitchRate*dt, -1.25, 1.25)

	targetRoll := clamp(-input.Roll*0.65-yawInput*0.32, -0.9, 0.9)
	body.Rotation[2] = lerp(body.Rotation[2], targetRoll, math.Min(1, dt*8))

	throttle := clamp(input.Throttle, -1, 1)
	acceleration := plane.Acceleration
	if throttle < 0 {
		acceleration *= 1.5
	}
	body.Speed = clamp(body.Speed+throttle*acceleration*dt, plane.MinSpeed, plane.MaxSpeed)

	forward := forwardFromRotation(body.Rotation)
	body.Velocity = forward.Scale(body.Speed)
	body.Position = body.Position.Add(body.Velocity.Scale(dt))
}
