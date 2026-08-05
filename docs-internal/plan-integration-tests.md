# 集成测试：值不值得做，先做哪一条

> 结论先行：**值得，但只做一条**——「重复执行是否安全」的契约测试。
> 已落地：12 条用例、一轮约 100 秒、独立 workflow、不挂 push/PR。
>
> 而它在写出来之前就已经还本了。三个缺陷都是这套东西逼出来的：
>
> 1. **celery-worker 起不来**（P0）——镜像文件依赖了 worker 侧不存在的符号，
>    `compileall` 和单元测试各自因为"只编译"和"顶了替身"而看不见（§6.1）；
> 2. **向量写入不幂等**——`upsert_milvus` 调的是 `insert`，而 `task_acks_late`
>    的安全性整个压在幂等上（§0）；
> 3. **APOC 是硬依赖**，此前没写在任何地方（§6.2）。

## 0. 先说那个发现

`plan-task-reliability.md` 里论证 `task_acks_late=True` 安全，依据是：

| 写入 | 方式 | 主键 |
| --- | --- | --- |
| Milvus | `upsert_milvus` | `make_chunk_id()` |
| Neo4j | 全部 `MERGE` | `make_chunk_id()` / `make_entity_id()` |

那份论证是**读代码得出的**，没有跑过。实际跑了一遍（Milvus v2.5.6，同一主键写两次）：

```
insert 两次(同主键) -> 实体总数 2      # 按主键查回 1 条
upsert 两次(同主键) -> 实体总数 1
```

而 `data/milvus/insert.py` 里那个名叫 `upsert_milvus` 的函数，调的是
`milvus_client.insert`：

```python
async def upsert_milvus(user_id: int, chunks_info: list[ChunkInfo]):
    ...
    await asyncio.to_thread(
        milvus_client.insert,          # ← 不是 upsert
        collection_name=MILVUS_COLLECTION,
        data=rows,
    )
```

集合是 `auto_id=False`、`id` 为 VARCHAR 主键（`data/milvus/create.py`），
Milvus 的 `insert` **不做主键去重**，于是重复执行会把同一批向量再存一份。
写入路径上也没有补偿删除——`delete_documents_from_milvus` 只用于删文档。

**为什么一直没被发现**：按主键 `query` 只返回 1 条，看上去正常。只有 `count(*)`
或向量检索才看得出多了一份——而多出来的那份会作为独立命中参与召回。

Neo4j 那一半是对的，也跑了：

```
MERGE 同一 id 两次   -> 节点数 1
MERGE 同一关系两次   -> 关系数 1
```

所以准确的说法是：**图谱侧幂等，向量侧不幂等**。`acks_late` 带来的重复执行，
在向量库里会累积重复。这不是 `acks_late` 引入的 bug（用户手动重跑 embedding
同样会），但 `acks_late` 把它的发生概率显著提高了，而当时的论证说反了。

修法是一个词：`insert` → `upsert`。但**存量数据里可能已经有重复**，要不要清理、
怎么清理（按 `doc_id` 删掉重建，还是留着），是产品决定，不在本文范围。

> 这一条本身就回答了"集成测试值不值得"：它是**在写这份分析的过程中**被发现的，
> 靠的正是"真的连一次依赖"。此前它躲过了代码评审、单元测试和一份专门论证它的文档。

## 1. 现在没有任何集成测试

六个服务的用例全部跑在进程内：worker 侧把外部系统顶成替身（`tests/conftest.py`），
api 侧只验纯函数与 schema 形状。全仓库没有一个测试连过真实依赖
（grep `testcontainers|docker-compose|pytest.mark.integration` 无结果）。

于是有一类假设**只能靠线上发现**：

| 假设 | 现在靠什么保证 | 猜错的后果 |
| --- | --- | --- |
| 重复执行不产生重复数据 | 读代码 | **已证伪**（见上） |
| `schema_guard` 可重复执行 | 开发机手动跑过一次 | 部署时炸在启动路径上，服务起不来 |
| SQL/ORM 语句在真实 PG 上成立 | 无 | 只在命中那条分支时报错 |
| 模型返回结构与解析代码对得上 | 无 | 各家 API 改结构不会通知你 |

