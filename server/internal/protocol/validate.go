package protocol

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"classroom-arena/server/internal/config"
)

func Decode(raw []byte, data *config.GameData) (any, error) {
	var envelope struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, err
	}

	switch envelope.Type {
	case "hello":
		var message Hello
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		return message, nil
	case "create_room":
		var message CreateRoom
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		if err := validateIdentity(message.Name, message.RoomName, message.PlaneID, data); err != nil {
			return nil, err
		}
		return message, nil
	case "join_room":
		var message JoinRoom
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		if err := validateIdentity(message.Name, "", message.PlaneID, data); err != nil {
			return nil, err
		}
		if len(message.Code) != data.RoomCodeLength {
			return nil, errors.New("invalid room code")
		}
		return message, nil
	case "reconnect":
		var message Reconnect
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		if len(message.Token) < 8 || len(message.Token) > 100 {
			return nil, errors.New("invalid token")
		}
		return message, nil
	case "set_plane":
		var message SetPlane
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		if !validPlane(message.PlaneID, data) {
			return nil, errors.New("unknown plane")
		}
		return message, nil
	case "set_ready":
		var message SetReady
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		return message, nil
	case "leave_room":
		return LeaveRoom{Type: envelope.Type}, nil
	case "ping":
		var message Ping
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		return message, nil
	case "input":
		var message InputCommand
		if err := json.Unmarshal(raw, &message); err != nil {
			return nil, err
		}
		if message.Seq < 0 || message.Tick < 0 {
			return nil, errors.New("negative sequence or tick")
		}
		message.Throttle = Clamp(message.Throttle, -1, 1)
		message.Pitch = Clamp(message.Pitch, -1, 1)
		message.Yaw = Clamp(message.Yaw, -1, 1)
		message.Roll = Clamp(message.Roll, -1, 1)
		return message, nil
	default:
		return nil, fmt.Errorf("unknown message type %q", envelope.Type)
	}
}

func validateIdentity(name, roomName, planeID string, data *config.GameData) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" || len([]rune(trimmed)) > 16 {
		return errors.New("invalid name")
	}
	if roomName != "" {
		roomName = strings.TrimSpace(roomName)
		if roomName == "" || len([]rune(roomName)) > 24 {
			return errors.New("invalid room name")
		}
	}
	if !validPlane(planeID, data) {
		return errors.New("unknown plane")
	}
	return nil
}

func validPlane(planeID string, data *config.GameData) bool {
	for _, plane := range data.Planes {
		if plane.ID == planeID {
			return true
		}
	}
	return false
}
