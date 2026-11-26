package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type smokeClient struct {
	conn    *websocket.Conn
	mu      sync.Mutex
	writeMu sync.Mutex
	history []map[string]any
	label   string
}

func connect(label, url string) (*smokeClient, error) {
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		return nil, err
	}
	client := &smokeClient{conn: conn, label: label}
	go client.readLoop()
	return client, nil
}

func (c *smokeClient) readLoop() {
	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var message map[string]any
		if err := json.Unmarshal(raw, &message); err != nil {
			continue
		}
		c.mu.Lock()
		c.history = append(c.history, message)
		c.mu.Unlock()
	}
}

func (c *smokeClient) send(message map[string]any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return c.conn.WriteJSON(message)
}

func (c *smokeClient) wait(predicate func(map[string]any) bool, timeout time.Duration, description string) (map[string]any, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		c.mu.Lock()
		for _, message := range c.history {
			if predicate(message) {
				c.mu.Unlock()
				return message, nil
			}
		}
		c.mu.Unlock()
		time.Sleep(5 * time.Millisecond)
	}
	return nil, fmt.Errorf("%s: timeout waiting for %s", c.label, description)
}

func isType(message map[string]any, value string) bool {
	return message["type"] == value
}

func roomPlayers(message map[string]any) (map[string]any, []any) {
	room, _ := message["room"].(map[string]any)
	players, _ := room["players"].([]any)
	return room, players
}

func playerFor(players []any, playerID string) map[string]any {
	for _, entry := range players {
		player, _ := entry.(map[string]any)
		if player["id"] == playerID {
			return player
		}
	}
	return nil
}

func snapshotPlayer(message map[string]any, playerID string) map[string]any {
	players, _ := message["players"].([]any)
	return playerFor(players, playerID)
}

func asFloat(value any) float64 {
	number, _ := value.(float64)
	return number
}

func sendInputs(client *smokeClient, throttle float64, fire bool, duration time.Duration) {
	ticker := time.NewTicker(1000 / 60 * time.Millisecond)
	defer ticker.Stop()
	sequence := 0
	deadline := time.Now().Add(duration)
	for time.Now().Before(deadline) {
		<-ticker.C
		sequence++
		_ = client.send(map[string]any{
			"type": "input", "seq": sequence, "tick": sequence,
			"throttle": throttle, "pitch": 0, "yaw": 0, "roll": 0, "fire": fire,
		})
	}
}

func sendInputsUntil(client *smokeClient, throttle float64, fire bool, timeout time.Duration, done func() bool) {
	ticker := time.NewTicker(1000 / 60 * time.Millisecond)
	defer ticker.Stop()
	sequence := 0
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) && !done() {
		<-ticker.C
		sequence++
		_ = client.send(map[string]any{
			"type": "input", "seq": sequence, "tick": sequence,
			"throttle": throttle, "pitch": 0, "yaw": 0, "roll": 0, "fire": fire,
		})
	}
}

func hasLifecycleEvent(client *smokeClient, eventType, playerID string) bool {
	client.mu.Lock()
	defer client.mu.Unlock()
	for _, message := range client.history {
		if !isType(message, "game_events") {
			continue
		}
		events, _ := message["events"].([]any)
		for _, entry := range events {
			event, _ := entry.(map[string]any)
			if event["type"] == eventType && event["targetId"] == playerID {
				return true
			}
		}
	}
	return false
}

