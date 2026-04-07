package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"revornix-gateway/internal/config"
	"revornix-gateway/internal/gateway"
)

func main() {
	cfg, err := config.Load(".env")
	if err != nil {
		log.Fatalf("failed to load gateway config: %v", err)
	}

	app := gateway.New(cfg)
	server := &http.Server{
		Addr:              cfg.ListenAddr(),
		Handler:           app.Handler(),
		ReadHeaderTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("[gateway] listening on %s", cfg.ListenAddr())
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("gateway listen failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[gateway] shutdown failed: %v", err)
	}

	snapshot, _ := json.Marshal(app.HealthPayload())
	log.Printf("[gateway] stopped %s", snapshot)
}
