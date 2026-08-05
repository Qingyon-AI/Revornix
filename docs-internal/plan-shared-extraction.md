# 共享代码提取：测量结果与结论

> 结论先行：**停在当前位置**。`enums` 已经提出去了，剩下的 97 个共享文件不做整体
> 提取，继续由 `scripts/check_mirrored_files.py` 守着。下面是得出这个结论的测量。

## 背景

`api/` 与 `celery-worker/` 有 206 个同路径的 Python 文件，其中 110 个逐字节相同。
`enums`（13 个）已经搬进 `shared/`，做到了零导入改动。问题是：接下来搬什么。

## 零导入改动的两个前提

1. **整个目录都共享** —— 否则同一个顶级包会同时来自 `shared/` 和服务目录，
   Python 只解析得到其中一个。
2. **不依赖服务代码** —— 否则 `shared` 反过来依赖服务，依赖方向就倒了。

## 测量一：按目录筛

| 目录 | 共享 / api 总数 | 结论 |
| --- | --- | --- |
| `base_implement` | 8 / 8 | 满足前提 1，但依赖 common、data、engine、prompts、proxy、schemas |
| `notification` | 31 / 47 | 部分共享 |
| `engine` | 22 / 34 | 部分共享 |
| `common` | 12 / 56 | 部分共享 |
| 其余 8 个 | 均 < 50% | 部分共享 |

**没有第二个目录同时满足两个前提。**

## 测量二：按子包筛

部分共享的目录里，有子包是 100% 共享的：

| 子包 | 文件数 | 依赖 |
| --- | --- | --- |
| `notification/template` | 13 | common、crud、data、protocol、schemas |
| `engine/stt` | 3 | base_implement、common、crud、data、protocol |
| `engine/tag` | 2 | common、crud、data、prompts、proxy、schemas |
| `engine/image_understand` | 2 | base_implement、common |

技术上，把顶级包变成 namespace package（删掉 `__init__.py`）能让 `shared/notification/template`
和 `api/notification/source` 并存。但**四个子包全都依赖服务代码**，前提 2 依然不满足。

## 测量三：依赖闭包 —— 决定性的那个数字

如果不管前提、强行把 97 个共享文件搬进 `shared/`，需要连带搬走它们依赖的一切：

```
共享文件（起点）              97
依赖闭包总计                 174
需要连带拖进来的服务专属文件    77
```

那 77 个的分布：

```
schemas 19 · crud 13 · common 11 · models 9 · config 6
prompts 6 · file 4 · engine 3 · notification 2 · data 2 · protocol 2
```

**为了提取 97 个共享文件，要把 77 个只属于某一侧的文件也搬进共享层。** 其中
`schemas`、`crud`、`models` 是领域核心 —— 把它们塞进 `shared` 等于宣布两个服务
不再有各自的领域边界，那不是提取公共代码，是合并服务。

## 结论

**当前架构下，整体提取共享包的代价高于收益。** 真正要动，得先回答一个更根本的问题：
api 与 celery-worker 是不是应该共享同一套 `schemas`/`crud`/`models`？那是重新划分
服务边界，不是一次重构能解决的。

所以：

- **保持现状**：97 个共享文件由 `check_mirrored_files.py` 守着，只改一侧会红。
- **`enums` 留在 `shared/`**：它是唯一一个两个前提都满足的，价值已经兑现。
- **新增共享代码时**：先看它的依赖。只依赖标准库的，直接放 `shared/`（加进
  `pyproject.toml` 的 `packages`）；依赖服务代码的，放回服务里并登记进镜像清单。

这条结论的有效期取决于依赖形状。如果哪天 `schemas`/`crud` 被拆成"领域无关的基础
部分"和"服务专属部分"，闭包会显著缩小，那时值得重算这三组数字再做决定。

## 重算方法

```bash
# 测量一、二：各目录与子包的共享比例
python scripts/check_mirrored_files.py   # 先确认清单仍然准确

# 测量三：依赖闭包（脚本见本文件的提交记录，或按 ast 遍历重写）
```

---

## 修订（本次集成测试之后）：上面那个结论的前提站不住

原结论是"**为了提取 97 个共享文件，要把 77 个只属于某一侧的文件也搬进共享层**，
其中 schemas 19 · crud 13 · models 9 —— 把领域核心塞进共享层不是提取公共代码，
是合并服务"，据此决定只搬 `enums`。

