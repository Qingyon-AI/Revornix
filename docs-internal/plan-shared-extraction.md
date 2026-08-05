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

不是"合并成一个服务"——**进程和镜像仍然应该分开**，理由是硬的：worker 独有
10 个重依赖（modelscope、huggingface_hub、rapid_table、shapely、pyclipper、ftfy、
omegaconf 等 OCR/ML 栈），api 不该背；worker OOM 也不该拖垮 API。

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
