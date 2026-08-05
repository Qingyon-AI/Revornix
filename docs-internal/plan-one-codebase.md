# 有必要拆成两份代码吗

> 结论：**源码不必拆，镜像大概率也不必拆，进程必须拆。**
>
> 而这个结论让 `plan-shared-extraction.md` 里剩下的那部分工作**基本失去意义** ——
> 那些"拆文件解依赖环"的活，只有在"必须把代码分给 api/、worker/、shared/ 三个
> 地方"的前提下才需要做。

三个问题一直被混在一起谈，分开之后答案并不相同。

## 一、两份源码？不必，而且代价已经付出来了

这一整轮工作里发现的缺陷，**没有一个与业务逻辑有关，全部来自"同一份代码存了两份"**：

| 缺陷 | 成因 |
| --- | --- |
| worker 起不来（P0） | 镜像文件依赖了 worker 侧不存在的符号 |
| 向量写入不幂等 | `insert` 而非 `upsert`，两侧**各错一遍** |
| 同一守卫抛不同异常类型 | 两份实现各自演化 |
| `protocol` 声明与实现不符 | worker 那份是陈旧副本 |
| 建表只能由 api 做 | worker 的 `models/` 少两张表 |
| 令牌吊销机制只建了一半 | api 的 `create_token` 加了 `auth_epoch`，worker 那份没跟上 |

镜像检查能挡住"改了一侧忘了另一侧"，但挡不住上面任何一条 —— 它保证的是
**两侧一样**，而这些问题恰恰是"两侧本来就不一样"。

## 二、两个镜像？看不出理由

两个 Dockerfile 去掉注释后的**全部**差异：

```
COPY api/requirements.txt          vs  COPY worker/requirements.txt
apt-get install ... curl           vs  apt-get install ...（无 curl）
COPY api/                          vs  COPY worker/
EXPOSE 8001                        vs  （无）
CMD ["fastapi", "run", ...]        vs  CMD ["/app/start-worker.sh"]
```

同一个基础镜像（`python:3.11-slim`）、同一套分层结构。而依赖：

| | 包数 | 说明 |
| --- | ---: | --- |
| api | 55 | 独有 6 个，全是轻量库（fastapi、apscheduler、webauthn…） |
| worker | 59 | 独有 10 个（modelscope、huggingface_hub、rapid_table…） |
| **并集** | **65** | **同包版本冲突：0 个** |
| 两侧共有 | 49 | **其中包括 `torch==2.13.0` 和 `sentence_transformers`** |

**最重的 torch 两边都装。** 合并后是 65 个包，只比 worker 现在的 59 多 6 个，
镜像大小的变化被 torch 淹没。

顺带一个可量化的收益：`docker-push.yml` 的构建矩阵是
`[web, hot-news, worker, api] × [amd64, arm64]` = **8 次构建**，其中 4 次
各装一遍 torch。这个流水线里已经有"构建前后检查磁盘"和"构建完立刻删镜像释放空间"
的步骤 —— 说明它在撑爆 runner。合并 api 与 worker 之后是 6 次。

## 三、两个进程？必须

这一条与源码怎么放**无关**，三个理由都成立：

- **爆炸半径**：worker 跑 OCR 与向量化，OOM 或被 kill 不该带走 API；
- **伸缩轴不同**：worker 随文档量伸缩，api 随请求量伸缩；
- **重启独立**：发一次 API 不该打断正在跑的文档处理。

这正是 Django + Celery、Rails + Sidekiq 的标准形态：**一份代码、一个镜像、
两个入口，用不同的启动命令部署成两个进程。**

## 目标形态

```
revornix/
  app/            models, crud, schemas, enums, config, common, data,
                  engine, notification, proxy, file, protocol, prompts …
  api/            router/, mcp_router/, main.py        ← 入口一
  worker/         workflow/, celery app                ← 入口二
  requirements.txt                                     ← 一份
  Dockerfile                                           ← 一份
```

部署：同一个镜像，`CMD` 分别是 `fastapi run` 与 `celery worker`。

## 这让剩下的提取工作失去意义

`plan-shared-extraction.md` 停在一个 7 层强连通分量上，说下一步要"拆
`image_generate_engine_base.py`，把抽象基类和调 LLM 的具体方法分开"，才能继续
往 shared 搬。

**但依赖环之所以是障碍，只因为要把代码分给三个地方。** 如果只有一个地方，环
就只是代码质量问题（值得慢慢改），不再是任何事情的前置条件。

已经搬进 `shared/` 的 9 层（96 个文件）不白费：合并时它们直接成为 `app/` 的一部分，
而且它们已经是**唯一一份**了。真正省下的是剩下 129 个同路径文件 —— 不必再逐个
调和，直接选一份留下即可，判据前面已经算过（72 个真分歧里 4 个需人工决定）。

## 动手之前要先确认的

这份分析是从仓库里读出来的，有两件事只有你知道：

1. **部署侧是否依赖两个镜像名**。线上是 systemd 而非 docker（主服务在
   81.69.44.65），如果 systemd unit 是按目录组织的，合并要同步改 unit。
2. **是否有人按镜像做权限或配额隔离**（比如只给 worker 挂模型缓存卷）。
   一个镜像两个 CMD 不影响这类隔离，但配置要跟着调。

技术上没有拦路的东西：requirements 零冲突、基础镜像相同、torch 两边都有。
