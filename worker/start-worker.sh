#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# 不再设 PYTHONPATH：workflow 已在 pyproject 里声明为包内容，装进 venv 就能 import。
# 靠 PYTHONPATH 的时候，任何不经过本脚本的启动方式（比如 uv run celery）都会在
# 任务执行时报 ModuleNotFoundError，而进程本身看着是好的。

cd "${SCRIPT_DIR}"

if [ "$#" -eq 0 ]; then
  set -- --pool=threads --concurrency=20 --loglevel=info -E
fi

exec celery -A common.celery.app worker "$@"
