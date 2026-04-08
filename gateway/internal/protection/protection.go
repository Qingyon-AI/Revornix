package protection

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"revornix-gateway/internal/config"
	"revornix-gateway/internal/router"
)

var suspiciousUserAgentPatterns = []*regexp.Regexp{
	regexp.MustCompile(`^\s*$`),
	regexp.MustCompile(`(?i)python-requests`),
	regexp.MustCompile(`(?i)python-httpx`),
	regexp.MustCompile(`(?i)aiohttp`),
	regexp.MustCompile(`(?i)curl`),
	regexp.MustCompile(`(?i)wget`),
	regexp.MustCompile(`(?i)go-http-client`),
	regexp.MustCompile(`(?i)scrapy`),
	regexp.MustCompile(`(?i)headless`),
	regexp.MustCompile(`(?i)phantomjs`),
	regexp.MustCompile(`(?i)selenium`),
	regexp.MustCompile(`(?i)playwright`),
}

type Rule struct {
	Name    string
	Limit   int
	Window  time.Duration
	KeyMode string
}

type Policy struct {
	Name                     string
	BlockSuspiciousUserAgent bool
	Rules                    []Rule
}

type State struct {
	Allowed    bool
	PolicyName string
	RuleName   string
	Limit      int
	Remaining  int
	ResetAfter time.Duration
}

type bucket struct {
	Tokens     float64
	LastRefill time.Time
}

type Event struct {
	Timestamp     time.Time `json:"timestamp"`
	Event         string    `json:"event"`
	Policy        string    `json:"policy"`
	Rule          string    `json:"rule"`
	Method        string    `json:"method"`
	Host          string    `json:"host"`
	Path          string    `json:"path"`
	Service       string    `json:"service"`
	ClientIP      string    `json:"clientIp"`
	UserAgentHash string    `json:"userAgentHash"`
	Limit         int       `json:"limit,omitempty"`
	Remaining     int       `json:"remaining,omitempty"`
	ResetSeconds  int       `json:"resetSeconds,omitempty"`
}

type CounterBucket struct {
	MinuteStart time.Time
	Counts      map[string]int
}

type SummaryWindow struct {
	Minutes int            `json:"minutes"`
	Counts  map[string]int `json:"counts"`
}

type StatsSnapshot struct {
	Timestamp    time.Time       `json:"timestamp"`
	Summary      []SummaryWindow `json:"summary"`
	RecentEvents []Event         `json:"recentEvents"`
}

type Protector struct {
	config  config.ProtectionConfig
	mu      sync.Mutex
	buckets map[string]bucket
	events  []Event
	counts  []CounterBucket
}

const maxRecentEvents = 200

func New(cfg config.ProtectionConfig) *Protector {
	return &Protector{
		config:  cfg,
		buckets: make(map[string]bucket),
		events:  make([]Event, 0, maxRecentEvents),
		counts:  make([]CounterBucket, 0, 120),
	}
}

func (p *Protector) Check(r *http.Request, route router.Route) (*State, int, string) {
	policy := p.policyForRequest(r, route)
	if policy == nil {
		return nil, 0, ""
	}

	userAgent := strings.TrimSpace(r.Header.Get("User-Agent"))
	if policy.BlockSuspiciousUserAgent && isSuspiciousUserAgent(userAgent) {
		p.recordEvent(
			"blocked_user_agent",
			r,
			route,
			policy.Name,
			"",
			nil,
			userAgent,
		)
		logAntiScrapeEvent(
			"blocked_user_agent",
			r,
			route,
			policy.Name,
			"",
			nil,
			userAgent,
		)
		return nil, http.StatusForbidden, "request rejected by gateway anti-scraping policy"
	}

	now := time.Now()
	var mostRestrictive *State
	for _, rule := range policy.Rules {
		state := p.consume(rule, r, route, now, policy.Name)
		if mostRestrictive == nil || state.Remaining < mostRestrictive.Remaining {
			mostRestrictive = state
		}
		if state.Allowed && shouldLogNearLimit(state) {
			p.recordEvent(
				"near_limit",
				r,
				route,
				state.PolicyName,
				state.RuleName,
				state,
				userAgent,
			)
			logAntiScrapeEvent(
				"near_limit",
				r,
				route,
				state.PolicyName,
				state.RuleName,
				state,
				userAgent,
			)
		}
		if !state.Allowed {
			p.recordEvent(
				"rate_limited",
				r,
				route,
				state.PolicyName,
				state.RuleName,
				state,
				userAgent,
			)
			logAntiScrapeEvent(
				"rate_limited",
				r,
				route,
				state.PolicyName,
				state.RuleName,
				state,
				userAgent,
			)
			return state, http.StatusTooManyRequests, "too many requests, please slow down and try again later"
		}
	}

	return mostRestrictive, 0, ""
}

