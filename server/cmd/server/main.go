package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"classroom-arena/server/internal/config"
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

	manager := rooms.NewManager(data)
	handler := ws.NewHandler(manager, data, logger)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte("ok"))
	})
	mux.Handle("/", handler)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go runTickLoop(manager, cfg.TickRate, logger)

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
	graceCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(graceCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}

func runTickLoop(manager *rooms.Manager, tickRate int, logger *slog.Logger) {
	ticker := time.NewTicker(time.Second / time.Duration(tickRate))
	defer ticker.Stop()
	for range ticker.C {
		start := time.Now()
		manager.Tick(time.Now().UnixMilli())
		if elapsed := time.Since(start); elapsed > 8*time.Millisecond {
			logger.Warn("slow tick", "elapsed", elapsed)
		}
	}
}
