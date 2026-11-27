package protocol

import (
	"testing"

	"classroom-arena/server/internal/config"
)

func TestBinaryEnvelopeRoundTrip(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}
	frame, err := MarshalEnvelope(Ping{Type: "ping", At: 1234}, 7, 9)
	if err != nil {
		t.Fatal(err)
	}
	message, info, err := DecodeFrame(frame, data)
	if err != nil {
		t.Fatal(err)
	}
	ping, ok := message.(Ping)
	if !ok || ping.At != 1234 {
		t.Fatalf("unexpected message %#v", message)
	}
	if info.Version != 2 || info.Tick != 7 || info.Ack != 9 {
		t.Fatalf("unexpected frame info %#v", info)
	}
}

func TestBinaryEnvelopeRejectsWrongLength(t *testing.T) {
	data, err := config.LoadGameData()
	if err != nil {
		t.Fatal(err)
	}
	frame := []byte("ARNA\x02\x09\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\x7f")
	if _, _, err := DecodeFrame(frame, data); err == nil {
		t.Fatal("expected malformed frame error")
	}
}
