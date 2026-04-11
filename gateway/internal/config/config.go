package config

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                  int
	EnableAccessLog       bool
	UpstreamRetryCooldown time.Duration
	Protection            ProtectionConfig
	PublicHosts           PublicHosts
	PathPrefixes          PathPrefixes
	StripPrefix           StripPrefix
	Services              Services
	AuthRoutePaths        []string
	LocalRoutePaths       []string
}

type ProtectionConfig struct {
	SMSIPLimit           int
	SMSWindow            time.Duration
	SMSIPUALimit         int
	SMSIPUAWindow        time.Duration
	PublicIPLimit        int
	PublicWindow         time.Duration
	PublicIPUALimit      int
	PublicIPUAWindow     time.Duration
	AnonDetailIPLimit    int
	AnonDetailWindow     time.Duration
	AnonDetailIPUALimit  int
	AnonDetailIPUAWindow time.Duration
	OpenAPIPLimit        int
	OpenAPIWindow        time.Duration
}

type PublicHosts struct {
	API      []string `json:"api"`
	HotNews  []string `json:"hotNews"`
	UnionPay []string `json:"unionPay"`
}

type PathPrefixes struct {
	API      []string `json:"api"`
	HotNews  []string `json:"hotNews"`
	UnionPay []string `json:"unionPay"`
}

type StripPrefix struct {
	API      bool `json:"api"`
	HotNews  bool `json:"hotNews"`
	UnionPay bool `json:"unionPay"`
}

type Services struct {
	API      []*url.URL
	AuthAPI  []*url.URL
	HotNews  []*url.URL
	UnionPay []*url.URL
}

func (c Config) ListenAddr() string {
	return fmt.Sprintf(":%d", c.Port)
}

