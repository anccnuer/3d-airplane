package simulation

import (
	"sync"

	"classroom-arena/server/internal/config"
)

const deskCellSize = 4.0

type cellKey struct {
	x int
	z int
}

type DeskIndex struct {
	cells map[cellKey][]config.Aabb
}

var deskIndexes sync.Map

func GetDeskIndex(data *config.GameData) *DeskIndex {
	if value, ok := deskIndexes.Load(data); ok {
		return value.(*DeskIndex)
	}
	index := &DeskIndex{cells: make(map[cellKey][]config.Aabb)}
	for _, desk := range data.DeskColliders {
		minCell := cellKey{x: int(desk.Min[0] / deskCellSize), z: int(desk.Min[2] / deskCellSize)}
		maxCell := cellKey{x: int(desk.Max[0] / deskCellSize), z: int(desk.Max[2] / deskCellSize)}
		for x := minCell.x; x <= maxCell.x; x++ {
			for z := minCell.z; z <= maxCell.z; z++ {
				key := cellKey{x: x, z: z}
				index.cells[key] = append(index.cells[key], desk)
			}
		}
	}
	actual, _ := deskIndexes.LoadOrStore(data, index)
	return actual.(*DeskIndex)
}

func (index *DeskIndex) Query(position config.Vec3, radius float64) []config.Aabb {
	minCell := cellKey{x: int((position[0] - radius) / deskCellSize), z: int((position[2] - radius) / deskCellSize)}
	maxCell := cellKey{x: int((position[0] + radius) / deskCellSize), z: int((position[2] + radius) / deskCellSize)}
	result := make([]config.Aabb, 0, 8)
	for x := minCell.x; x <= maxCell.x; x++ {
		for z := minCell.z; z <= maxCell.z; z++ {
			result = append(result, index.cells[cellKey{x: x, z: z}]...)
		}
	}
	return result
}