**那句话里"只属于某一侧"是错的。** 那 77 个文件之所以"专属"，是因为两侧**漂移了**，
不是因为概念上不同。最直接的反证：worker 的 `models/` 缺 access_request、mcp ——
这不是设计，这是漏搬，而且它正是"建表只能由 api 做"的原因。两个服务读写的是
**同一个数据库、同一套表**。这是一个 bounded context，不是两个。

重新量的两个数：

| | 文件数 | 行数 |
| --- | ---: | ---: |
| api 真正独有（`router/` + `mcp_router/`） | 49 | 22,639 |
| worker 真正独有（`workflow/`） | 21 | 7,484 |
| **两侧同路径** | **194** | — |

同路径那 194 个的分布：engine 34 · notification 33 · common 27 · data 19 ·
prompts 12 · models 11 · crud 11 · config 11 · schemas 10 · base_implement 8 ·
protocol 7 · proxy 5。**没有一层是某个服务专有的领域。**

所以准确的说法是：真正不同的只有 70 个文件，其余全是同一套东西存了两份。
当前的形态不是"两个服务"，是**一份代码部署两次、各带一个入口**。

### 成本那一侧也变了

原分析把镜像守卫的代价估成"CI 多跑一个检查"。集成测试推翻了这个估计：
`schema_guard.py` 逐字节相同地存在于两侧，但它 `from data.sql.base import engine`，
而 worker 侧根本没有这个符号 —— **worker 一导入入口模块就 ImportError，服务起不来**
（详见 `plan-integration-tests.md` §6.1）。

> **镜像守卫能保证"两侧一致"，但保证不了"两侧都能用"。** 逐字节比对看不见
> "这个文件依赖的东西那边没有"。这类缺陷的代价是服务起不来，不是代码不整洁。

### 那该做什么

不是"合并成一个服务"——**进程和镜像仍然应该分开**。但要先纠正上一段里我写错的
一个理由。

我原本写的是"worker 独有 10 个重依赖（OCR/ML 栈），api 不该背"。**这句话是错的**：

| | 依赖数 | 独有 |
| --- | ---: | --- |
| api | 55 | apscheduler, fastapi, google-auth, markdown, webauthn, otel-fastapi |
| celery-worker | 59 | ftfy, huggingface_hub, modelscope, omegaconf, pyclipper, python-jose, rapid_table, shapely, tenacity, otel-celery |
| **两侧共有** | **49** | 其中包括 `torch` 和 `sentence_transformers` |

**最重的那个 `torch` 两侧都有**，api 独有的六个全是轻量库。所以"依赖重量"根本
不是分开部署的理由——两个镜像本来就一样大。

（这是本轮第二次我基于不完整的阅读下了架构判断。第一次是 Milvus 的"upsert"，
靠跑一遍才发现是 insert；这次是 requirements，靠比对两个文件才发现 torch 在两边。
**两次都是"看了个名字就当成事实"。**）

分开部署的真实理由只剩两条，但都成立：**爆炸半径**（worker OOM 或被 kill 不该
带走 API）和**伸缩轴**（worker 随文档量伸缩，api 随请求量伸缩）。这两条与依赖
无关，也不会因为源码合并而改变。

顺带一个值得单独看的问题：**api 为什么需要 torch？** 如果只是查询时做 embedding，
那它可能可以换成调用 worker 或外部服务，从而把 api 镜像显著瘦下来。这不在本文
范围，但值得记一笔。

该做的是让**源码**停止复制：

```
shared/     models, crud, enums, config, common, notification, engine, proxy, protocol
api/        router/, mcp_router/  + 自己的 requirements
celery-worker/  workflow/          + 自己的 requirements（含 ML 栈）
```

部署形态一点不变，两个镜像各装各的依赖。变的是那 194 个文件只存一份。

### 但这次仍然不动手

理由不是"不值得"，而是**顺序**：这是一次大范围搬迁，而目前 `crud/` 210 个函数
刚有 10 个被真正跑过，`router/` 22,639 行一行没测。在这个覆盖率下做大搬迁，
出了问题只能靠线上发现 —— 那正是这一整轮工作要摆脱的处境。

合理的顺序是：先把 crud 与 api 路由的集成覆盖做起来，再动结构。
**先有网，再拆房子。**

---

## 合并的真实工作量：72 个函数

上面说"该做的是让源码停止复制"，但没说那要花多少力气。量了一遍，答案比想象的
具体，也比想象的小。

