# 任务可靠性：worker 崩溃时会丢任务

> 结论先行：**改 `task_acks_late`，并且这次是安全的** —— 因为写入侧本来就是幂等的。
> 下面是得出这个结论的测量。

## 现状

`celery_app` 除了 broker 和 backend 之外**没有任何配置**：

```python
celery_app = Celery("worker", broker=..., backend=...)
```

没有 `conf.update`，没有 `config_from_object`，`start-worker.sh` 的启动参数里也没有。
于是所有可靠性相关的项都停在 celery 的默认值上：

| 配置 | 当前值 | 含义 |
| --- | --- | --- |
| `task_acks_late` | `False` | 任务**一被取走就 ack**，还没开始执行就已经从队列里消失 |
| `task_reject_on_worker_lost` | `None` | worker 意外死亡时不把任务放回队列 |
| `broker_transport_options` | `{}` | Redis 的 visibility timeout 用默认值 |

也没有任何任务配置重试：全仓库没有 `self.retry`、没有 `autoretry_for`。
（`task_retry` 信号有监听器，但没有任何东西会触发它。TTS 引擎里的 `max_retries`
是它自己的 HTTP 重试，与 celery 无关。）

## 后果

worker 在执行任务时被终止 —— OOM、部署重启、`kill` —— 那个任务**永久消失**：

- 不会重跑；
- 也不会被标记失败，因为没有任何代码有机会执行到失败分支；
- 用户看到的是文档**永远停在"处理中"**。

启动参数是 `--pool=threads --concurrency=20`，所以一次重启最多丢 20 个正在执行的任务。
对一个"上传文档 → 异步处理"的产品，这是用户能直接感知到的。

## 为什么这次能安全地改

`task_acks_late=True` 的代价是任务**可能被执行两次**（worker 死在 ack 之前，任务回到
队列被别人拿走）。所以它只在处理幂等时才安全。测下来是幂等的：

| 写入 | 方式 | 主键 |
| --- | --- | --- |
| Milvus | `upsert_milvus` | `make_chunk_id()` |
| Neo4j | 全部 `MERGE`（无裸 `CREATE`） | `make_chunk_id()` / `make_entity_id()` |

关键在主键是**内容派生**而不是随机的：

```python
def make_chunk_id(doc_id, idx, text):
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"DOC_{doc_id}_IDX_{idx}_H_{h}"

def make_entity_id(entity_type, text, context_hash):
    key = f"{entity_type}|{text}|{context_hash}"
    return f"ENT_{sha256(key)[:16]}"
```

同一份文档重跑会命中同一批主键，`upsert` 与 `MERGE` 因此真正幂等 —— 不会累积重复
向量或重复实体。若这些 id 曾经是 `uuid4()`，重复执行会静静地把垃圾堆进向量库，
那时这个改动就是不能做的。

任务状态那一侧也是幂等的：每个工作流的 init 节点都是"取不到就建、状态不对就改写"，
重复执行只是把状态再设一遍。

## 方案

```python
celery_app.conf.update(
    task_acks_late=True,              # 执行完成后才 ack
    task_reject_on_worker_lost=True,  # worker 被杀时任务回到队列
    broker_transport_options={"visibility_timeout": ...},
)
```

`visibility_timeout` 需要**大于最慢任务的执行时间**，否则 Redis 会认为任务超时、把它
重新投递给另一个 worker，造成真正的并发重复执行。大文档的图谱构建可能跑很久，所以
这个值要按实际的 p99 处理时长来定 —— 这是唯一需要现场数据的参数。

## 不在本次范围

- **重试**：`acks_late` 解决的是"崩溃丢任务"，不是"任务失败自动重试"。要不要重试是
  另一个决定：当前设计里失败会写进任务行的 `detail` 并展示给用户，由人决定重跑，
  这本身是自洽的。
- **孤儿任务回收**：`acks_late` 之前丢掉的任务已经丢了，那些文档仍停在"处理中"。
  要清理需要一条"超过 N 小时仍在 PROCESSING 就判失败"的规则，而 N 是启发式的。
