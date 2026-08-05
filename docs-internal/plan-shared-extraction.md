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