func (p *Protector) policyForRequest(r *http.Request, route router.Route) *Policy {
	path := route.TargetPathname
	if route.Type == "local" {
		return nil
	}

	switch path {
	case "/openapi.json", "/openapi.yaml":
		return &Policy{
			Name:                     "openapi",
			BlockSuspiciousUserAgent: true,
			Rules: []Rule{
				{Name: "ip", Limit: p.config.OpenAPIPLimit, Window: p.config.OpenAPIWindow, KeyMode: "ip"},
			},
		}
	case "/section/public/search", "/section/detail/seo":
		return &Policy{
			Name:                     "public_search",
			BlockSuspiciousUserAgent: true,
			Rules: []Rule{
				{Name: "ip", Limit: p.config.PublicIPLimit, Window: p.config.PublicWindow, KeyMode: "ip"},
				{Name: "ip_ua", Limit: p.config.PublicIPUALimit, Window: p.config.PublicIPUAWindow, KeyMode: "ip_ua"},
			},
		}
	case "/document/detail", "/section/detail":
		if hasAuth(r) {
			return nil
		}
		return &Policy{
			Name:                     "anonymous_detail",
			BlockSuspiciousUserAgent: true,
			Rules: []Rule{
				{Name: "ip", Limit: p.config.AnonDetailIPLimit, Window: p.config.AnonDetailWindow, KeyMode: "ip"},
				{Name: "ip_ua", Limit: p.config.AnonDetailIPUALimit, Window: p.config.AnonDetailIPUAWindow, KeyMode: "ip_ua"},
			},
		}
	}

	if strings.HasPrefix(path, "/user/create/sms/") {
		return &Policy{
			Name:                     "sms_code",
			BlockSuspiciousUserAgent: true,
			Rules: []Rule{
				{Name: "ip", Limit: p.config.SMSIPLimit, Window: p.config.SMSWindow, KeyMode: "ip"},
				{Name: "ip_ua", Limit: p.config.SMSIPUALimit, Window: p.config.SMSIPUAWindow, KeyMode: "ip_ua"},
			},
		}
	}

	return nil
}

func (p *Protector) consume(rule Rule, r *http.Request, route router.Route, now time.Time, policyName string) *State {
	if rule.Limit <= 0 || rule.Window <= 0 {
		return &State{Allowed: true}
	}

	key := p.bucketKey(rule, r, route, now, policyName)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.cleanupExpiredLocked(now)

	current, ok := p.buckets[key]
	if !ok {
		current = bucket{
			Tokens:     float64(rule.Limit),
			LastRefill: now,
		}
	}

	allowed := false
	current = refillBucket(current, now, rule)
	if current.Tokens >= 1 {
		allowed = true
		current.Tokens -= 1
	}
	p.buckets[key] = current

	remaining := int(current.Tokens)
	if remaining < 0 {
		remaining = 0
	}

	return &State{
		Allowed:    allowed,
		PolicyName: policyName,
		RuleName:   rule.Name,
		Limit:      rule.Limit,
		Remaining:  remaining,
		ResetAfter: retryAfter(current, rule),
	}
}

func (p *Protector) cleanupExpiredLocked(now time.Time) {
	for key, item := range p.buckets {
		if now.Sub(item.LastRefill) > 2*time.Hour {
			delete(p.buckets, key)
		}
	}
}

func (p *Protector) bucketKey(rule Rule, r *http.Request, route router.Route, _ time.Time, policyName string) string {
	identity := clientIP(r)
	if rule.KeyMode == "ip_ua" {
		identity = identity + ":" + userAgentHash(r.Header.Get("User-Agent"))
	}

	return strings.Join([]string{
		policyName,
		rule.Name,
		r.Method,
		route.TargetPathname,
		identity,
	}, ":")
}

func hasAuth(r *http.Request) bool {
	return strings.TrimSpace(r.Header.Get("Authorization")) != "" ||
		strings.TrimSpace(r.Header.Get("Api-Key")) != "" ||
		strings.TrimSpace(r.Header.Get("api-key")) != ""
}

func clientIP(r *http.Request) string {
	forwardedFor := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
			return strings.TrimSpace(parts[0])
		}
	}

	remoteAddr := strings.TrimSpace(r.RemoteAddr)
	if remoteAddr == "" {
		return "unknown"
	}
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return remoteAddr
}

func userAgentHash(userAgent string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(userAgent)))
	return hex.EncodeToString(sum[:8])
}

func isSuspiciousUserAgent(userAgent string) bool {
	for _, pattern := range suspiciousUserAgentPatterns {
		if pattern.MatchString(userAgent) {
			return true
		}
	}
	return false
}

func refillBucket(current bucket, now time.Time, rule Rule) bucket {
	if current.LastRefill.IsZero() {
		current.LastRefill = now
		current.Tokens = float64(rule.Limit)
		return current
	}
	elapsed := now.Sub(current.LastRefill)
	if elapsed <= 0 {
		return current
	}
	refillRate := float64(rule.Limit) / rule.Window.Seconds()
	current.Tokens = minFloat(float64(rule.Limit), current.Tokens+elapsed.Seconds()*refillRate)
	current.LastRefill = now
	return current
}

