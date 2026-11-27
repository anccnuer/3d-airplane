package config

import (
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	Port     string
	TickRate int
	LogLevel slog.Level
	Data     *GameData
}

func Load(data *GameData) Config {
	return Config{
		Port:     envString("PORT", "60000"),
		TickRate: envInt("TICK_RATE", data.TickRate),
		LogLevel: parseLevel(envString("LOG_LEVEL", "info")),
		Data:     data,
	}
}

func envString(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func parseLevel(value string) slog.Level {
	switch value {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
