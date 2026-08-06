# 部署（systemd）

线上用 systemd 从源码跑，不用容器。理由与取舍写在
`docs-internal/plan-deployment.md`，这里只讲怎么做。

两个 unit 文件在本目录，它们**只差启动命令** —— 因为两个服务本来就是同一份代码
的两个入口（`app/` 是应用本体，`api/` 与 `worker/` 各是一层薄入口）。

## 前置

- Ubuntu，`uv`（`curl -LsSf https://astral.sh/uv/install.sh | sh`）
- Postgres、Redis 在本机；Milvus、Neo4j 在另一台（同 VPC）
- 不需要预装 Python：`uv sync` 按 `requires-python` 自己取 3.11

## 首次安装

```bash
sudo mkdir -p /opt/revornix && sudo chown ubuntu:ubuntu /opt/revornix
git clone <repo> /opt/revornix && cd /opt/revornix

# **一条命令装两个服务。** uv workspace：一份 uv.lock、仓库根一个 .venv，
# api / worker / app 都是其中的成员，app 以可编辑方式装入（改代码不必重装）。
uv sync --locked --all-packages
uv run --directory worker playwright install chromium-headless-shell

# 配置：**每个服务目录各一份 .env**（见下面"为什么不能合并成一份"）
cp api/.env.example    api/.env     && vim api/.env
cp worker/.env.example worker/.env  && vim worker/.env

sudo cp deploy/revornix-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now revornix-api revornix-worker
```

unit 里写死的是 `/opt/revornix` 和用户 `ubuntu`，换路径就同步改这两处。

## 升级

```bash
cd /opt/revornix && git pull

# 依赖没变时是空操作，无脑跑就行
uv sync --locked --all-packages

sudo systemctl restart revornix-api revornix-worker
```

**不需要任何手动初始化。** `app/data/sql/bootstrap.py` 在 API 每次启动时跑四步幂等
操作：建表 → 补列（`schema_guard`）→ 补内置数据 → 确保 Milvus 集合存在。全新安装和升级都只要把服务起起来。
worker 侧在 `worker_init` 里也会跑一次 `schema_guard`，所以 worker 先起也不会撞上缺列。

## 验证

```bash
systemctl status revornix-api revornix-worker
journalctl -u revornix-api -n 50 --no-pager

curl -sf localhost:8001/docs -A "Mozilla/5.0" -o /dev/null && echo "api ok"
# 注意要带 User-Agent：应用自带反爬中间件，裸 curl 会被 401/500 挡掉。

# worker 是否真的在消费队列（而不只是进程活着）
cd /opt/revornix/worker && /opt/revornix/.venv/bin/celery -A common.celery.app inspect ping
```

## 五个容易踩的地方

**1. `WorkingDirectory` 不能省，也不能改。**
合并成单一 `app/` 包之后，有两处按**工作目录**取值：

- `app/config/base.py` 的 `BASE_DIR` —— 日志写到 `BASE_DIR/logs/`
- 各处 `load_dotenv(find_dotenv(usecwd=True))` —— 决定读哪份 `.env`

以前它们靠"代码文件恰好在服务目录里"生效；代码搬进 `app/` 之后，工作目录成了唯一
依据。在别处启动会读到**仓库根那个 `.env`**（那是另一份配置），而不是报错。

**2. venv 在仓库根，不在服务目录。**
`uv sync` 建的是 `/opt/revornix/.venv`，两个服务共用它（unit 里的 `ExecStart` 和
`PATH` 都指这里）。目录一旦改名就必须重建 —— venv 里存的是绝对路径，脚本 shebang
会直接坏掉（`bad interpreter`）。`rm -rf .venv && uv sync --locked --all-packages`，
不要试图沿用。

unit 里写的是 venv 里的可执行文件，不是 `uv run`：`uv run` 每次会校验 lock、必要时
改 venv，那是开发期的便利，不该出现在服务启动路径上。

**3. worker 的停止超时给到 300 秒。**
配了 `task_acks_late`：被强杀的任务会重投，而重跑一份大文档是分钟级的浪费。
`KillSignal=SIGTERM` 让 celery 做完手上的活再退。

**4. 浏览器不是 Python 包，`uv sync` 不管它。**
`playwright install chromium-headless-shell` 要单独跑一次(上面的首次安装里有)。
只装 headless shell 是有意的:代码里所有 `launch` 都是 `headless=True`，而
`playwright install chromium` 会连完整浏览器(641 MB)一起下，headless 模式根本
不用它。改成 headful 的话这里也要跟着换 —— `worker/tests/test_playwright_headless_only.py`
会拦住只改一边的情况。

容器部署不需要这一步:`worker/Dockerfile` 里已经装好了。

**5. torch 默认不装。**
生产走云端 embedding（`ALI_DASHSCOPE_EMBEDDING_ON=True`），本地推理引擎一次都不会
加载。要用本地推理才装：

```bash
uv sync --locked --all-packages --extra local-embedding
```

**`--all-packages` 不能省。** 两个服务共用仓库根那一个 venv，而 `uv sync` 是
「让 venv 精确等于所选包的依赖集」，不是「往里加东西」：写成
`--package revornix-api --extra local-embedding` 会装上 torch，同时把只有 worker
需要的包（playwright 的 shapely 等）**卸掉** —— api 起得来，worker 悄悄坏掉。

不装而又把 `ALI_DASHSCOPE_EMBEDDING_ON` 关掉的话，`get_embedding_engine()` 会抛
`ImportError` —— 那是有意的，比让所有人默默多背 1.3 GB 好。

## 为什么不合并成一份 .env

两个服务的配置有重叠但不相同（比如 Sentry DSN 各一套，`API_SENTRY_*` 与
`WORKER_SENTRY_*`）。而 `OAUTH_SECRET_KEY` **必须两边一致** —— worker 要验证 API
签发的 JWT，不一致会让鉴权链静默失效。

## 回滚

```bash
cd /opt/revornix && git checkout <上一个 tag 或 commit>
uv sync --locked --all-packages   # uv.lock 跟着 checkout 回到那一版，依赖一起回滚
sudo systemctl restart revornix-api revornix-worker
```

数据库这一侧不需要回滚动作：`schema_guard` 只加列不删列，旧代码在新表上照常工作。