### 逐层收窄

| 口径 | 数量 |
| --- | ---: |
| 两侧同路径的 `.py` 文件 | 194 |
| 其中逐字节相同 | 97 |
| worker 顶层函数中 api 也有同名的 | 452 |
| ├─ 实现逐字符相同 | **354（78%）** |
| ├─ 仅排版/尾逗号不同（AST 相同） | 26 |
| └─ **AST 也不同 = 真语义分歧** | **72** |
| 仅 worker 有的函数 | 65 |

**所以合并不是"调和两套冲突的实现"，是求并集。** worker 的 crud 基本是 api 的
子集（`crud/document.py`：worker 22 个函数、api 157 个），而 `data/common.py`
反过来 worker 更多（29 vs 16，分块与流式读在 worker 侧）。各自长出了自己需要的
那部分，没长出对方的。

真正要逐个决定的只有那 72 个。分布：

```
common/dependencies.py 10 · crud/engine.py 10 · crud/notification.py 10
data/milvus/search.py 6 · crud/file_system.py 4 · common/logger.py 3
crud/section.py 3 · data/neo4j/search.py 3 · ...（清单可由本文末的脚本重算）
```

### 三次测量，两次修正

这个数字是第三版才可信的，过程值得记：

1. 第一版用正则切函数体，得出"100 个冲突"。抽查发现有的函数**真实差异 0 行** ——
   切片错位造成的假阳性。
2. 第二版改用 `ast.get_source_segment`，得 98 个。抽查发现其中不少只差**尾逗号**。
3. 第三版比 `ast.dump`（结构相同即语义相同），26 个降为排版差异，剩 **72 个**真分歧。

> 差点把"100"直接写进决策文档。**一个没被抽查过的测量，和一个猜测的区别没有
> 想象中大** —— 这一轮里同样的错犯过三次：Milvus 的 "upsert"（名字不是实现）、
> requirements 的重依赖（torch 其实两侧都有）、以及这里。

### 网要覆盖的正是这 72 个

合并时每个都要选一个版本留下，而"选错"的表现是行为悄悄变了 —— 那 354 个逐字符
相同的搬过去不会有任何风险，65 个仅 worker 有的也只是移动位置。

所以下一步是明确的：**给这 72 个函数做集成覆盖**，而不是给 210 个 crud 函数
做覆盖。范围从"整层"收窄到"这一批"，工作量差一个数量级。

已经先把最便宜的一道网架好了：`scripts/check_imports.py` 静态核对
`from X import Y` 里的 Y 是否真的存在（1,927 个名字，0.7 秒，零依赖）。它守的
正是搬迁最容易出的那类错 —— 也正是让 worker 起不来的那个缺陷的形态。

---

## 把 72 个逐个看了一遍

分类之后再逐个读，结论是**合并比数字看起来容易，但有两处必须先决定**。

### 分类

| 类别 | 数量 | 合并风险 |
| --- | ---: | --- |
| 仅写法不同（调用集合、常量、控制流全同） | 36 | 无 —— 取任一版本 |
| 仅常量/参数不同 | 12 | 低 |
| 控制流不同 | 0 | — |
| **调用集合不同** | **24** | 要逐个决定 |

那 24 个不是 24 个独立决定，成组之后只有 5 类：

1. **一次没做完的日志 API 迁移**（7 处）—— worker 用 `log_event(logger, ...)`，
   api 还在用 `logger.info(format_log_message(...))`。一次性改完即可。
2. **超时策略**（4 处，全在 `common/dependencies.py`）—— worker 显式 10s/connect 5s，
   api 用 httpx 默认 5s。**api 并非没有超时，反而更严**；worker 放宽是合理的
   （后台任务能等，请求不能）。保留差异，但要写下来。
3. **预加载策略**（4 处）—— api 用 `selectinload`/`joinedload` 带出关联对象
   （要序列化给前端），worker 不需要。合并后应当由调用方选择，而不是两份实现。
4. **`crud/engine.py` 的查询形状**（6 处）—— `in_` / `join` 用法不同，需要单独比对。
5. **两个真正的语义分歧** —— 见下。

### 分歧一：同一个守卫，抛的异常类型不同

```python
# api/common/document_guard.py
raise ValueError("Document not found")

# celery-worker/common/document_guard.py
raise DocumentDeletedError("Document is deleted")   # 这个类只在 worker 侧存在
```