func main() {
	url := os.Getenv("GAME_WS")
	if url == "" {
		url = "ws://127.0.0.1:8080"
	}

	first, err := connect("player-1", url)
	if err != nil {
		panic(err)
	}
	second, err := connect("player-2", url)
	if err != nil {
		panic(err)
	}
	defer first.conn.Close()
	defer second.conn.Close()

	if err := first.send(map[string]any{"type": "create_room", "name": "冒烟测试一号", "roomName": "协议测试空域", "planeId": "sparrow"}); err != nil {
		panic(err)
	}
	created, err := first.wait(func(message map[string]any) bool {
		_, players := roomPlayers(message)
		return isType(message, "room_state") && len(players) == 1
	}, 8*time.Second, "room creation")
	if err != nil {
		panic(err)
	}
	room, players := roomPlayers(created)
	code, _ := room["code"].(string)
	firstID, _ := playerFor(players, "")["id"].(string)
	_ = firstID
	firstID = ""
	for _, entry := range players {
		player, _ := entry.(map[string]any)
		firstID, _ = player["id"].(string)
	}

	for _, planeID := range []string{"sparrow", "falcon", "anvil", "dragonfly", "comet"} {
		_ = first.send(map[string]any{"type": "set_plane", "planeId": planeID})
		_, err := first.wait(func(message map[string]any) bool {
			_, current := roomPlayers(message)
			player := playerFor(current, firstID)
			return isType(message, "room_state") && player != nil && player["planeId"] == planeID
		}, 4*time.Second, "plane "+planeID)
		if err != nil {
			panic(err)
		}
	}

	if err := second.send(map[string]any{"type": "join_room", "name": "冒烟测试二号", "code": code, "planeId": "falcon"}); err != nil {
		panic(err)
	}
	for _, client := range []*smokeClient{first, second} {
		_, err := client.wait(func(message map[string]any) bool {
			_, current := roomPlayers(message)
			return isType(message, "room_state") && len(current) == 2
		}, 8*time.Second, "second player")
		if err != nil {
			panic(err)
		}
	}

	_ = first.send(map[string]any{"type": "set_ready", "ready": true})
	_ = second.send(map[string]any{"type": "set_ready", "ready": true})
	for _, client := range []*smokeClient{first, second} {
		_, err := client.wait(func(message map[string]any) bool {
			return isType(message, "match_start")
		}, 10*time.Second, "match start")
		if err != nil {
			panic(err)
		}
	}

	parked, err := second.wait(func(message map[string]any) bool {
		player := snapshotPlayer(message, firstID)
		return isType(message, "snapshot") && player != nil && player["parked"] == true && asFloat(player["speed"]) == 0
	}, 6*time.Second, "parked desk spawn")
	if err != nil {
		panic(err)
	}
	player := snapshotPlayer(parked, firstID)
	position, _ := player["position"].([]any)
	if len(position) < 2 || asFloat(position[1]) <= 2.4 {
		panic(errors.New("player did not spawn on a desk top"))
	}
	if player["alive"] != true || asFloat(player["hp"]) <= 0 || asFloat(player["respawnAt"]) != 0 {
		panic(fmt.Errorf("invalid parked state: alive=%v hp=%v respawnAt=%v", player["alive"], player["hp"], player["respawnAt"]))
	}

	sendInputs(first, 0, true, 300*time.Millisecond)
	second.mu.Lock()
	for _, message := range second.history {
		if isType(message, "snapshot") && len(message["bullets"].([]any)) > 0 {
			second.mu.Unlock()
			panic(errors.New("bullets were created while parked"))
		}
	}
	second.mu.Unlock()

	sendInputs(first, 1, true, 1200*time.Millisecond)
	_, err = second.wait(func(message map[string]any) bool {
		player := snapshotPlayer(message, firstID)
		return isType(message, "snapshot") && player != nil && player["parked"] == false && asFloat(player["speed"]) > 0
	}, 6*time.Second, "throttle takeoff")
	if err != nil {
		panic(err)
	}
	_, err = second.wait(func(message map[string]any) bool {
		if !isType(message, "snapshot") {
			return false
		}
		bullets, _ := message["bullets"].([]any)
		return len(bullets) > 0
	}, 6*time.Second, "synchronized bullets")
	if err != nil {
		panic(err)
	}
	_, err = first.wait(func(message map[string]any) bool {
		if !isType(message, "game_events") {
			return false
		}
		events, _ := message["events"].([]any)
		for _, entry := range events {
			event, _ := entry.(map[string]any)
			if event["type"] == "fire" {
				return true
			}
		}
		return false
	}, 6*time.Second, "fire event")
	if err != nil {
		panic(err)
	}

	sendInputsUntil(first, 1, false, 20*time.Second, func() bool {
		return hasLifecycleEvent(first, "kill", firstID)
	})
	if !hasLifecycleEvent(first, "kill", firstID) {
		panic(errors.New("player did not die after repeated collisions"))
	}
	_, err = first.wait(func(message map[string]any) bool {
		if !isType(message, "game_events") {
			return false
		}
		events, _ := message["events"].([]any)
		for _, entry := range events {
			event, _ := entry.(map[string]any)
			if event["type"] == "respawn" && event["targetId"] == firstID {
				return true
			}
		}
		return false
	}, 8*time.Second, "respawn event")
	if err != nil {
		panic(err)
	}
	_, err = second.wait(func(message map[string]any) bool {
		state := snapshotPlayer(message, firstID)
		return isType(message, "snapshot") && state != nil &&
			state["alive"] == true && asFloat(state["hp"]) > 0 &&
			asFloat(state["respawnAt"]) == 0
	}, 6*time.Second, "healthy respawn snapshot")
	if err != nil {
		panic(err)
	}

	fmt.Printf("OK room=%s planes=5 parkedDesk=true aliveParked=true noFireWhileParked=true takeoff=true bullets=synced killRespawn=true players=2\n", code)
}
