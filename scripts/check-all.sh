#!/usr/bin/env bash
# 在本地跑一遍 CI 会跑的检查，省掉「推上去才发现红了」的往返。
#
# 每一步都对应 .github/workflows/ 里的一个步骤。依赖没装好的服务会被**跳过**而不是
# 判失败 —— 没人会在一台机器上同时装齐 api 的 torch、Go 工具链和三套 node_modules，
# 而一个动不动就红的本地脚本没人会用。
#
#   ./scripts/check-all.sh              跑全部（不含集成测试）
#   ./scripts/check-all.sh web api      只跑指定的（分组：app api worker web gateway hot-news desktop docs）
#   ./scripts/check-all.sh integration  跑集成测试（要先起容器，见下）
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ONLY=("$@")
PASS=0; FAIL=0; SKIP=0
FAILED_STEPS=()

want() {  # 没给参数就全跑；给了就只跑匹配的
  [ ${#ONLY[@]} -eq 0 ] && return 0
  local target="$1"
  for o in "${ONLY[@]}"; do [ "$o" = "$target" ] && return 0; done
  return 1
}

want_explicit() {  # 只有被点名才跑，"跑全部"也不带上它
  # 这个空数组判断不是多余的：set -u 下 macOS 自带的 bash 3.2 会把空数组的
  # ${ONLY[@]} 当成未绑定变量而直接退出 —— 表现是无参数运行时脚本死在这里，
  # **连最后的汇总行都不打印**。一个不报结果的检查脚本比没有更糟。
  [ ${#ONLY[@]} -eq 0 ] && return 1
  local target="$1"
  for o in "${ONLY[@]}"; do [ "$o" = "$target" ] && return 0; done
  return 1
}

step() {  # step <分组> <名称> <命令...>
  local group="$1" name="$2"; shift 2
  want "$group" || return 0
  local out
  if out=$("$@" 2>&1); then
    printf '  \033[32m✓\033[0m %s\n' "$name"; PASS=$((PASS+1))
  else
    # 依赖没装 → 跳过而不是失败。
    #
    # 这套模式必须**保守**：宁可误报失败，也不能把真实失败吞成跳过 —— 一个会漏报的
    # 检查脚本比没有更危险。（曾经为了迁就本机不完整的 Go 工具链加过 "no such tool"，
    # 结果一个故意失败的测试被判成了跳过，随即撤掉。工具链不全属于这台机器的问题，
    # 该如实报出来，而不是让脚本替它遮掩。）
    if grep -qiE "command not found|no such file or directory|ModuleNotFoundError|ERR_PNPM_NO_LOCKFILE|cannot find module" <<<"$out"; then
      printf '  \033[33m—\033[0m %s（依赖未装，跳过）\n' "$name"; SKIP=$((SKIP+1))
    else
      printf '  \033[31m✗\033[0m %s\n' "$name"; FAIL=$((FAIL+1)); FAILED_STEPS+=("$group/$name")
      sed 's/^/        /' <<<"$(tail -5 <<<"$out")"
    fi
  fi
}

in_dir() { local d="$1"; shift; (cd "$d" && "$@"); }

echo "── 跨服务 ──"
step app      "app 语法检查"           uv run python -m compileall -q app
step app      "导入的名字是否真的存在"    python3 scripts/check_imports.py
# 上一条查的是「import 进来的名字在源模块里存不存在」，查不出「用了一个压根没
# import 的名字」—— 那是 NameError，要等那行代码真的被执行才炸。合并代码时把函数
# 从一个文件搬到另一个、只搬函数体不搬 import，产生的正是这一类：整整 18 处，
# 全在同一个文件里，而单元测试和 compileall 都是绿的，因为没有一条路径走到那些行。
step app      "有没有用到未定义的名字"    uv run --no-project --python 3.11 --with ruff ruff check --select F821 --no-cache --quiet app api worker

echo "── api ──"
step api "OpenAPI spec 是最新的" uv run --directory api python -m scripts.export_openapi --check
step api "单元测试"               uv run --directory api python -m pytest tests -q -p no:cacheprovider

echo "── worker ──"
# crud/models/schemas/config/protocol 已搬进 app/，这里只列 worker 下还剩的。
# compileall 对不存在的目录只打印一行"Can't list"、退出码仍是 0 —— 列错了会静静少查。
step worker "语法检查" uv run --directory worker python -m compileall -q workflow
# 本地直接用 workspace 那个 .venv（什么都装着，跑得最快）。CI 用
# `uv sync --only-group dev` 装一个 31 包的精简环境 —— 差异是刻意的，但也意味着
# **本地绿不代表 CI 绿**：漏声明一个测试依赖，只有 CI 会红。
step worker "单元测试" uv run --directory worker python -m pytest -q -p no:cacheprovider

echo "── web ──"
step web "类型检查" in_dir web npx tsc --noEmit -p tsconfig.json
step web "单元测试" in_dir web pnpm test

echo "── gateway ──"
step gateway "格式检查" bash -c 'cd gateway && test -z "$(gofmt -l .)"'
step gateway "构建"     in_dir gateway go build ./...
step gateway "单元测试" in_dir gateway go test ./...

echo "── hot-news ──"
step hot-news "lint"     in_dir hot-news pnpm lint
step hot-news "单元测试" in_dir hot-news pnpm test
step hot-news "构建"     in_dir hot-news pnpm build

echo "── desktop ──"
# desktop 与其余前端一样用 pnpm。仓库曾同时存在两份 lock（package-lock.json 停在
# 7 月，pnpm-lock.yaml 一直在更新），因为唯一用 npm 的 desktop-release.yml 从未运行过。
step desktop "单元测试" in_dir desktop pnpm test

echo "── docs ──"
step docs "构建" in_dir docs pnpm build

# 集成测试：真连 Postgres / Neo4j / Milvus，分钟级。
#
# 用 want_explicit 而不是 want —— 不点名就不跑，连"跑全部"也不带上它。这条脚本
# 的价值在于随手一跑就有结论，而起五个容器等两分钟是另一种性质的事，不该被
# 默默塞进来。CI 侧同理：它在单独的 integration.yml 里，不挂 push/PR。
if want_explicit integration; then
  echo "── 集成测试 ──"
  echo "  (需先起容器: docker compose -f worker/tests_integration/docker-compose.yaml up -d --wait)"
  step integration "写入幂等与入口可导入" \
    env REVORNIX_INTEGRATION=1 \
        POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=revornix \
        POSTGRES_DB_URL=localhost:45432 \
        NEO4J_URI=bolt://localhost:47687 NEO4J_USER=neo4j NEO4J_PASS=neo4jneo4j \
        MILVUS_CLUSTER_ENDPOINT=http://localhost:49530 \
        uv run --directory worker python -m pytest tests_integration -q
fi

echo
printf '通过 %d · 跳过 %d · 失败 %d\n' "$PASS" "$SKIP" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf '失败的步骤：%s\n' "${FAILED_STEPS[*]}"
  exit 1
fi