其中第二条值得单独说：`schema_guard` 是**启动时**跑的，它挂了整个服务就起不来。
它用 `ADD COLUMN IF NOT EXISTS` 加 advisory lock 来保证可重入，这套写法本身是
对的，但"对的写法"和"跑过"是两回事——本会话早些时候就撞过一次：
`COMMENT ON ... IS :param` 是语法错误，因为 COMMENT ON 是 DDL 不接受绑定参数，
而这个错误正是**真连数据库**才暴露的。

## 2. 代价：比预想便宜

仓库里已经有 `docker-compose-local.yaml`，五个存储都在。实测（本机，热镜像）：

| 组件 | 镜像大小 | 冷启动到就绪 |
| --- | ---: | ---: |
| postgres:15-alpine | 408 MB | **1 s** |
| neo4j（5.26，测量时用） | 988 MB | **4 s** |
| milvus + etcd + minio | 2.64 GB | **4 s** |

启动时间不是问题。CI 上的真实成本是**拉镜像**：Milvus 三件套 2.64 GB。
Postgres + Neo4j 只要 1.4 GB，且 GitHub Actions 的 `services:` 原生支持
Postgres，Neo4j 也能直接跑。

另有一点：**开发机上这些容器本来就在跑**（本次分析时 postgres / neo4j /
milvus-etcd / milvus-minio 都是已启动状态）。也就是说本地跑集成测试的边际成本
接近零，成本几乎全部集中在 CI。

## 3. 但不该照搬整套

把五个容器都拉起来跑一遍完整链路，代价不在时长，在**性质**：

- 当前这套 395 个用例 **1.3 秒**跑完、零外部依赖。集成测试会把它变成分钟级；
- 这类测试天然会抖（容器就绪时机、Milvus 的 flush 可见性、端口冲突）。
  一个动不动就红的 CI，人的反应是重跑而不是查——那时连现在这套也会被连累不信任。

所以关键是**别把两者混在一起**：单元测试保持现状（每个 PR 必跑、秒级、零依赖），
集成测试单开一个 job，允许更慢，且明确只覆盖"必须连真依赖才能验"的那几条。

## 4. 建议：只做「重复执行契约」这一条

范围极窄，只回答一个问题：**同一份写入执行两次，落库结果是否与执行一次相同。**

覆盖三处写入，各一条用例：

1. `upsert_milvus` 写两次 → 实体总数不变（**现在会失败**，修完才通过）；
2. `upsert_chunks_neo4j` / `upsert_entities_neo4j` 写两次 → 节点与关系数不变；
3. `run_schema_guard()` 连跑两次 → 不报错，且第二次不产生任何变更。

只需 **Postgres + Neo4j + Milvus**，不需要 Redis 与 MinIO（不涉及队列和文件）。
判据是数量而不是内容，所以不依赖模型、不依赖网络、也不会因为文案变化而抖。

选它作为起点的理由：

- 它是唯一一个**猜错了会静静把垃圾写进存储**的假设，其余几条至少会报错；
- 它是 `acks_late` 这个已上线改动的直接前提；
- 它把"幂等"从一句注释变成一条会红的断言——而这类假设最容易在重构中被悄悄破坏
  （把 `upsert` 改回 `insert` 不会有任何东西提醒你，这次就是这么发生的）。

## 5. 明确不做

- **端到端跑一份文档**：要模型、要对象存储、要队列，且断言只能是"没报错"，
  抖动大而信息量低。
- **api 的路由集成测试**：TestClient 加真 PG 能做，但它验的是框架接线，
  不是"猜错了会静默出错"的那类。
- **把集成测试挂进现有 checks 工作流**：那会让每个 PR 都等它。应当单开 job，
  按需或定时触发。

## 6. 落地结果：又挖出两个，其中一个是 P0

