package ws

import (
	"log/slog"
	"net/http"
	"time"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/protocol"
	"classroom-arena/server/internal/rooms"
	"classroom-arena/server/internal/transport"
	"github.com/gorilla/websocket"
)

type Handler struct {
	Manager  *rooms.Manager
	Data     *config.GameData
	Logger   *slog.Logger
	Upgrader websocket.Upgrader
}

func NewHandler(manager *rooms.Manager, data *config.GameData, logger *slog.Logger) *Handler {
	return &Handler{
		Manager: manager,
		Data:    data,
		Logger:  logger,
		Upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (h *Handler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	connection, err := h.Upgrader.Upgrade(writer, request, nil)
	if err != nil {
		h.Logger.Warn("websocket upgrade failed", "error", err)
		return
	}
	client := transport.NewClient(connection)
	defer client.Close()

	client.Enqueue(protocol.RoomList{Type: "room_list", Rooms: h.Manager.Summarize()})

	rateStart := time.Now().UnixMilli()
	messageCount := 0
	for {
		_, raw, err := connection.ReadMessage()
		if err != nil {
			break
		}

		now := time.Now().UnixMilli()
		if now-rateStart > 1000 {
			rateStart = now
			messageCount = 0
		}
		messageCount++
		if messageCount > 120 {
			h.Logger.Warn("client message rate limit exceeded")
			continue
		}

		func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					h.Logger.Error("recovered from client message panic", "error", recovered)
				}
			}()
			h.handleMessage(client, raw)
		}()
	}

	context := h.Manager.Context(client)
	h.Manager.MarkDisconnected(client)
	if context.Room != nil {
		h.Manager.BroadcastRoomState(context.Room)
	}
	h.Manager.BroadcastRoomList()
}

func (h *Handler) handleMessage(client *transport.Client, raw []byte) {
	message, err := protocol.Decode(raw, h.Data)
	if err != nil {
		h.Logger.Warn("rejected client message", "error", err)
		return
	}

	now := time.Now().UnixMilli()
	switch value := message.(type) {
	case protocol.CreateRoom:
		result := h.Manager.CreateRoom(client, value.Name, value.RoomName, value.PlaneID)
		if !result.OK() {
			h.Manager.SendError(client, result.Message)
			return
		}
		h.Manager.SendWelcome(client, result, now)
		h.Manager.BroadcastRoomList()
		h.Manager.BroadcastRoomState(result.Room)
	case protocol.JoinRoom:
		result := h.Manager.JoinRoom(client, value.Name, value.Code, value.PlaneID)
		if !result.OK() {
			h.Manager.SendError(client, result.Message)
			return
		}
		h.Manager.SendWelcome(client, result, now)
		h.Manager.BroadcastRoomList()
		h.Manager.BroadcastRoomState(result.Room)
	case protocol.Reconnect:
		result := h.Manager.Reconnect(value.Token, client)
		if !result.OK() {
			h.Manager.SendError(client, "重连失败，请重新加入房间")
			return
		}
		h.Manager.SendWelcome(client, result, now)
		h.Manager.BroadcastRoomState(result.Room)
	case protocol.Ping:
		client.Enqueue(protocol.Pong{Type: "pong", At: value.At, ServerTime: now})
	case protocol.SetPlane:
		context := h.Manager.Context(client)
		if context.Room == nil {
			return
		}
		h.Manager.SetPlane(context.Player.ID, value.PlaneID)
		h.Manager.BroadcastRoomState(context.Room)
	case protocol.SetReady:
		context := h.Manager.Context(client)
		if context.Room == nil {
			return
		}
		h.Manager.SetReady(context.Player.ID, value.Ready)
		h.Manager.BroadcastRoomState(context.Room)
	case protocol.LeaveRoom:
		context := h.Manager.Context(client)
		if context.Room == nil {
			return
		}
		h.Manager.LeavePlayer(context.Player.ID)
		h.Manager.BroadcastRoomList()
		h.Manager.BroadcastRoomState(context.Room)
	case protocol.InputCommand:
		h.Manager.ApplyInput(client, value)
	}
}
