# revornix-shared

`api/` 与 `celery-worker/` 共用的代码。两个服务各自 `pip install -e ../shared`
之后，这里的包以**顶级包**的形式出现在 `sys.path` 上。

## 为什么是顶级包

这批代码此前在两个服务下各存一份，只靠约定保持同步。提取时把 `enums` 直接暴露成
顶级包，是为了让既有的 `from enums.document import DocumentProcessStatus` 一行都不
用改 —— 148 个引用点零改动，一次结构调整的风险因此落在"能不能装上"这一件事上，
而不是散在几百处 import 里。

## 加入新的共享包

1. 把目录移到这里；
2. 在 `pyproject.toml` 的 `packages` 里加上它；
3. 从两个服务下删掉原来那份；
4. 如果它此前在 `scripts/mirrored-files.txt` 里，一并删掉那些条目 —— 已经是同一份
   代码，就不需要再校验两份是否一致了。
