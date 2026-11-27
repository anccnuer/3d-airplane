package simulation

import (
	"math"

	"classroom-arena/server/internal/config"
)

type CollisionResult struct {
	Position config.Vec3
	Hit      bool
}

func resolveSphereAabb(position config.Vec3, radius float64, box config.Aabb) CollisionResult {
	closest := config.Vec3{
		clamp(position[0], box.Min[0], box.Max[0]),
		clamp(position[1], box.Min[1], box.Max[1]),
		clamp(position[2], box.Min[2], box.Max[2]),
	}
	delta := config.Vec3{position[0] - closest[0], position[1] - closest[1], position[2] - closest[2]}
	distanceSq := delta[0]*delta[0] + delta[1]*delta[1] + delta[2]*delta[2]
	if distanceSq > radius*radius {
		return CollisionResult{Position: position, Hit: false}
	}

	if distanceSq > 1e-8 {
		distance := math.Sqrt(distanceSq)
		push := radius - distance
		return CollisionResult{
			Position: config.Vec3{
				position[0] + delta[0]/distance*push,
				position[1] + delta[1]/distance*push,
				position[2] + delta[2]/distance*push,
			},
			Hit: true,
		}
	}

	faces := []struct {
		distance float64
		normal   config.Vec3
	}{
		{position[0] - box.Min[0], config.Vec3{-1, 0, 0}},
		{box.Max[0] - position[0], config.Vec3{1, 0, 0}},
		{position[1] - box.Min[1], config.Vec3{0, -1, 0}},
		{box.Max[1] - position[1], config.Vec3{0, 1, 0}},
		{position[2] - box.Min[2], config.Vec3{0, 0, -1}},
		{box.Max[2] - position[2], config.Vec3{0, 0, 1}},
	}
	nearest := faces[0]
	for _, face := range faces[1:] {
		if face.distance < nearest.distance {
			nearest = face
		}
	}
	push := nearest.distance + radius
	return CollisionResult{
		Position: config.Vec3{
			position[0] + nearest.normal[0]*push,
			position[1] + nearest.normal[1]*push,
			position[2] + nearest.normal[2]*push,
		},
		Hit: true,
	}
}

func ClampToWorld(position config.Vec3, data *config.GameData) CollisionResult {
	result := CollisionResult{Position: position, Hit: false}
	radius := data.PlayerRadius
	minX := -data.World.Width/2 + radius
	maxX := data.World.Width/2 - radius
	minZ := -data.World.Depth/2 + radius
	maxZ := data.World.Depth/2 - radius
	minY := data.MinFlightHeight
	maxY := data.World.Height - radius

	if result.Position[0] < minX {
		result.Position[0] = minX
		result.Hit = true
	} else if result.Position[0] > maxX {
		result.Position[0] = maxX
		result.Hit = true
	}
	if result.Position[1] < minY {
		result.Position[1] = minY
		result.Hit = true
	} else if result.Position[1] > maxY {
		result.Position[1] = maxY
		result.Hit = true
	}
	if result.Position[2] < minZ {
		result.Position[2] = minZ
		result.Hit = true
	} else if result.Position[2] > maxZ {
		result.Position[2] = maxZ
		result.Hit = true
	}
	return result
}

func ResolveDeskCollisions(body *FlightBody, data *config.GameData) bool {
	collided := false
	index := GetDeskIndex(data)
	for _, desk := range index.Query(body.Position, data.PlayerRadius) {
		result := resolveSphereAabb(body.Position, data.PlayerRadius, desk)
		if !result.Hit {
			continue
		}
		body.Position = result.Position
		body.Speed *= 0.82
		collided = true
	}
	return collided
}

func BulletHitsWorld(position config.Vec3, data *config.GameData) bool {
	halfWidth := data.World.Width / 2
	halfDepth := data.World.Depth / 2
	return position[0] < -halfWidth || position[0] > halfWidth ||
		position[1] < 0 || position[1] > data.World.Height ||
		position[2] < -halfDepth || position[2] > halfDepth
}

func BulletHitsDesk(position config.Vec3, data *config.GameData) bool {
	padding := data.BulletRadius
	index := GetDeskIndex(data)
	for _, desk := range index.Query(position, padding) {
		if position[0] >= desk.Min[0]-padding && position[0] <= desk.Max[0]+padding &&
			position[1] >= desk.Min[1]-padding && position[1] <= desk.Max[1]+padding &&
			position[2] >= desk.Min[2]-padding && position[2] <= desk.Max[2]+padding {
			return true
		}
	}
	return false
}

func BulletHitsPlayer(bulletPosition, playerPosition config.Vec3, data *config.GameData) bool {
	radius := data.PlayerRadius + data.BulletRadius*2
	dx := bulletPosition[0] - playerPosition[0]
	dy := bulletPosition[1] - playerPosition[1]
	dz := bulletPosition[2] - playerPosition[2]
	return dx*dx+dy*dy+dz*dz <= radius*radius
}