按上面的范围做完了（`celery-worker/tests_integration/`，12 条用例，全绿，
一轮约 100 秒）。过程中真正的收获不是那 12 条断言，而是**被它们逼出来的两个缺陷**。

### 6.1 celery-worker 根本起不来（P0）

`data/sql/schema_guard.py` 是**镜像文件**（CI 强制 api / worker 逐字节相同），
里面有一行：

```python
from data.sql.base import engine
```

api 侧的 `data/sql/base.py` 有这个同步 `engine`，**worker 侧没有**（只有
`async_engine`）。而 worker 的 `common/celery/app.py` —— 定义 `celery_app`、
每个任务都要导入的那个模块 —— 在顶部导入了 `run_schema_guard`。

结果：**worker 一导入入口模块就 ImportError，整个服务起不来。**

这是 `8af31cd5`（启动自愈那次改动）引入的，两道现有检查都没看见：

- `compileall` 只编译不导入，语法没问题就过；
- 单元测试把 `data.sql.base` 顶成了替身，压根到不了真实那行。

修法是给 worker 补一个同步 `engine`（`NullPool`，只在启动时用一次）。同时加了
`tests_integration/test_entrypoint_imports.py`：不断言任何行为，只把入口模块
**真的 import 一遍**。它不需要任何外部系统，因此不受 `REVORNIX_INTEGRATION`
开关限制，0.5 秒跑完。

> 这条教训比缺陷本身重要：**镜像机制保证"两侧一致"，但一致不等于两侧都能用。**
> 一个文件在 A 侧依赖的东西，B 侧不一定有，而逐字节比对恰恰看不出这种差别。

### 6.2 APOC 是硬依赖

`upsert_entities_neo4j` 用了 `apoc.coll.toSet`，`upsert_relations_neo4j` 用了
`apoc.merge.relationship`，`search.py` 还用了 `apoc.path.subgraphNodes`。
根 compose 里配了 `NEO4J_PLUGINS: '["apoc", "graph-data-science"]'`，所以开发环境
一直是好的——但这件事此前没有写在任何地方，测试夹具漏配就会以 "Unknown function"
的形式失败，而那与要验的东西毫无关系。现在 `tests_integration/docker-compose.yaml`
里配上了，并注明了原因。

### 6.3 抖动是真的，但可控

第一次接进 `check-all.sh` 就红了一条：上一轮"故意改回 `insert`"的负向验证留下了
重复行，而用例隐含假设"开跑时集合是干净的"。改成**前后都清**之后自愈：
先跑一轮制造残留（3 红），紧接着复原再跑，直接 8 全绿。

> 一个看历史脸色的测试比没有更糟：红一次没人查，红三次这套就没人跑了。

### 6.4 实际数字

| 项 | 值 |
| --- | ---: |
| 用例数 | 12 |
| 一轮耗时（本地，容器已起） | ~100 s |
| 五容器冷启动到全部 healthy | 56 s |
| 需要的额外依赖 | 4 个客户端库（见 `requirements-integration.txt`） |

CI 侧放在独立的 `.github/workflows/integration.yml`：**手动触发 + 每日定时**，
不挂 push/PR。入口导入冒烟排在起容器**之前**——它失败时后面几分钟的等待毫无意义，
而它恰恰是最严重的一类问题。

## 7. 顺带修掉的三处版本问题（已完成）

`docker-compose-local.yaml` 里原本 `neo4j:latest`、`minio/minio`（file-backend 那个）
都没锁版本，`redis:8.0-M04-alpine` 还是**里程碑预发布版**。集成测试的价值建立在
环境可复现上，所以先钉死了这三处——否则某天镜像变了、测试红了，而代码一行没改，
几次之后就没人再信它。

钉的时候有个坑值得记：**Neo4j 已改用日历版本号**（本机在跑 `2025.08.0`），
不是 5.x 的延续。想当然地钉成 `neo4j:5.26` 是跨大版本降级，现有数据卷会直接
起不来——所以按实际在跑的版本钉，而不是按印象里的"最新稳定版"。