worker 的 `document_process_status_workflow.py` 正是靠 `except DocumentDeletedError`
来"文档已删就安静返回"。**合并时取任一版本都会坏掉一边**：取 api 的，worker 那个
except 永远不触发（甚至 NameError）；取 worker 的，api 侧 catch `ValueError` 的
调用方失效。

这是那 72 个里唯一一个"必须先改调用方、再合并"的。

### 分歧二：令牌吊销机制只建了一半

api 的 `create_token` 签发的载荷带 `type` 和 `auth_epoch`；**worker 的只签 `sub`**。
而 worker 会在工作流里签发这种令牌去调 API（`document_chunk_process_workflow.py:777`、
`document_graph_task_workflow.py:105`）。

api 侧的校验是：

```python
token_auth_epoch = payload.get("auth_epoch")
if token_auth_epoch is None:
    token_auth_epoch = 0          # 缺失 → 当作 0
if token_auth_epoch != user.auth_epoch:
    raise HTTPException(401, "Authentication session is stale")
```

用户的 `auth_epoch` 默认 0，**每次会话失效应当 +1**。所以：

- **今天不出问题**：`bump_user_auth_epoch_async` 在整个仓库里**一个调用点都没有**，
  所有人的 epoch 恒为 0，worker 令牌（缺失 → 当作 0）正好匹配。
- **也不是安全绕过**：缺失被当作 0，而不是"跳过校验"。
- **但这是个雷**：一旦有人接上"改密码/强制登出使旧令牌失效"（那个函数存在就是
  为了这个），该用户的 epoch 变成 ≥1，而 worker 签的令牌永远是 0 —— 于是
  **文档处理对且仅对这些用户 401 失败**。症状会极难定位：只有登出过的人处理失败。

这一条与合并无关，是独立的缺陷，已单独记录。它也正好说明分叉的代价：
api 长出了 `auth_epoch`，worker 的那份 `create_token` 没跟上，而**两侧字节不同，
镜像检查不管，静态导入检查也不管** —— 只有把两个实现并排读才看得见。

### 结论：顺序可以调整

原计划是"先给 72 个做集成覆盖，再合并"。逐个看完之后，更合理的顺序是：

1. 先修**分歧一**（统一异常类型，改调用方）——它是唯一的硬阻塞；
2. 一次性做完**日志 API 迁移**（7 处），把无谓差异消掉；
3. 预加载与 `crud/engine.py` 查询形状（10 处）需要集成覆盖，因为这两类
   "取错版本"的表现是查询结果变了而不报错 —— 这才是网真正要罩住的地方；
4. 其余 48 个（36 写法 + 12 常量）直接合并，不需要额外测试。

**要写测试的从 72 收窄到 10。**

---

## 逐条定性：72 → 4

把 72 个按"合并时该怎么办"分类，答案比预期干净得多：

| 处置 | 数量 | 依据 |
| --- | ---: | --- |
| ① 纯写法不同，取任一 | 37 | 调用集合、常量、控制流三者全同 |
| ② 仅常量不同，取任一 | 12 | 调用集合与控制流相同 |
| ③ 日志迁移，统一到 `log_event` | 8 | api 还在 `logger.info(format_log_message(...))` |
| ④ 超时策略，有意保留 | 1 | worker 放宽到 10s，请求侧用 httpx 默认 5s |
| ⑤ **worker 侧死代码，取 api** | 8 | worker 那份从未被调用（如整个 `crud/engine.py` 的白名单过滤） |
| ⑥ 预加载，取 api（超集安全） | 2 | api 多 `selectinload`；多加载只是多花一点，少加载会 `MissingGreenlet` |
| **⑦ 需人工决定** | **4** | 见下 |

**要写的集成测试是 0 个。** 上一节估的"10 个"仍然高了：那 6 个 `crud/engine.py`
分歧里，worker 的版本缺了 `SUPPORTED_ENGINE_PROVIDED_UUIDS` 白名单过滤 —— 看着
像 bug，实则那 6 个函数在 worker 侧**一个调用点都没有**，是复制过来就没用过的
陈旧副本。取 api 的版本即可，没有行为可测。

剩下 4 个：

1. `common/jwt_utils.py::create_token` —— 令牌吊销那条，已单独归档，与合并无关；
2. `crud/notification.py::get_notification_target_by_id_async` —— 预加载写法不同，
   但走的是 helper，要看一眼；
