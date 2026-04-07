package router

import (
	"strings"

	"revornix-gateway/internal/config"
)

type Route struct {
	Type           string `json:"type"`
	Service        string `json:"service"`
	TargetPathname string `json:"targetPathname"`
}

type Resolver struct {
	config config.Config
}

func New(cfg config.Config) *Resolver {
	return &Resolver{config: cfg}
}

func (r *Resolver) Resolve(host, pathname string) Route {
	if contains(r.config.LocalRoutePaths, pathname) {
		return Route{Type: "local", Service: "gateway", TargetPathname: pathname}
	}

	normalizedHost := stripPort(strings.ToLower(host))

	if contains(r.config.PublicHosts.HotNews, normalizedHost) {
		return Route{Type: "proxy", Service: "hotNews", TargetPathname: pathname}
	}
	if contains(r.config.PublicHosts.UnionPay, normalizedHost) {
		return Route{Type: "proxy", Service: "unionPay", TargetPathname: pathname}
	}
	if contains(r.config.PublicHosts.API, normalizedHost) {
		service := "api"
		if contains(r.config.AuthRoutePaths, pathname) {
			service = "authApi"
		}
		return Route{Type: "proxy", Service: service, TargetPathname: pathname}
	}

	if prefix := matchPrefix(pathname, r.config.PathPrefixes.HotNews); prefix != "" {
		targetPath := pathname
		if r.config.StripPrefix.HotNews {
			targetPath = stripPrefix(pathname, prefix)
		}
		return Route{Type: "proxy", Service: "hotNews", TargetPathname: targetPath}
	}
	if prefix := matchPrefix(pathname, r.config.PathPrefixes.UnionPay); prefix != "" {
		targetPath := pathname
		if r.config.StripPrefix.UnionPay {
			targetPath = stripPrefix(pathname, prefix)
		}
		return Route{Type: "proxy", Service: "unionPay", TargetPathname: targetPath}
	}
	if prefix := matchPrefix(pathname, r.config.PathPrefixes.API); prefix != "" {
		targetPath := pathname
		if r.config.StripPrefix.API {
			targetPath = stripPrefix(pathname, prefix)
		}
		service := "api"
		if contains(r.config.AuthRoutePaths, targetPath) {
			service = "authApi"
		}
		return Route{Type: "proxy", Service: service, TargetPathname: targetPath}
	}

	return Route{Type: "reject", Service: "unmatched", TargetPathname: pathname}
}

func (r *Resolver) RoutesPayload() map[string]any {
	return map[string]any{
		"publicHosts": map[string]any{
			"api":      r.config.PublicHosts.API,
			"hotNews":  r.config.PublicHosts.HotNews,
			"unionPay": r.config.PublicHosts.UnionPay,
		},
		"pathPrefixes": map[string]any{
			"api":      r.config.PathPrefixes.API,
			"hotNews":  r.config.PathPrefixes.HotNews,
			"unionPay": r.config.PathPrefixes.UnionPay,
		},
		"stripPrefix": map[string]any{
			"api":      r.config.StripPrefix.API,
			"hotNews":  r.config.StripPrefix.HotNews,
			"unionPay": r.config.StripPrefix.UnionPay,
		},
		"authRoutePaths":  r.config.AuthRoutePaths,
		"localRoutePaths": r.config.LocalRoutePaths,
	}
}

func stripPort(host string) string {
	parts := strings.Split(host, ":")
	return parts[0]
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func matchPrefix(pathname string, prefixes []string) string {
	for _, prefix := range prefixes {
		if pathname == prefix || strings.HasPrefix(pathname, prefix+"/") {
			return prefix
		}
	}
	return ""
}

func stripPrefix(pathname, prefix string) string {
	if pathname == prefix {
		return "/"
	}
	stripped := strings.TrimPrefix(pathname, prefix)
	if strings.HasPrefix(stripped, "/") {
		return stripped
	}
	return "/" + stripped
}
