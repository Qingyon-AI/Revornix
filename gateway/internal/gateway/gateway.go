package gateway

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"revornix-gateway/internal/config"
	"revornix-gateway/internal/protection"
	"revornix-gateway/internal/router"
	"revornix-gateway/internal/upstream"
)

type App struct {
	config   config.Config
	router   *router.Resolver
	pool     *upstream.Pool
	protect  *protection.Protector
	services map[string][]*url.URL
}

func New(cfg config.Config) *App {
	services := map[string][]*url.URL{
		"api":      cfg.Services.API,
		"authApi":  cfg.Services.AuthAPI,
		"hotNews":  cfg.Services.HotNews,
		"unionPay": cfg.Services.UnionPay,
	}

	return &App{
		config:   cfg,
		router:   router.New(cfg),
		pool:     upstream.New(cfg.UpstreamRetryCooldown, services),
		protect:  protection.New(cfg.Protection),
		services: services,
	}
}

func (a *App) Handler() http.Handler {
	return http.HandlerFunc(a.serveHTTP)
}

func (a *App) HealthPayload() map[string]any {
	return map[string]any{
		"ok":        true,
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		"routes":    a.router.RoutesPayload(),
		"upstreams": a.pool.Snapshot(),
	}
}

func (a *App) serveHTTP(w http.ResponseWriter, r *http.Request) {
	route := a.router.Resolve(r.Host, r.URL.Path)
	if a.config.EnableAccessLog {
		log.Printf("[gateway] %s %s%s -> %s/%s", r.Method, r.Host, r.URL.Path, route.Type, route.Service)
	}

	if rateLimitState, statusCode, message := a.protect.Check(r, route); statusCode != 0 {
		if rateLimitState != nil {
			w.Header().Set("X-RateLimit-Limit", itoa(rateLimitState.Limit))
			w.Header().Set("X-RateLimit-Remaining", itoa(max(rateLimitState.Remaining, 0)))
			w.Header().Set("X-RateLimit-Reset", itoa(int(rateLimitState.ResetAfter.Seconds())))
		}
		writeJSON(w, statusCode, map[string]any{
			"ok":      false,
			"message": message,
		})
		return
	} else if rateLimitState != nil {
		w.Header().Set("X-RateLimit-Limit", itoa(rateLimitState.Limit))
		w.Header().Set("X-RateLimit-Remaining", itoa(max(rateLimitState.Remaining, 0)))
		w.Header().Set("X-RateLimit-Reset", itoa(int(rateLimitState.ResetAfter.Seconds())))
	}

	if route.Type == "local" {
		a.serveLocal(w, route.TargetPathname)
		return
	}
	if route.Type == "reject" {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"ok":      false,
			"message": "route is not proxied by gateway",
			"service": route.Service,
			"path":    route.TargetPathname,
		})
		return
	}

	targets := a.pool.Candidates(route.Service)
	if len(targets) == 0 {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"ok":      false,
			"message": "no upstream configured for service " + route.Service,
		})
		return
	}

	for _, target := range targets {
		targetURL := joinURL(target.URL, route.TargetPathname, r.URL.RawQuery)
		if err := a.proxyRequest(w, r, route.Service, target.URL, targetURL); err == nil {
			return
		}
	}

	writeJSON(w, http.StatusBadGateway, map[string]any{
		"ok":      false,
		"message": "all upstreams failed for service " + route.Service,
	})
}

func (a *App) serveLocal(w http.ResponseWriter, pathname string) {
	switch pathname {
	case "/gateway/health":
		writeJSON(w, http.StatusOK, a.HealthPayload())
	case "/gateway/routes":
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":        true,
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
			"routes":    a.router.RoutesPayload(),
		})
	case "/gateway/upstreams":
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":        true,
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
			"upstreams": a.pool.Snapshot(),
		})
	case "/gateway/anti-scrape":
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":         true,
			"timestamp":  time.Now().UTC().Format(time.RFC3339Nano),
			"antiScrape": a.protect.StatsSnapshot(),
		})
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

func (a *App) proxyRequest(w http.ResponseWriter, r *http.Request, service string, upstreamBase, targetURL *url.URL) error {
	errCh := make(chan error, 1)

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.Out.URL.Scheme = targetURL.Scheme
			pr.Out.URL.Host = targetURL.Host
			pr.Out.URL.Path = targetURL.Path
			pr.Out.URL.RawPath = targetURL.RawPath
			pr.Out.URL.RawQuery = targetURL.RawQuery
			pr.Out.Host = targetURL.Host
			pr.Out.Header.Set("X-Forwarded-Host", r.Host)
			if r.TLS != nil {
				pr.Out.Header.Set("X-Forwarded-Proto", "https")
			} else {
				pr.Out.Header.Set("X-Forwarded-Proto", "http")
			}
			if a.config.EnableAccessLog {
				log.Printf(
					"[gateway] upstream rewrite service=%s target=%s outbound=%s",
					service,
					targetURL.String(),
					pr.Out.URL.String(),
				)
			}
		},
		FlushInterval: 100 * time.Millisecond,
		ErrorHandler: func(_ http.ResponseWriter, _ *http.Request, err error) {
			errCh <- err
		},
		ModifyResponse: func(resp *http.Response) error {
			a.pool.MarkSuccess(service, upstreamBase)
			select {
			case errCh <- nil:
			default:
			}
			return nil
		},
	}

	proxy.ServeHTTP(w, r)

	select {
	case err := <-errCh:
		if err != nil {
			a.pool.MarkFailure(service, upstreamBase)
			log.Printf("[gateway] upstream failed service=%s target=%s error=%v", service, targetURL.String(), err)
			return err
		}
	default:
	}

	return nil
}

func joinURL(base *url.URL, pathname, rawQuery string) *url.URL {
	target := *base
	basePath := target.Path
	if basePath == "" || basePath == "/" {
		basePath = ""
	}
	target.Path = joinPath(basePath, pathname)
	target.RawPath = target.Path
	target.RawQuery = rawQuery
	return &target
}

func joinPath(basePath, pathname string) string {
	if pathname == "" {
		pathname = "/"
	}
	if pathname[0] != '/' {
		pathname = "/" + pathname
	}
	if basePath == "" {
		return pathname
	}
	if basePath[len(basePath)-1] == '/' {
		basePath = basePath[:len(basePath)-1]
	}
	return basePath + pathname
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func itoa(v int) string {
	return fmt.Sprintf("%d", v)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
