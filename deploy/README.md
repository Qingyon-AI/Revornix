# 部署（systemd）

线上用 systemd 从源码跑，不用容器。理由与取舍写在
`docs-internal/plan-deployment.md`，这里只讲怎么做。

本目录的 5 个 unit 文件是**从生产机上导出的**，不是模板 —— 路径写死成部署机上的
实际位置。换机器就得改 `WorkingDirectory`、`ExecStart` 和 `PATH` 里的三处路径。

## 线上是什么样的

**81.69.44.65** —— 应用与主要存储，全部 systemd，没有容器：

| 服务 | 端口 | 启动方式 |
|---|---|---|
| nginx | 80 / 443 | 所有域名的 TLS 入口（certbot 管证书） |
| revornix-gateway | 8787 | 预编译的 Go 二进制 `gateway/gateway` |
| revornix-api | 8001 | `.venv/bin/fastapi` |
| revornix-worker | — | `worker/start-worker.sh`，PATH 指向同一个 `.venv/bin` |
| revornix-website | 3000 | `node .next/standalone/server.js` |
| revornix-hot-news | 6688 | `pnpm start` |
| postgres / redis / minio | 5432 / 6379 / 9000-9001 | 装在本机 |

nginx 把 `api.` / `hot-news.` / `pay.` 三个域名都指向 8787，由 gateway 内部按域名
分流；`app.` 与 `revornix.ai` 直接到 3000。

**124.220.82.121** —— 数据与可观测，全是 docker：Milvus（19530）+ etcd + minio，
以及一整套 SignOz。Neo4j 是这台的 systemd 服务，不是容器。

## 前置

- Ubuntu 24.04，8 核 / 16G
- `uv`：`curl -LsSf https://astral.sh/uv/install.sh | sh`
- Node 24（nvm）、Go 1.25
- 不需要预装 Python：`uv sync` 按 `requires-python` 自己取 3.11

**GitHub 的 SSH key 如果不是默认文件名，必须写进 `~/.ssh/config`。**
部署机上那把叫 `id_ed25519_github`，没有 config 时 ssh 根本不会用它，
`git fetch` 报的是 `Permission denied (publickey)` —— 看着像 key 没权限，
实际是 key 压根没被读到：

```
Host github.com
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
```

## 首次安装

```bash
git clone git@github.com:Qingyon-AI/Revornix.git ~/Developer/Revornix-new
cd ~/Developer/Revornix-new

# Python：一条命令装完 api 与 worker（同一个 uv workspace，共用仓库根一个 .venv）
uv sync --locked --all-packages
uv run --directory worker playwright install chromium-headless-shell

# 前端与网关
( cd gateway  && go build -o gateway ./cmd/gateway )
( cd hot-news && pnpm install --frozen-lockfile && pnpm build )
( cd web      && pnpm install --frozen-lockfile && pnpm build )

# Next standalone 不会自己带上静态资源，必须手动拷 —— 少了这步前端静态资源全 404
cp -r web/.next/static web/.next/standalone/.next/
cp -r web/public       web/.next/standalone/

# 配置：每个服务目录各一份 .env（见下面「为什么不合并成一份」）
cp api/.env.example      api/.env      && vim api/.env
cp worker/.env.example   worker/.env   && vim worker/.env
cp web/.env.example      web/.env      && vim web/.env
cp gateway/.env.example  gateway/.env  && vim gateway/.env

sudo cp deploy/revornix-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now revornix-api revornix-worker revornix-gateway revornix-hot-news revornix-website
```

**不需要任何手动初始化。** `app/data/sql/bootstrap.py` 在 API 每次启动时跑四步幂等
操作：建表 → 补列（`schema_guard`）→ 补内置数据 → 确保 Milvus 集合存在。
worker 侧在 `worker_init` 里也会跑一次 `schema_guard`，所以 worker 先起也不会撞上缺列。

## 升级

```bash
cd ~/Developer/Revornix-new && git pull

uv sync --locked --all-packages          # 依赖没变时是空操作
( cd gateway  && go build -o gateway ./cmd/gateway )
( cd hot-news && pnpm install --frozen-lockfile && pnpm build )
( cd web      && pnpm install --frozen-lockfile && pnpm build \
              && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ )

sudo systemctl restart revornix-api revornix-worker revornix-gateway revornix-hot-news revornix-website
```

## 验证

```bash
systemctl is-active revornix-api revornix-worker revornix-gateway revornix-hot-news revornix-website

curl -sf localhost:8001/docs -A "Mozilla/5.0" -o /dev/null && echo "api ok"
# 要带 User-Agent：应用自带反爬中间件，裸 curl 会被挡掉。

# worker 是否真的在消费队列（而不只是进程活着）
cd ~/Developer/Revornix-new/worker && ../.venv/bin/celery -A common.celery.app inspect ping
```

`systemctl is-active` 说 active 只代表进程没退出。**判断 worker 是否真的可用，只有
`inspect ping` 返回 `1 node online` 才算数** —— 它起来了但连不上 broker 时，进程照样
是 active 的。

## 换部署方式时：蓝绿，别原地改

这份文档描述的部署方式是 2026-08 从 conda 迁过来的。当时的做法值得留下来：

