#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

export PYTHONPATH="${SCRIPT_DIR}${PYTHONPATH:+:${PYTHONPATH}}"

cd "${SCRIPT_DIR}"

if [ "$#" -eq 0 ]; then
  set -- --pool=threads --concurrency=20 --loglevel=info -E
fi

exec celery -A common.celery.app worker "$@"
