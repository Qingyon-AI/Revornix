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
