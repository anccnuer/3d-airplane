package protocol

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol/generated"
)

type FrameInfo struct {
	Version int
	Type    byte
	Tick    uint32
	Ack     uint32
}

func TypeCode(message any) byte {
	switch message.(type) {
	case Hello:
		return generated.MessageTypeHello
	case HelloAck:
		return generated.MessageTypeHelloAck
	case CreateRoom:
		return generated.MessageTypeCreateRoom
	case JoinRoom:
		return generated.MessageTypeJoinRoom
	case Reconnect:
		return generated.MessageTypeReconnect
	case SetPlane:
		return generated.MessageTypeSetPlane
	case SetReady:
		return generated.MessageTypeSetReady
	case LeaveRoom:
		return generated.MessageTypeLeaveRoom
	case Ping:
		return generated.MessageTypePing
	case InputCommand:
		return generated.MessageTypeInput
	case Welcome:
		return generated.MessageTypeWelcome
	case RoomList:
		return generated.MessageTypeRoomList
	case RoomState:
		return generated.MessageTypeRoomState
	case MatchStart:
		return generated.MessageTypeMatchStart
	case Snapshot:
		return generated.MessageTypeSnapshot
	case SnapshotDelta:
		return generated.MessageTypeSnapshotDelta
	case GameEvents:
		return generated.MessageTypeGameEvents
	case Result:
		return generated.MessageTypeResult
	case ErrorMessage:
		return generated.MessageTypeError
	case Pong:
		return generated.MessageTypePong
	default:
		return 0
	}
}

func MarshalEnvelope(message any, tick, ack uint32) ([]byte, error) {
	payload, err := json.Marshal(message)
	if err != nil {
		return nil, err
	}
	typeCode := TypeCode(message)
	if typeCode == 0 {
		return nil, fmt.Errorf("unknown message type %T", message)
	}
	return WrapEnvelope(payload, typeCode, tick, ack), nil
}

func WrapEnvelope(payload []byte, typeCode byte, tick, ack uint32) []byte {
	frame := make([]byte, generated.EnvelopeHeaderBytes+len(payload))
	copy(frame, generated.ProtocolMagic)
	frame[4] = byte(generated.ProtocolVersion)
	frame[5] = typeCode
	binary.LittleEndian.PutUint32(frame[6:10], tick)
	binary.LittleEndian.PutUint32(frame[10:14], ack)
	binary.LittleEndian.PutUint32(frame[14:18], uint32(len(payload)))
	copy(frame[generated.EnvelopeHeaderBytes:], payload)
	return frame
}

func UnwrapEnvelope(raw []byte) ([]byte, FrameInfo, error) {
	if len(raw) < generated.EnvelopeHeaderBytes || string(raw[:4]) != generated.ProtocolMagic {
		return raw, FrameInfo{Version: 1}, nil
	}
	if raw[4] != byte(generated.ProtocolVersion) {
		return nil, FrameInfo{}, fmt.Errorf("unsupported protocol version %d", raw[4])
	}
	info := FrameInfo{
		Version: int(raw[4]),
		Type:    raw[5],
		Tick:    binary.LittleEndian.Uint32(raw[6:10]),
		Ack:     binary.LittleEndian.Uint32(raw[10:14]),
	}
	length := int(binary.LittleEndian.Uint32(raw[14:18]))
	if length <= 0 || len(raw) < generated.EnvelopeHeaderBytes+length {
		return nil, info, errors.New("invalid binary frame length")
	}
	return raw[generated.EnvelopeHeaderBytes : generated.EnvelopeHeaderBytes+length], info, nil
}

func DecodeFrame(raw []byte, data *config.GameData) (any, FrameInfo, error) {
	payload, info, err := UnwrapEnvelope(raw)
	if err != nil {
		return nil, info, err
	}
	message, err := Decode(payload, data)
	if err != nil {
		return nil, info, err
	}
	if info.Version >= 2 && TypeCode(message) != info.Type {
		return nil, info, fmt.Errorf("binary frame type mismatch: header=%d payload=%d", info.Type, TypeCode(message))
	}
	return message, info, nil
}
