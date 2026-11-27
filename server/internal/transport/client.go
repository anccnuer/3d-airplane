package transport

import (
	"encoding/json"
	"sync"
	"time"

	"classroom-arena/server/internal/protocol"
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn    *websocket.Conn
	Send    chan []byte
	Done    chan struct{}
	once    sync.Once
	mu      sync.Mutex
	version int
	ack     uint32
}

func NewClient(conn *websocket.Conn) *Client {
	client := &Client{
		Conn: conn,
		Send: make(chan []byte, 64),
		Done: make(chan struct{}),
	}
	go client.writeLoop()
	return client
}

func (c *Client) Version() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.version
}

func (c *Client) SetVersion(version int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.version = version
}

func (c *Client) SetAck(ack uint32) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ack = ack
}

func (c *Client) Ack() uint32 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ack
}

func (c *Client) Enqueue(message any) {
	var payload []byte
	var err error
	if c.Version() >= 2 {
		payload, err = protocol.MarshalEnvelope(message, 0, 0)
	} else {
		payload, err = json.Marshal(message)
	}
	if err != nil {
		return
	}
	c.EnqueuePayload(payload, c.Version() >= 2)
}

func (c *Client) EnqueuePayload(payload []byte, binary bool) {
	select {
	case c.Send <- payload:
	default:
		c.dropOldest(binary)
	}
}

func (c *Client) dropOldest(binary bool) {
	select {
	case <-c.Send:
	default:
	}
	if binary {
		select {
		case c.Send <- []byte{}:
		default:
		}
	}
}

func (c *Client) writeLoop() {
	for {
		select {
		case payload := <-c.Send:
			if len(payload) == 0 {
				continue
			}
			messageType := websocket.TextMessage
			if len(payload) >= 18 && string(payload[:4]) == "ARNA" {
				messageType = websocket.BinaryMessage
			}
			if err := c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
				c.Close()
				return
			}
			if err := c.Conn.WriteMessage(messageType, payload); err != nil {
				c.Close()
				return
			}
		case <-c.Done:
			return
		}
	}
}

func (c *Client) Close() {
	c.once.Do(func() {
		close(c.Done)
		_ = c.Conn.Close()
	})
}