func Load(envPath string) (Config, error) {
	if err := loadDotEnv(envPath); err != nil {
		return Config{}, err
	}

	cfg := Config{
		Port:                  getInt("PORT", 8787),
		EnableAccessLog:       getBool("GATEWAY_ENABLE_ACCESS_LOG", true),
		UpstreamRetryCooldown: time.Duration(getInt("GATEWAY_UPSTREAM_RETRY_COOLDOWN_MS", 30000)) * time.Millisecond,
		Protection: ProtectionConfig{
			SMSIPLimit:           getInt("GATEWAY_ANTI_SCRAPE_SMS_IP_LIMIT", 3),
			SMSWindow:            time.Duration(getInt("GATEWAY_ANTI_SCRAPE_SMS_IP_WINDOW_SECONDS", 600)) * time.Second,
			SMSIPUALimit:         getInt("GATEWAY_ANTI_SCRAPE_SMS_IP_UA_LIMIT", 2),
			SMSIPUAWindow:        time.Duration(getInt("GATEWAY_ANTI_SCRAPE_SMS_IP_UA_WINDOW_SECONDS", 60)) * time.Second,
			PublicIPLimit:        getInt("GATEWAY_ANTI_SCRAPE_PUBLIC_IP_LIMIT", 120),
			PublicWindow:         time.Duration(getInt("GATEWAY_ANTI_SCRAPE_PUBLIC_IP_WINDOW_SECONDS", 300)) * time.Second,
			PublicIPUALimit:      getInt("GATEWAY_ANTI_SCRAPE_PUBLIC_IP_UA_LIMIT", 30),
			PublicIPUAWindow:     time.Duration(getInt("GATEWAY_ANTI_SCRAPE_PUBLIC_IP_UA_WINDOW_SECONDS", 60)) * time.Second,
			AnonDetailIPLimit:    getInt("GATEWAY_ANTI_SCRAPE_ANON_DETAIL_IP_LIMIT", 90),
			AnonDetailWindow:     time.Duration(getInt("GATEWAY_ANTI_SCRAPE_ANON_DETAIL_IP_WINDOW_SECONDS", 300)) * time.Second,
			AnonDetailIPUALimit:  getInt("GATEWAY_ANTI_SCRAPE_ANON_DETAIL_IP_UA_LIMIT", 20),
			AnonDetailIPUAWindow: time.Duration(getInt("GATEWAY_ANTI_SCRAPE_ANON_DETAIL_IP_UA_WINDOW_SECONDS", 60)) * time.Second,
			OpenAPIPLimit:        getInt("GATEWAY_ANTI_SCRAPE_OPENAPI_IP_LIMIT", 5),
			OpenAPIWindow:        time.Duration(getInt("GATEWAY_ANTI_SCRAPE_OPENAPI_IP_WINDOW_SECONDS", 60)) * time.Second,
		},
		PublicHosts: PublicHosts{
			API:      getLowerList("GATEWAY_PUBLIC_API_HOSTS"),
			HotNews:  getLowerList("GATEWAY_PUBLIC_HOT_NEWS_HOSTS"),
			UnionPay: getLowerList("GATEWAY_PUBLIC_UNION_PAY_HOSTS"),
		},
		PathPrefixes: PathPrefixes{
			API:      getPathList("GATEWAY_API_PATH_PREFIXES"),
			HotNews:  getPathList("GATEWAY_HOT_NEWS_PATH_PREFIXES"),
			UnionPay: getPathList("GATEWAY_UNION_PAY_PATH_PREFIXES"),
		},
		StripPrefix: StripPrefix{
			API:      getBool("GATEWAY_STRIP_API_PATH_PREFIX", false),
			HotNews:  getBool("GATEWAY_STRIP_HOT_NEWS_PATH_PREFIX", false),
			UnionPay: getBool("GATEWAY_STRIP_UNION_PAY_PATH_PREFIX", false),
		},
		AuthRoutePaths: []string{
			"/user/create/google",
			"/user/create/github",
			"/user/bind/google",
			"/user/bind/github",
		},
		LocalRoutePaths: []string{
			"/gateway/health",
			"/gateway/routes",
			"/gateway/upstreams",
			"/gateway/anti-scrape",
		},
	}

	var err error
	cfg.Services.API, err = getURLList("GATEWAY_API_UPSTREAMS", "http://localhost:8001")
	if err != nil {
		return Config{}, err
	}
	cfg.Services.AuthAPI, err = getURLList("GATEWAY_AUTH_API_UPSTREAMS", "http://localhost:8001")
	if err != nil {
		return Config{}, err
	}
	cfg.Services.HotNews, err = getURLList("GATEWAY_HOT_NEWS_UPSTREAMS", "http://localhost:6688")
	if err != nil {
		return Config{}, err
	}
	cfg.Services.UnionPay, err = getURLList("GATEWAY_UNION_PAY_UPSTREAMS", "http://localhost:8080")
	if err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func loadDotEnv(envPath string) error {
	file, err := os.Open(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		value := strings.TrimSpace(parts[1])
		if len(value) >= 2 {
			if (value[0] == '\'' && value[len(value)-1] == '\'') || (value[0] == '"' && value[len(value)-1] == '"') {
				value = value[1 : len(value)-1]
			}
		}
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}
	return scanner.Err()
}

func getString(key, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	return value
}

func getInt(key string, defaultValue int) int {
	value := getString(key, "")
	if value == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getBool(key string, defaultValue bool) bool {
	value := strings.ToLower(getString(key, ""))
	if value == "" {
		return defaultValue
	}
	switch value {
	case "1", "true", "yes", "on", "y":
		return true
	case "0", "false", "no", "off", "n":
		return false
	default:
		return defaultValue
	}
}

func getList(key string) []string {
	raw := getString(key, "")
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func getLowerList(key string) []string {
	items := getList(key)
	for i, item := range items {
		items[i] = strings.ToLower(item)
	}
	return items
}

func getPathList(key string) []string {
	items := getList(key)
	for i, item := range items {
		if !strings.HasPrefix(item, "/") {
			item = "/" + item
		}
		if item != "/" {
			item = strings.TrimRight(item, "/")
		}
		items[i] = item
	}
	return items
}

func getURLList(key, fallback string) ([]*url.URL, error) {
	items := getList(key)
	if len(items) == 0 {
		items = []string{fallback}
	}

	result := make([]*url.URL, 0, len(items))
	for _, item := range items {
		parsed, err := url.Parse(item)
		if err != nil {
			return nil, fmt.Errorf("invalid %s value %q: %w", key, item, err)
		}
		if parsed.Scheme == "" || parsed.Host == "" {
			return nil, fmt.Errorf("invalid %s value %q: scheme and host are required", key, item)
		}
		if parsed.Path == "/" {
			parsed.Path = ""
		} else {
			parsed.Path = strings.TrimRight(parsed.Path, "/")
		}
		result = append(result, parsed)
	}
	return result, nil
}