**在新目录里装好、验证通过，再切 unit。** 旧目录和旧环境全程不动，回滚就是把 unit
文件换回去重启。原地升级则是把退路和目标绑在一起 —— 中途失败时两边都不完整。

切换前验证的不该是"能启动"，而是这些：

- `from main import app` 之后 `len(app.openapi()["paths"])` 与线上接口数一致（318）
- 用生产配置连一次 Postgres 做只读查询，行数与备份对得上
- worker 能 import 全部工作流模块

**删除旧环境之前，先在删除后重启一次。** 不重启就无法证明服务真的不依赖它 ——
迁移那次删掉 17.7G 的 conda 环境后重启，api 与 worker 都正常，那一步才算完。

## 六个容易踩的地方

**1. `WorkingDirectory` 不能省，也不能改。**
合并成单一 `app/` 包之后，有两处按**工作目录**取值：

- `app/config/base.py` 的 `BASE_DIR` —— 日志写到 `BASE_DIR/logs/`
- 各处 `load_dotenv(find_dotenv(usecwd=True))` —— 决定读哪份 `.env`

以前它们靠"代码文件恰好在服务目录里"生效；代码搬进 `app/` 之后，工作目录成了唯一
依据。在别处启动会读到**仓库根那份配置**，而不是报错。

**2. venv 在仓库根，不在服务目录。**
`uv sync` 建的是 `<repo>/.venv`，两个 Python 服务共用它。目录一旦改名就必须重建 ——
venv 里存的是绝对路径，脚本 shebang 会直接坏掉（`bad interpreter`）。

unit 里写的是 venv 里的可执行文件，不是 `uv run`：`uv run` 每次会校验 lock、必要时
改 venv，那是开发期的便利，不该出现在服务启动路径上。

**3. `uv sync` 在国内很慢，而且换镜像没有用。**
`uv.lock` 里写死了 1288 个 `files.pythonhosted.org` 的下载 URL，`--frozen` 与
`--locked` 都直接用它们，`UV_DEFAULT_INDEX` 根本不参与。迁移那次实测约 70 KB/s，
306 个包下了两个多小时。设了腾讯云镜像也没变 —— 连接对端仍然是 PyPI 的 CDN。

真要加速只有两条路：给机器配一个能快速访问 PyPI 的代理，或者接受它慢。
**不要为了用镜像去重新生成 lock** —— 那样线上装的版本就不再是本地验证过的那一套。

**4. worker 的停止超时给到 300 秒。**
配了 `task_acks_late`：被强杀的任务会重投，而重跑一份大文档是分钟级的浪费。
`KillSignal=SIGTERM` 让 celery 做完手上的活再退。

**5. 浏览器不是 Python 包，`uv sync` 不管它。**
`playwright install chromium-headless-shell` 要单独跑一次。只装 headless shell 是
有意的：代码里所有 `launch` 都是 `headless=True`，而 `playwright install chromium`
会连完整浏览器（641 MB）一起下，headless 模式根本不用它。改成 headful 的话这里也要
跟着换 —— `worker/tests/test_playwright_headless_only.py` 会拦住只改一边的情况。

**6. torch 默认不装。**
生产走云端 embedding（`ALI_DASHSCOPE_EMBEDDING_ON=True`），本地推理引擎一次都不会
加载。要用本地推理才装：

```bash
uv sync --locked --all-packages --extra local-embedding
```

**`--all-packages` 不能省。** 两个服务共用仓库根那一个 venv，而 `uv sync` 是
「让 venv 精确等于所选包的依赖集」，不是「往里加东西」：写成
`--package revornix-api --extra local-embedding` 会装上 torch，同时把只有 worker
需要的包（playwright 的 shapely 等）**卸掉** —— api 起得来，worker 悄悄坏掉。

## 为什么不合并成一份 .env

两个服务的配置有重叠但不相同（比如 Sentry DSN 各一套，`API_SENTRY_*` 与
`WORKER_SENTRY_*`）。而 `OAUTH_SECRET_KEY` **必须两边一致** —— worker 要验证 API
签发的 JWT，不一致会让鉴权链静默失效。迁移时复制配置，这是唯一必须逐个核对的项。

## 回滚

代码回滚就是 `git checkout <上一个 tag 或 commit>` + 重新 `uv sync` 与前端构建。
**但要注意跨越目录结构变更的回退**：`worker/` 在 2026-08 之前叫 `celery-worker/`，
退到那之前的 commit，unit 的 `WorkingDirectory` 也得跟着改回去，否则 worker 起不来。

数据库这一侧通常不需要动作：`schema_guard` 只加列不删列，旧代码在新表上照常工作。

**机器上没有常备的数据库备份。** 迁移时那份 `pg_dumpall` 是一次性的，迁移完成后已
删除 —— 它是「迁移前快照」，而库在持续写入，留着它反而会诱使人恢复一份过期数据。
做有风险的变更之前自己打一份：

```bash
sudo -u postgres pg_dumpall | gzip > ~/pg-$(date +%Y%m%d-%H%M%S).sql.gz
```

打完**验一下再动手**，不然拿到的是虚假的安全感：`gzip -t` 能过、末尾有
`PostgreSQL database cluster dump complete`、抽一张表数一下行数与 `select count(*)`
对得上。（迁移那次我 grep 结束标记时把 `cluster` 写成了 `database`，一度以为备份被
截断了。）
