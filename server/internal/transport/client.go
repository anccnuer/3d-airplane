package transport

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
	Done chan struct{}
	once sync.Once
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

func (c *Client) Enqueue(message any) {
	payload, err := json.Marshal(message)
	if err != nil {
		return
	}
	select {
	case c.Send <- payload:
	default:
		c.Close()
	}
}

func (c *Client) writeLoop() {
	for {
		select {
		case payload := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
				c.Close()
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, payload); err != nil {
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
