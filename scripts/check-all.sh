#!/usr/bin/env bash
# 在本地跑一遍 CI 会跑的检查，省掉「推上去才发现红了」的往返。
#
# 每一步都对应 .github/workflows/ 里的一个步骤。依赖没装好的服务会被**跳过**而不是
# 判失败 —— 没人会在一台机器上同时装齐 api 的 torch、Go 工具链和三套 node_modules，
# 而一个动不动就红的本地脚本没人会用。
#
#   ./scripts/check-all.sh          跑全部
#   ./scripts/check-all.sh web api  只跑指定的
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
step shared   "api ⇄ worker 镜像文件一致" python3 scripts/check_mirrored_files.py
step shared   "shared 语法检查"           python3 -m compileall -q shared

echo "── api ──"
step api "OpenAPI spec 是最新的" in_dir api python -m scripts.export_openapi --check
step api "单元测试"               in_dir api python -m pytest tests -q -p no:cacheprovider

echo "── celery-worker ──"
step worker "语法检查" in_dir celery-worker python -m compileall -q workflow common crud models schemas notification
step worker "单元测试" in_dir celery-worker python -m pytest -q -p no:cacheprovider

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
step desktop "单元测试" in_dir desktop pnpm test

echo "── docs ──"
step docs "构建" in_dir docs pnpm build

echo
printf '通过 %d · 跳过 %d · 失败 %d\n' "$PASS" "$SKIP" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf '失败的步骤：%s\n' "${FAILED_STEPS[*]}"
  exit 1
fi
