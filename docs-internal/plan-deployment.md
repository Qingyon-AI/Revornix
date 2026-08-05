# 怎么部署合适

> 结论：**一份代码 + 一个 venv + 两个 systemd unit**，镜像继续双名发布给外部用户。
>
> 但在决定部署方式之前，有一件事的收益比换部署方式**大得多**，且与部署方式无关：
> **把 torch 变成可选依赖。**

## 0. 先说那件与部署无关的事

生产配置（两台服务都是）：

```
ALI_DASHSCOPE_EMBEDDING_ON=True     # 走阿里云 embedding
```

也就是说 **`LocalQwen3EmbeddingEngine` 在生产从不被使用**。但：

```python
# engine/__init__.py
from .embedding.qwen_local import LocalQwen3EmbeddingEngine   # ← 模块顶层
```

`import engine` 就会 import torch。于是每台机器、每个镜像、每次构建都在为一个
**永远不执行的分支**付钱：

| | 体积 |
| --- | ---: |
| `torch==2.13.0` wheel | **527 MB** |
| 装完（解压后） | 约 1.3 GB |
| 加上 sentence_transformers / transformers / scipy | 更多 |

（顺带纠正一个我差点写进结论的错误猜测：我以为 linux x86_64 上会连带拖进
十几个 `nvidia-*` CUDA 库、共 2–3 GB。实测 **0 个** —— torch 2.13 的默认 wheel
不再把 CUDA 拆成独立依赖。）

**要做的两件事：**

1. `factory.py` 里把本地引擎改成**用到才 import**（云端分支根本不碰 torch）；
2. torch / sentence_transformers 移到 `requirements-local-embedding.txt`，
   默认不装，需要本地推理的人自己装。

收益：每台机器省 ~1.3 GB，`docker-push.yml` 那 8 次构建的磁盘压力（它已经有
"构建前后查磁盘""构建完立刻删镜像"的步骤）大幅缓解，pip install 从几分钟变几十秒。

**这一步不依赖任何部署决定，应该先做。**

## 1. 部署方式：建议保持 systemd

现状：`81.69.44.65` 跑 api + worker（同一台），`124.220.82.121` 跑 Milvus + Neo4j。

| | systemd + 源码 | docker compose |
| --- | --- | --- |
| 环境可复现 | 弱（靠 pin） | 强 |
| 回滚 | `git checkout` + 重启 | 换 tag |
| 部署耗时 | 去掉 torch 后几十秒 | 拉镜像，国内从 Docker Hub 慢 |
| 隔离价值 | — | api/worker 同机，隔离收益有限 |
| 运维复杂度 | 低 | 多一层 |

**建议 systemd**，理由不是"docker 不好"，而是这几条具体的：

- api 与 worker **在同一台机器**上，docker 的进程隔离在这里换不来什么；
- 国内 VPS 拉 Docker Hub 是实打实的摩擦，而去掉 torch 后源码部署几乎没有慢的地方了；
- 依赖已经全部 pin 死，漂移风险可控；
- 数据库结构**自愈**（`data/sql/bootstrap.py`），升级不需要人工迁移 —— docker 常见的
  "迁移要在容器里跑"这类麻烦本来就不存在。

镜像不要停止发布：README 有中/日/英三版，是对外的项目，别人可能正按
`revornix/api`、`revornix/celery-worker` 自部署。

## 2. 合并之后的形态

```
revornix/
  app/          领域层（models, crud, schemas, common, data, engine …）
  api/          router/, mcp_router/, main.py
  worker/       workflow/, celery app
  requirements.txt                    ← 一份（并集 65 个包，零版本冲突）
  requirements-local-embedding.txt    ← 可选：torch 等
  Dockerfile                          ← 一份基础镜像
```

**两个 systemd unit，同一个 venv、同一个工作目录，只差启动命令：**

```ini
# revornix-api.service
WorkingDirectory=/opt/revornix
ExecStart=/opt/revornix/.venv/bin/fastapi run api/main.py --port 8001

# revornix-worker.service
WorkingDirectory=/opt/revornix
ExecStart=/opt/revornix/.venv/bin/celery -A worker.celery_app worker --pool=threads --concurrency=20
```

**镜像仍发两个名字**，靠共享底层实现，torch 不再在其中：

```dockerfile
FROM python:3.11-slim AS base
# 依赖与代码只装一次

FROM base AS api
CMD ["fastapi", "run", "api/main.py", "--port", "8001"]

FROM base AS worker
CMD ["/app/start-worker.sh"]
```

Docker 的层共享让重的那部分只构建、只推送一次；两个 tag 之间差的是几百字节的
元数据。对外两个名字照旧，**现有 compose 文件一行不用改**。构建矩阵从 8 次降到
6 次（web、hot-news 各 2，api/worker 合用一次基础构建 + 两个薄层）。

## 3. 顺序

1. **torch 可选化** —— 与部署无关，收益最大，风险最小；
2. 合并源码（`plan-one-codebase.md`）；
3. 改两个 systemd unit 的 `WorkingDirectory` 与 `ExecStart`；
4. Dockerfile 改成 base + 两个薄层。

第 1 步和第 4 步都可以独立先做。第 2、3 步要一起上，因为 unit 里的路径会变。