func retryAfter(current bucket, rule Rule) time.Duration {
	if current.Tokens >= 1 {
		return 0
	}
	refillRate := float64(rule.Limit) / rule.Window.Seconds()
	if refillRate <= 0 {
		return rule.Window
	}
	seconds := (1 - current.Tokens) / refillRate
	if seconds < 0 {
		seconds = 0
	}
	return time.Duration(seconds * float64(time.Second))
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func (p *Protector) StatsSnapshot() StatsSnapshot {
	now := time.Now().UTC()
	p.mu.Lock()
	defer p.mu.Unlock()

	p.cleanupStatsLocked(now)

	windows := []int{5, 15, 60}
	summary := make([]SummaryWindow, 0, len(windows))
	for _, minutes := range windows {
		cutoff := now.Add(-time.Duration(minutes) * time.Minute)
		counts := make(map[string]int)
		for _, bucket := range p.counts {
			if bucket.MinuteStart.Before(cutoff) {
				continue
			}
			for key, count := range bucket.Counts {
				counts[key] += count
			}
		}
		summary = append(summary, SummaryWindow{
			Minutes: minutes,
			Counts:  counts,
		})
	}

	recentEvents := make([]Event, len(p.events))
	copy(recentEvents, p.events)

	return StatsSnapshot{
		Timestamp:    now,
		Summary:      summary,
		RecentEvents: recentEvents,
	}
}

func (p *Protector) recordEvent(eventName string, r *http.Request, route router.Route, policyName, ruleName string, state *State, userAgent string) {
	now := time.Now().UTC()
	event := Event{
		Timestamp:     now,
		Event:         eventName,
		Policy:        policyName,
		Rule:          valueOrDash(ruleName),
		Method:        r.Method,
		Host:          valueOrDash(r.Host),
		Path:          route.TargetPathname,
		Service:       route.Service,
		ClientIP:      clientIP(r),
		UserAgentHash: userAgentHash(userAgent),
	}
	if state != nil {
		event.Limit = state.Limit
		event.Remaining = state.Remaining
		event.ResetSeconds = int(state.ResetAfter.Seconds())
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	p.cleanupStatsLocked(now)
	p.events = append([]Event{event}, p.events...)
	if len(p.events) > maxRecentEvents {
		p.events = p.events[:maxRecentEvents]
	}

	minuteStart := now.Truncate(time.Minute)
	counterKey := buildCounterKey(event)
	if len(p.counts) == 0 || !p.counts[len(p.counts)-1].MinuteStart.Equal(minuteStart) {
		p.counts = append(p.counts, CounterBucket{
			MinuteStart: minuteStart,
			Counts:      map[string]int{counterKey: 1},
		})
		return
	}
	p.counts[len(p.counts)-1].Counts[counterKey]++
}

func (p *Protector) cleanupStatsLocked(now time.Time) {
	cutoff := now.Add(-2 * time.Hour)
	filteredEvents := p.events[:0]
	for _, event := range p.events {
		if event.Timestamp.After(cutoff) {
			filteredEvents = append(filteredEvents, event)
		}
	}
	p.events = filteredEvents

	filteredCounts := p.counts[:0]
	for _, bucket := range p.counts {
		if !bucket.MinuteStart.Before(cutoff) {
			filteredCounts = append(filteredCounts, bucket)
		}
	}
	p.counts = filteredCounts
}

func buildCounterKey(event Event) string {
	return strings.Join([]string{
		"event=" + event.Event,
		"policy=" + event.Policy,
		"rule=" + event.Rule,
	}, "|")
}

func shouldLogNearLimit(state *State) bool {
	threshold := state.Limit / 10
	if threshold < 1 {
		threshold = 1
	}
	if threshold > 10 {
		threshold = 10
	}
	return state.Remaining == threshold
}

func logAntiScrapeEvent(event string, r *http.Request, route router.Route, policyName, ruleName string, state *State, userAgent string) {
	message := []string{
		"[gateway]",
		"event=anti_scrape_" + event,
		"policy=" + policyName,
		"rule=" + valueOrDash(ruleName),
		"method=" + r.Method,
		"host=" + valueOrDash(r.Host),
		"path=" + route.TargetPathname,
		"service=" + route.Service,
		"client_ip=" + clientIP(r),
		"ua_hash=" + userAgentHash(userAgent),
	}
	if state != nil {
		message = append(
			message,
			"limit="+itoa(state.Limit),
			"remaining="+itoa(state.Remaining),
			"reset_seconds="+itoa(int(state.ResetAfter.Seconds())),
		)
	}
	log.Print(strings.Join(message, " "))
}

func itoa(v int) string {
	return strconv.Itoa(v)
}

func valueOrDash(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return value
}
