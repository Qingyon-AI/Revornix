"""阶段的失败语义。

工作流里的步骤分两种，区别不在于代码长什么样，而在于**失败该不该往上传**：

- **核心阶段**（向量化）—— 失败即整份文档处理失败，必须向上传播。
- **可选阶段**（知识图谱、摘要、播客）—— 失败只记在自己那一行任务状态上。它们
  不能拖垮已经完成的核心工作：图谱挂了却把整条链判失败，意味着已经写好的向量
  永远等不到「处理完成」通知。

这个区别此前只体现为「某个 except 块末尾有没有 raise」，散落在几个大函数中间，
既读不出意图，也没法验证。这里把它变成两个有名字的东西。

还有一条更隐蔽的规矩：**记录失败这件事本身失败时，绝不能掩盖原始异常**。原代码
靠嵌套两层 try 实现，但从没有被验证过 —— 而它出错的方式恰恰是最坏的那种：真正的
错误被一个「状态写不进去」的次要错误顶替，排查时看到的是完全错误的线索。

本模块只依赖标准库与项目内的 logger，因此测试不需要 worker 的运行时依赖树。
"""

from __future__ import annotations

from typing import Awaitable, Callable, TypeVar

from common.logger import exception_logger

T = TypeVar("T")

#: 记录失败的回调：拿到原始异常，负责把它写到对应任务行上。
FailureRecorder = Callable[[BaseException], Awaitable[None]]


async def record_failure_safely(
    *,
    record: FailureRecorder,
    error: BaseException,
    what: str,
) -> bool:
    """把失败写到任务状态上；这一步自己失败时只记日志。

    返回是否记录成功 —— 调用方通常不关心，但测试关心。

    **绝不让 record 的异常逃逸**：调用方几乎总是在 except 块里调用它，此处抛出会
    替换掉正在传播的原始异常，把排查引向完全错误的方向。
    """
    try:
        await record(error)
        return True
    except Exception as record_error:
        exception_logger.error(
            f"Failed to update {what} status: {record_error}"
        )
        return False


async def run_optional_stage(
    *,
    run: Callable[[], Awaitable[T]],
    record_failure: FailureRecorder,
    what: str,
) -> tuple[bool, T | None]:
    """跑一个可选阶段。失败只记录，不向上传播。

    返回 ``(是否成功, 返回值)``。失败时返回值为 None。

    这是「尽力而为」的显式写法：这个阶段的产物是加分项，它的失败不该让已经完成的
    核心工作前功尽弃。
    """
    try:
        return True, await run()
    except Exception as error:
        exception_logger.error(f"Optional stage failed: {what}: {error}")
        await record_failure_safely(record=record_failure, error=error, what=what)
        return False, None


async def run_critical_stage(
    *,
    run: Callable[[], Awaitable[T]],
    record_failure: FailureRecorder,
    what: str,
) -> T:
    """跑一个核心阶段。失败时记录状态，然后把**原始异常**原样抛出。

    注意抛出的必须是原始异常而不是包装过的：上层靠它判断重试与否，也靠它的类型
    定位问题。
    """
    try:
        return await run()
    except Exception as error:
        exception_logger.error(f"Critical stage failed: {what}: {error}")
        await record_failure_safely(record=record_failure, error=error, what=what)
        raise
