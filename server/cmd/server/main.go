package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"classroom-arena/server/internal/config"
	"classroom-arena/server/internal/observability"
	"classroom-arena/server/internal/rooms"
	"classroom-arena/server/internal/ws"
)

func main() {
	data, err := config.LoadGameData()
	if err != nil {
		panic(err)
	}
	cfg := config.Load(data)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(logger)

	manager := rooms.NewManagerWithTickRate(data, cfg.TickRate)
	handler := ws.NewHandler(manager, data, logger, cfg.ProtocolV2Enabled)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte("ok"))
	})
	mux.HandleFunc("/metrics", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = fmt.Fprintf(writer,
			"slow_ticks %d\nsnapshot_sends %d\nsnapshot_bytes %d\ndropped_snapshots %d\ndisconnects %d\n",
			observability.Default.SlowTicks.Load(),
			observability.Default.SnapshotSends.Load(),
			observability.Default.SnapshotBytes.Load(),
			observability.Default.DroppedSnapshots.Load(),
			observability.Default.Disconnects.Load(),
		)
	})
	mux.Handle("/", handler)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	tickCtx, stopTick := context.WithCancel(context.Background())
	defer stopTick()
	go manager.RunActors(tickCtx)

	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server listening", "port", cfg.Port, "tickRate", cfg.TickRate)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server exited", "error", err)
			os.Exit(1)
		}
	}()

	<-shutdownCtx.Done()
	stopTick()
	graceCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(graceCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}

func runTickLoop(ctx context.Context, manager *rooms.Manager, tickRate int, logger *slog.Logger) {
	interval := time.Second / time.Duration(tickRate)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	last := time.Now()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			elapsed := now.Sub(last)
			last = now
			if elapsed > interval*2 {
				logger.Warn("tick loop delayed", "elapsed", elapsed)
			}
			start := time.Now()
			manager.Tick(start.UnixMilli())
			if cost := time.Since(start); cost > 8*time.Millisecond {
				logger.Warn("slow tick", "elapsed", cost)
			}
		}
	}
}
