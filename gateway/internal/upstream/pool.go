package upstream

import (
	"net/url"
	"sync"
	"time"
)

type Target struct {
	URL      *url.URL
	Healthy  bool
	FailedAt *time.Time
}

type Pool struct {
	mu        sync.Mutex
	cooldown  time.Duration
	cursor    int
	byService map[string][]*Target
}

func New(cooldown time.Duration, services map[string][]*url.URL) *Pool {
	byService := make(map[string][]*Target, len(services))
	for name, urls := range services {
		targets := make([]*Target, 0, len(urls))
		for _, upstreamURL := range urls {
			targets = append(targets, &Target{
				URL:     upstreamURL,
				Healthy: true,
			})
		}
		byService[name] = targets
	}
	return &Pool{
		cooldown:  cooldown,
		byService: byService,
	}
}

func (p *Pool) Candidates(service string) []*Target {
	p.mu.Lock()
	defer p.mu.Unlock()

	targets := p.byService[service]
	if len(targets) == 0 {
		return nil
	}

	now := time.Now()
	for _, target := range targets {
		if target.FailedAt != nil && now.Sub(*target.FailedAt) >= p.cooldown {
			target.Healthy = true
			target.FailedAt = nil
		}
	}

	start := p.cursor % len(targets)
	p.cursor = (p.cursor + 1) % len(targets)

	ordered := make([]*Target, 0, len(targets))
	healthy := make([]*Target, 0, len(targets))
	for i := 0; i < len(targets); i++ {
		target := targets[(start+i)%len(targets)]
		ordered = append(ordered, target)
		if target.Healthy {
			healthy = append(healthy, target)
		}
	}

	if len(healthy) > 0 {
		return healthy
	}
	return ordered
}

func (p *Pool) MarkSuccess(service string, upstreamURL *url.URL) {
	p.mark(service, upstreamURL, true)
}

func (p *Pool) MarkFailure(service string, upstreamURL *url.URL) {
	p.mark(service, upstreamURL, false)
}

func (p *Pool) mark(service string, upstreamURL *url.URL, healthy bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, target := range p.byService[service] {
		if target.URL.String() != upstreamURL.String() {
			continue
		}
		target.Healthy = healthy
		if healthy {
			target.FailedAt = nil
		} else {
			now := time.Now()
			target.FailedAt = &now
		}
		return
	}
}

func (p *Pool) Snapshot() map[string][]map[string]any {
	p.mu.Lock()
	defer p.mu.Unlock()

	out := make(map[string][]map[string]any, len(p.byService))
	for service, targets := range p.byService {
		items := make([]map[string]any, 0, len(targets))
		for _, target := range targets {
			var failedAt any
			if target.FailedAt != nil {
				failedAt = target.FailedAt.UTC().Format(time.RFC3339Nano)
			} else {
				failedAt = nil
			}
			items = append(items, map[string]any{
				"url":      target.URL.String(),
				"healthy":  target.Healthy,
				"failedAt": failedAt,
			})
		}
		out[service] = items
	}
	return out
}
