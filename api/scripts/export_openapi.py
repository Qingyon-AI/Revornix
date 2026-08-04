"""把 FastAPI 的 OpenAPI 契约导出成仓库里的一个文件。

**为什么 spec 要入库。** 前端的 `web/src/generated/` 是 openapi-generator 的产物，
它的输入以前只存在于「某台跑得起 api 的机器」上，于是重新生成这一步既没有脚本、也
没有任何东西会因为漏做而失败 —— 生成物就这么静静漂了两个月。把 spec 落到文件里，
前端生成不再依赖跑起来的服务，接口变更也会直接出现在 diff 里，review 时看得见。

用法::

    python -m scripts.export_openapi            # 写入 api/openapi.json
    python -m scripts.export_openapi --check    # 只校验，不落盘（CI 用）

``--check`` 在文件与当前代码不一致时以非零码退出，用来抓「改了 router 但忘了导出
spec」。

**不要给这里加 sort_keys。** 确定性已经由 Python 的字典保序 + FastAPI 自身的确定性
输出保证了（脚本里有幂等校验）；而排序会打乱字段的自然顺序 —— 那个顺序来自 pydantic
模型的定义顺序，既让 spec 的 diff 更好读，也决定了生成出来的 TypeScript 里字段的排列。
排一次序，前端生成物就会产生几百个纯属噪音的差异。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# 允许 `python -m scripts.export_openapi` 和直接执行两种方式
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

OUTPUT = Path(__file__).resolve().parent.parent / "openapi.json"


def build_spec() -> str:
    # 延迟导入：main 会拉起整个应用的导入链，不该只因为 --help 就付这个代价。
    from main import app

    spec = app.openapi()
    return json.dumps(spec, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="只比对不写入；文件过期时以退出码 1 结束",
    )
    args = parser.parse_args()

    spec = build_spec()

    if args.check:
        if not OUTPUT.exists():
            print(f"{OUTPUT.name} 不存在，请运行 python -m scripts.export_openapi", file=sys.stderr)
            return 1
        if OUTPUT.read_text(encoding="utf-8") != spec:
            print(
                f"{OUTPUT.name} 与当前代码不一致。\n"
                f"请运行 python -m scripts.export_openapi 并提交结果，\n"
                f"接口有变动时还要跟着重新生成前端类型（web: pnpm generate:api）。",
                file=sys.stderr,
            )
            return 1
        print(f"{OUTPUT.name} 是最新的")
        return 0

    OUTPUT.write_text(spec, encoding="utf-8")
    print(f"已写入 {OUTPUT}（{len(spec.encode('utf-8')) / 1024:.0f} KB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
