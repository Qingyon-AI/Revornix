package router

import (
	"testing"

	"revornix-gateway/internal/config"
)

// 路由解析决定每一个公网请求去哪个上游。判错不会报错，只会把流量悄悄送错地方 ——
// 比如把 OAuth 请求发给境内 API（拿不到 Google/GitHub），或者让本该被拒的路径穿透进来。
// 这里覆盖的重点是**匹配顺序**和几个容易被忽略的边界。

func testConfig() config.Config {
	cfg := config.Config{}
	cfg.LocalRoutePaths = []string{"/__gateway/health", "/__gateway/routes"}
	cfg.AuthRoutePaths = []string{"/user/google/create", "/user/github/create"}
	cfg.PublicHosts.API = []string{"api.revornix.com"}
	cfg.PublicHosts.HotNews = []string{"hot.revornix.com"}
	cfg.PublicHosts.UnionPay = []string{"pay.revornix.com"}
	cfg.PathPrefixes.API = []string{"/api"}
	cfg.PathPrefixes.HotNews = []string{"/hot-news"}
	cfg.PathPrefixes.UnionPay = []string{"/union-pay"}
	return cfg
}

func TestLocalPathsWinOverEverything(t *testing.T) {
	// 本地检查端点必须先于任何代理规则命中，否则网关自身的健康检查会被转发出去
	cfg := testConfig()
	cfg.PublicHosts.API = []string{"api.revornix.com"}
	r := New(cfg)

	got := r.Resolve("api.revornix.com", "/__gateway/health")
	if got.Type != "local" || got.Service != "gateway" {
		t.Fatalf("本地路径应走 local，实际 %+v", got)
	}
}

func TestUnmatchedIsRejectedNotForwarded(t *testing.T) {
	// 兜底必须是拒绝。默认转发意味着任何没配过的路径都能穿透到内网服务。
	r := New(testConfig())
	got := r.Resolve("unknown.example.com", "/whatever")
	if got.Type != "reject" {
		t.Fatalf("未匹配的请求应被拒绝，实际 %+v", got)
	}
}

func TestHostRoutingByService(t *testing.T) {
	r := New(testConfig())
	cases := []struct {
		host string
		want string
	}{
		{"hot.revornix.com", "hotNews"},
		{"pay.revornix.com", "unionPay"},
		{"api.revornix.com", "api"},
	}
	for _, c := range cases {
		if got := r.Resolve(c.host, "/x"); got.Service != c.want {
			t.Errorf("host %s 应路由到 %s，实际 %s", c.host, c.want, got.Service)
		}
	}
}

func TestHostMatchingIgnoresPortAndCase(t *testing.T) {
	// 浏览器会带端口，Host 头大小写也不保证 —— 漏掉任一个都会让整个域名的流量掉进 reject
	r := New(testConfig())
	for _, host := range []string{"API.revornix.com", "api.revornix.com:443", "API.REVORNIX.COM:8080"} {
		if got := r.Resolve(host, "/x"); got.Service != "api" {
			t.Errorf("host %q 应归一化后命中 api，实际 %+v", host, got)
		}
	}
}

func TestAuthPathsGoToTheOverseasAPI(t *testing.T) {
	// 这条路由存在的全部理由：Google/GitHub OAuth 必须走境外 API，
	// 发给境内 API 会静默失败（拿不到 token，而不是报错）
	r := New(testConfig())
	got := r.Resolve("api.revornix.com", "/user/google/create")
	if got.Service != "authApi" {
		t.Fatalf("OAuth 路径应走 authApi，实际 %+v", got)
	}
}

func TestNonAuthPathOnApiHostStaysDomestic(t *testing.T) {
	r := New(testConfig())
	got := r.Resolve("api.revornix.com", "/document/list")
	if got.Service != "api" {
		t.Fatalf("普通路径应走 api，实际 %+v", got)
	}
}

func TestPathPrefixRouting(t *testing.T) {
	r := New(testConfig())
	if got := r.Resolve("other.example.com", "/hot-news/weibo"); got.Service != "hotNews" {
		t.Fatalf("前缀应命中 hotNews，实际 %+v", got)
	}
}

func TestPrefixMatchesOnSegmentBoundaryOnly(t *testing.T) {
	// /api-docs 不该被 /api 前缀吃掉 —— 否则一个不相干的路径会被转发给 API
	r := New(testConfig())
	if got := r.Resolve("other.example.com", "/api-docs"); got.Type != "reject" {
		t.Fatalf("/api-docs 不应匹配 /api 前缀，实际 %+v", got)
	}
	// 而恰好等于前缀本身要匹配
	if got := r.Resolve("other.example.com", "/api"); got.Service != "api" {
		t.Fatalf("/api 应匹配前缀，实际 %+v", got)
	}
}

func TestStripPrefixRewritesTargetPath(t *testing.T) {
	cfg := testConfig()
	cfg.StripPrefix.API = true
	r := New(cfg)

	got := r.Resolve("other.example.com", "/api/document/list")
	if got.TargetPathname != "/document/list" {
		t.Fatalf("开启 strip 后应剥掉前缀，实际 %q", got.TargetPathname)
	}
}

func TestStripPrefixKeepsRootPath(t *testing.T) {
	// 剥掉前缀后不能剩下空字符串，那样拼出来的 URL 是非法的
	cfg := testConfig()
	cfg.StripPrefix.API = true
	r := New(cfg)

	got := r.Resolve("other.example.com", "/api")
	if got.TargetPathname != "/" {
		t.Fatalf("路径恰为前缀时应得到 /，实际 %q", got.TargetPathname)
	}
}

func TestStripPrefixDisabledKeepsOriginalPath(t *testing.T) {
	cfg := testConfig()
	cfg.StripPrefix.API = false
	r := New(cfg)

	got := r.Resolve("other.example.com", "/api/document/list")
	if got.TargetPathname != "/api/document/list" {
		t.Fatalf("未开启 strip 时应原样透传，实际 %q", got.TargetPathname)
	}
}

func TestAuthRoutingAppliesAfterPrefixStripping(t *testing.T) {
	// 认证路径的判断必须发生在剥前缀**之后**，否则 /api/user/google/create
	// 会被当成普通路径发给境内 API
	cfg := testConfig()
	cfg.StripPrefix.API = true
	r := New(cfg)

	got := r.Resolve("other.example.com", "/api/user/google/create")
	if got.Service != "authApi" {
		t.Fatalf("剥前缀后应识别为 authApi，实际 %+v", got)
	}
}
