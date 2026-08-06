#!/usr/bin/env bash
# 本机起服务。线上用 systemd（deploy/*.service），这里不用。
#
#   ./scripts/dev.sh api       前台跑 api（:8001）
#   ./scripts/dev.sh worker    前台跑 celery worker
#   ./scripts/dev.sh           只检查依赖并打印上面两条命令
#
# **一次只跑一个，而且是前台 exec。** 这一点是刻意的：
# 先前写过一版"一条命令同时起两个"的，用后台任务加 trap 收尾 —— 试了两版都没能
# 可靠清理，Ctrl-C 之后 celery 和 fastapi 全留在后台。一个会漏掉孤儿 worker 的
# 启动脚本比没有更糟：那些进程会继续从队列里领任务，而你以为它们已经停了。
# exec 到子进程之后，信号直达，结构上就不存在"没收干净"这回事。
#
# 依赖的存储自己起：
#   cp .env.local.example .env.local     # 首次
#   docker compose -f docker-compose-local.yaml --env-file .env.local up -d
#
# --env-file 不能省。compose 文件里有 12 处 ${VAR} 替换，而配置**刻意不叫 .env** ——
# 叫 .env 的话 docker compose 会隐式读到它（这是它的默认行为，不需要任何声明），
# 同时 load_dotenv(find_dotenv(usecwd=True)) 在仓库根跑服务时也会读到它。
# 两套东西共用一个文件名，而它们要的根本不是同一份配置。
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
REPO="$PWD"
WHICH="${1:-}"

check_infra() {
  python3 - <<'PY'
import socket, sys
need = [("postgres", 5432), ("redis", 6379)]
opt  = [("neo4j", 7687), ("milvus", 19530)]
missing = []
for name, port in need + opt:
    s = socket.socket(); s.settimeout(1)
    try:
        s.connect(("127.0.0.1", port)); print(f"  ✓ {name}:{port}")
    except Exception:
        required = (name, port) in need
        print(f"  {'✗' if required else '—'} {name}:{port} 不通{'（必需）' if required else '（按需）'}")
        if required: missing.append(name)
    finally:
        s.close()
if missing:
    print(f"\n  缺 {', '.join(missing)}，服务起不来：")
    print("    docker compose -f docker-compose-local.yaml --env-file .env.local up -d")
    sys.exit(1)
PY
}

need_venv() {  # 整个 workspace 一个 .venv
  [ -x "$REPO/.venv/bin/python" ] && return 0
  echo "✗ .venv 不可用。在仓库根跑：uv sync --all-packages" >&2
  return 1
}

echo "── 依赖存储 ──"
check_infra || exit 1

case "$WHICH" in
  api)
    need_venv || exit 1
    echo "── api :8001（Ctrl-C 停止）──"
    # cd 到服务目录不是习惯：BASE_DIR（日志）与 load_dotenv(usecwd=True)（读哪份
    # .env）都按工作目录取值。在仓库根跑会读到根目录那个 .env，是另一份配置。
    exec uv run --directory "$REPO/api" fastapi run main.py --host 127.0.0.1 --port 8001
    ;;
  worker)
    need_venv || exit 1
    echo "── worker（Ctrl-C 停止）──"
    exec uv run --directory "$REPO/worker" celery -A common.celery.app worker --pool=threads --concurrency=4 --loglevel=info
    ;;
  "")
    echo
    echo "两个服务各开一个终端跑："
    echo "    ./scripts/dev.sh api"
    echo "    ./scripts/dev.sh worker"
    ;;
  *)
    echo "不认识的参数：$WHICH（可选：api / worker）" >&2; exit 2
    ;;
esac
