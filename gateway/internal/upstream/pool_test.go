package upstream

import (
	"net/url"
	"testing"
	"time"
)

// 上游池负责轮询与故障转移。它出错的方式都很安静：要么把流量继续送给已经挂掉的
// 上游，要么在全部上游都被标记失败后**返回空**、让网关无处可发 —— 后者会把一次
// 局部故障放大成全站不可用。

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("解析 URL 失败 %q: %v", raw, err)
	}
	return u
}

func newTestPool(t *testing.T, cooldown time.Duration, urls ...string) (*Pool, []*url.URL) {
	t.Helper()
	parsed := make([]*url.URL, 0, len(urls))
	for _, raw := range urls {
		parsed = append(parsed, mustURL(t, raw))
	}
	return New(cooldown, map[string][]*url.URL{"api": parsed}), parsed
}

func TestUnknownServiceYieldsNoCandidates(t *testing.T) {
	pool, _ := newTestPool(t, time.Minute, "http://a")
	if got := pool.Candidates("nope"); got != nil {
		t.Fatalf("未知服务应返回 nil，实际 %+v", got)
	}
}

func TestAllTargetsStartHealthy(t *testing.T) {
	pool, _ := newTestPool(t, time.Minute, "http://a", "http://b")
	got := pool.Candidates("api")
	if len(got) != 2 {
		t.Fatalf("应有 2 个候选，实际 %d", len(got))
	}
}

func TestCandidatesRotate(t *testing.T) {
	// 不轮询就等于所有流量永远压在第一个上游
	pool, _ := newTestPool(t, time.Minute, "http://a", "http://b")
	first := pool.Candidates("api")[0].URL.String()
	second := pool.Candidates("api")[0].URL.String()
	if first == second {
		t.Fatalf("连续两次取到同一个首选 %q，说明没有轮询", first)
	}
}

func TestFailedTargetIsExcluded(t *testing.T) {
	pool, urls := newTestPool(t, time.Minute, "http://a", "http://b")
	pool.MarkFailure("api", urls[0])

	for i := 0; i < 4; i++ {
		for _, target := range pool.Candidates("api") {
			if target.URL.String() == urls[0].String() {
				t.Fatalf("已标记失败的上游不该出现在候选里")
			}
		}
	}
}

func TestAllUnhealthyStillReturnsCandidates(t *testing.T) {
	// 关键兜底：全部标记失败时不能返回空。宁可去试一个可能已恢复的上游，
	// 也不能让网关无处可发 —— 那会把局部故障放大成全站不可用。
	pool, urls := newTestPool(t, time.Hour, "http://a", "http://b")
	pool.MarkFailure("api", urls[0])
	pool.MarkFailure("api", urls[1])

	got := pool.Candidates("api")
	if len(got) != 2 {
		t.Fatalf("全部不健康时应返回全部候选，实际 %d 个", len(got))
	}
}

func TestSuccessRestoresATarget(t *testing.T) {
	pool, urls := newTestPool(t, time.Hour, "http://a", "http://b")
	pool.MarkFailure("api", urls[0])
	pool.MarkSuccess("api", urls[0])

	found := false
	for i := 0; i < 4 && !found; i++ {
		for _, target := range pool.Candidates("api") {
			if target.URL.String() == urls[0].String() {
				found = true
			}
		}
	}
	if !found {
		t.Fatalf("标记成功后应重新进入候选")
	}
}

func TestCooldownExpiryRestoresTarget(t *testing.T) {
	// 冷却到期必须自动恢复，否则一次抖动会让上游被永久摘除
	pool, urls := newTestPool(t, time.Millisecond, "http://a", "http://b")
	pool.MarkFailure("api", urls[0])

	time.Sleep(5 * time.Millisecond)

	found := false
	for i := 0; i < 4 && !found; i++ {
		for _, target := range pool.Candidates("api") {
			if target.URL.String() == urls[0].String() {
				found = true
			}
		}
	}
	if !found {
		t.Fatalf("冷却到期后应自动恢复")
	}
}

func TestCooldownNotExpiredKeepsTargetOut(t *testing.T) {
	pool, urls := newTestPool(t, time.Hour, "http://a", "http://b")
	pool.MarkFailure("api", urls[0])

	for _, target := range pool.Candidates("api") {
		if target.URL.String() == urls[0].String() {
			t.Fatalf("冷却未到期不该恢复")
		}
	}
}

func TestMarkingAnUnknownURLIsHarmless(t *testing.T) {
	// 上游配置热更新后可能收到已经不存在的 URL 的回报，不该 panic
	pool, _ := newTestPool(t, time.Minute, "http://a")
	pool.MarkFailure("api", mustURL(t, "http://ghost"))
	pool.MarkSuccess("nope", mustURL(t, "http://ghost"))

	if len(pool.Candidates("api")) != 1 {
		t.Fatalf("无关的标记不该影响既有候选")
	}
}

func TestSingleTargetAlwaysAvailable(t *testing.T) {
	// 只有一个上游时，即使它刚失败也必须继续被返回 —— 没有别的可选
	pool, urls := newTestPool(t, time.Hour, "http://only")
	pool.MarkFailure("api", urls[0])

	got := pool.Candidates("api")
	if len(got) != 1 {
		t.Fatalf("单上游在失败后仍应被返回，实际 %d 个", len(got))
	}
}