3. `data/common.py::resolve_entities_with_semantic_dedupe`
4. `data/common.py::stream_chunk_document` —— 这两个是 worker 长出来的那部分
   （worker 142 行 / api 72 行，分块与流式读在 worker 侧），取 worker 的。

### 第四次测量出错

这张表的第一版把 6 个 `crud/engine.py` 函数判成"需人工决定"，因为死代码检查说
它们**有**调用点。实际那些"调用点"是 `__pycache__` 里的 `.pyc` —— 交互式 shell
里的 ugrep 默认跳过二进制文件，而脚本里调的 BSD grep 会报 `Binary file matches`。
加上 `-I --exclude-dir=__pycache__` 之后，8 个函数从"需决定"变成"死代码"。

> 这一轮同一个毛病犯了四次：Milvus 的 `upsert`（名字不是实现）、requirements 的
> 重依赖（torch 两侧都有）、正则切函数体（假阳性）、以及这次的 grep 二进制匹配。
> **共同点不是粗心，是"拿工具的输出当事实，而没有先确认那个工具在做什么"。**
> 四次里有三次是抽查发现的，一次是数字对不上发现的 —— 抽查的性价比高得不成比例。

---

## 真正的障碍不是重复，是依赖环

前面一直在算"两份拷贝差多少"，但那个问题的答案（72 → 4）反而说明合并不难。
真正卡住提取的是另一件事，量了依赖图才看见。

### 层依赖：只有三个叶子

按**模块级** import 统计 14 个层之间的依赖（函数内的延迟 import 不算，那不构成
加载期依赖）：

| 层 | 依赖的其他层 |
| --- | --- |
| `schemas` / `protocol` / `config` | **（无）★ 叶子** |
| `models` | data |
| `crud` | common |
| `prompts` | data, schemas |
| `common` | config, data, prompts, protocol, proxy |
| `data` | common, config, engine, prompts, protocol, proxy, schemas, workflow |
| `proxy` / `engine` / `notification` / `base_implement` / `file` | 各依赖 6–8 层 |

后面这批构成一个**强连通分量**：

```
{base_implement, common, data, engine, file, notification, prompts, proxy, workflow}  —— 9 层
```

**环里的层谁都不能单独抽出。** 这解释了为什么 `base_implement` 虽然两侧逐字节
一致（8 个文件、100%），却搬不动 —— 它 import 了 common、crud、data、engine、
prompts、proxy、schemas，几乎所有层。

一致率高低根本不是排序依据，**依赖方向才是**。

### workflow 在环里，这是个信号

最不该出现在环里的是 `workflow` —— 那是 worker 的入口层，只该被别人依赖，
不该反过来。查下去，把它拖进环的只有两条边，而且是同一个东西：

```
notification/dispatch.py:9  from workflow.timing import set_stage_metrics, timed_stage
data/common.py:29           from workflow.timing import set_stage_metrics
```

`workflow/timing.py` 里只有 OTel span 与结构化日志，**与"工作流"毫无关系** ——
它放错了地方。移到 `common/timing.py`（它本身只依赖标准库、OTel 和
`common.logger`，不产生新环），两条边一起消失：

| | 移动前 | 移动后 |
| --- | --- | --- |
| 强连通分量 | 9 层 | **8 层** |
| workflow 被反向依赖 | 是 | **否** |

api 侧不受影响：它没有 `workflow/` 目录，也不用 timing。

### 接下来该怎么走

顺序由依赖决定，不由重复程度决定：

1. **先搬三个叶子**：`config`(11)、`schemas`(10)、`protocol`(7)。零一方依赖，
   搬进 shared 不会拖进任何东西。其中 `config` 有 7 个文件只差排版，
   归一即可；`schemas` 两侧 AST 全不同（api 是 HTTP 契约的超集），取 api 的。
2. **再解环**。剩下 8 层的环要一条边一条边地拆，办法与 timing 这次相同：
   找出"放错层"的文件并移到它真正属于的地方。`common ⇄ data` 是下一个目标
   （两个方向都有模块级 import）。
3. **环解开之后**，剩下的层按拓扑序搬，每层一个提交。

在环解开之前，硬搬任何一个环内的层都会把整个环一起拖进 shared —— 那不是提取
共享代码，那是把两个服务合成一个。**这正是最初那份分析的直觉是对的地方，
虽然它给的理由（"77 个服务专属文件"）是错的。**
