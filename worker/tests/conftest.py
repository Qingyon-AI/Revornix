"""把外部系统顶掉，好让节点体本身能被导入和调用。

节点体测不了，一直不是因为逻辑复杂，而是因为**导入不进来**：一个节点文件顶上就
要 `import crud`、`from data.milvus.insert import ...`、`from engine.embedding.factory
import ...`，装齐这些等于把 torch、pymilvus、neo4j 驱动、langgraph 全拖进每个 PR。

于是这里只做一件事：在测试进程里把**外部系统的边界**换成空壳，其余一律用真的。
换句话说，被顶掉的是「跨进程调用谁」，被保留的是「本进程里算什么」—— 后者正是
要测的东西。

哪些该顶掉，标准是明确的：
- 真正的外部系统（数据库、Milvus、Neo4j、模型服务）；
- 只在建图时用到、与节点体逻辑无关的重依赖（langgraph）。

哪些**不该**顶掉：`common.embedding_utils`、`common.task_detail`、`common.timing`
这些是本进程的纯逻辑，顶掉它们等于把要测的东西测没了。OTel 是真装的（见
requirements-dev.txt），理由同上：伪造一整套 span 语义比装一个 1 MB 的包更容易出错。

注意这些替身是**进程级**的：任何测试再 import crud 拿到的都是空壳。目前没有测试
需要真的 crud；将来若有，得给它单开一个进程，而不是在这里放行。
"""

from __future__ import annotations

import base64
import importlib.abc
import importlib.util
import os
import sys
import types
from pathlib import Path

# 几个模块在**导入期**就校验密钥（common/jwt_utils.py、common/dependencies.py），
# 缺失时直接抛错 —— 于是任何 import 链碰到它们的测试模块在收集阶段就挂了。
# 这与 api/tests/conftest.py 是同一堵墙、同一个解法：收集前塞入确定性的假值。
# setdefault 而非直接赋值：显式导出了环境变量的人说了算。（.env 不会被读到 ——
# dotenv 在下面被顶成了空实现，见那里的理由。）
os.environ.setdefault("OAUTH_SECRET_KEY", "revornix-test-oauth-secret")
os.environ.setdefault("LANGFUSE_PUBLIC_KEY", "revornix-test-langfuse-public")
os.environ.setdefault("LANGFUSE_SECRET_KEY", "revornix-test-langfuse-secret")

# AES-GCM 要 16/24/32 字节、按 base64 解。固定值而非随机 —— 测试不需要随机性，
# 随机只会让失败难以复现。
_FAKE_KEY = base64.b64encode(b"revornix-test-key-32-bytes-long!").decode("ascii")
for _name in (
    "APIKEY_ENCRYPT_KEY",
    "ENGINE_CONFIG_ENCRYPT_KEY",
    "FILE_SYSTEM_CONFIG_ENCRYPT_KEY",
    "NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY",
    "NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY",
):
    os.environ.setdefault(_name, _FAKE_KEY)

# 让 `import enums` 在没跑过 `pip install -e ../app` 的环境里也能工作。
# CI 装了 app 包，本地不一定；缺它时的报错是「模块找不到」，与用例要验的东西无关。
_APP_DIR = Path(__file__).resolve().parents[2] / "app"
if _APP_DIR.is_dir() and str(_APP_DIR) not in sys.path:
    sys.path.insert(0, str(_APP_DIR))


def _install(name: str, **attrs: object) -> types.ModuleType:
    """登记一个空壳模块。已经装了真包时不覆盖 —— 真的永远优先。"""
    if name in sys.modules:
        return sys.modules[name]
    module = types.ModuleType(name)
    module.__path__ = []  # 声明成包，好让子模块也能挂上去
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module
    return module


def _unavailable(what: str):
    """默认实现：被调用就报错。

    替身的默认行为必须是**响亮地失败**而不是安静地返回 None —— 否则一个本该被
    测试注入的调用漏注了，用例会照常通过，而它其实什么都没验证。
    """

    def _boom(*args: object, **kwargs: object):
        raise AssertionError(
            f"测试用到了未注入的外部依赖：{what}。请在用例里显式提供替身。"
        )

    return _boom


class _LenientLoader(importlib.abc.Loader):
    """凭空造一个模块，任何属性都返回占位符。"""

    def create_module(self, spec):
        module = types.ModuleType(spec.name)
        module.__path__ = []
        module.__getattr__ = lambda attr: _Placeholder  # PEP 562
        return module

    def exec_module(self, module):
        return None


class _LenientFinder(importlib.abc.MetaPathFinder):
    """让宽松替身的**子模块**也能 import。

    `from sqlalchemy.orm import Mapped` 走的是导入机器而不是属性查找，PEP 562 的
    `__getattr__` 够不着 —— 得在这一层接住。只对显式登记的顶级包生效，别的一律
    交还给正常的查找链。
    """

    prefixes: set[str] = set()

    def find_spec(self, fullname, path=None, target=None):
        if fullname.split(".")[0] not in self.prefixes:
            return None
        return importlib.util.spec_from_loader(fullname, _LenientLoader())


sys.meta_path.append(_LenientFinder())


def _install_lenient(name: str) -> types.ModuleType:
    """宽松替身：任何属性、任何子模块都自动给一个占位符。

    只用于**纯粹被 import 链带到**的第三方库（httpx、sqlalchemy）。它们既不是被测
    对象，也不是要注入的边界 —— 节点体一个都不直接调用，只是模型定义和内部 HTTP
    客户端恰好在同一条 import 链上。

    这里刻意与上面的 `_install` 相反：那边逐个列符号，漏了就报错；这边来者不拒。
    差别在于代价 —— 给 sqlalchemy 手工维护一份符号清单，等于每加一个字段类型就要
    改一次测试脚手架，而那份清单守不住任何东西。宽松只在「这个库压根不参与断言」
    时才成立，所以名单必须短，且每个都要说得出理由。
    """
    _LenientFinder.prefixes.add(name)
    if name in sys.modules:
        return sys.modules[name]
    return importlib.import_module(name)


class _AnyMeta(type):
    def __getattr__(cls, name):
        return _Placeholder

    def __getitem__(cls, item):
        return cls


class _Placeholder(metaclass=_AnyMeta):
    """给那些只在类型标注里出现、或只被 import 链带到的名字用。

    要能扛住这些用法，因为它们都发生在 **import 期**、绕不过去：
    `list[ChunkInfo]`（模块没开 PEP 563，标注在 def 时就求值）、
    `Mapped[str]`、`mapped_column(...)`、`String(1000)`、`class Foo(Base)`。

    用例自己造替身对象，不需要真的类。
    """

    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    def __getattr__(self, name: str):
        return _Placeholder

    def __call__(self, *args: object, **kwargs: object):
        return self

    def __getitem__(self, item: object):
        return self

    def __mro_entries__(self, bases: tuple):
        # 让替身**实例**也能当基类用：`Base = declarative_base()` 返回的是实例，
        # 而 `class Document(Base)` 要求它能参与 MRO 计算。没有这个方法时报的是
        # `TypeError: __mro_entries__ must return a tuple`，与真正的问题毫无关系。
        return (object,)


# --- 只在建图/观测链路上用到的重依赖：节点体测试直接调函数，用不到它们 ---
_install("langgraph")
_install("langgraph.graph", StateGraph=object, END="__end__")
_install("langfuse", propagate_attributes=lambda *a, **k: None)
_install("langfuse.openai", AsyncOpenAI=object)
# python-jose：common.dependencies 用它签内部调用的 token。这批用例不验签名。
_install("jose", jwt=_Placeholder)
# 顶掉 dotenv 是有意的，不只是为了省一个依赖：真的 `load_dotenv()` 会把开发机的
# .env 读进来，于是同一批用例在本地和 CI 上跑的是不同的配置。空实现让配置只可能
# 来自下面那几行显式赋值。
_install("dotenv", load_dotenv=lambda *a, **k: False, find_dotenv=lambda *a, **k: "")
# 下面三个用宽松替身（理由见 _install_lenient）：
#   jwt(PyJWT)、httpx —— 内部调用的客户端；sqlalchemy —— 只出现在模型定义里。
_install_lenient("jwt")
_install_lenient("httpx")
_install_lenient("sqlalchemy")
# 合并 app/ 之后，common/ 里多了 api 侧带来的 redis 客户端；Redis 是外部系统。
_install_lenient("redis")


# --- 真正的外部系统 ---
_install("crud")


class _DocumentDeletedError(Exception):
    """真实实现里是个普通异常类。用例要能 raise/except 它，所以不能是占位符。"""


_install(
    "common.document_guard",
    ensure_document_active=_unavailable("ensure_document_active"),
    DocumentDeletedError=_DocumentDeletedError,
)

_install("data")
_install(
    "data.common",
    stream_chunk_document=_unavailable("stream_chunk_document"),
    build_sampled_chunk_indexes=_unavailable("build_sampled_chunk_indexes"),
    ensure_document_chunk_snapshot=_unavailable("ensure_document_chunk_snapshot"),
    get_document_markdown_length=_unavailable("get_document_markdown_length"),
    get_extract_llm_client=_unavailable("get_extract_llm_client"),
    close_extract_llm_client=_unavailable("close_extract_llm_client"),
    extract_entities_relations=_unavailable("extract_entities_relations"),
    resolve_entities_with_semantic_dedupe=_unavailable("resolve_entities_with_semantic_dedupe"),
)
_install("custom_types")
_install(
    "custom_types.all",
    ChunkInfo=_Placeholder,
    DocumentInfo=_Placeholder,
    EntityInfo=_Placeholder,
    RelationInfo=_Placeholder,
)
_install("data.milvus")
_install("data.milvus.insert", upsert_milvus=_unavailable("upsert_milvus"))
_install("data.neo4j")
_install(
    "data.neo4j.insert",
    annotate_node_degrees=_unavailable("annotate_node_degrees"),
    create_communities_from_chunks=_unavailable("create_communities_from_chunks"),
    create_community_nodes_and_relationships_with_size=_unavailable("create_community_nodes"),
    upsert_chunk_entity_relations=_unavailable("upsert_chunk_entity_relations"),
    upsert_chunks_neo4j=_unavailable("upsert_chunks_neo4j"),
    upsert_doc_chunk_relations=_unavailable("upsert_doc_chunk_relations"),
    upsert_doc_neo4j=_unavailable("upsert_doc_neo4j"),
    upsert_entities_neo4j=_unavailable("upsert_entities_neo4j"),
    upsert_relations_neo4j=_unavailable("upsert_relations_neo4j"),
)
_install("data.neo4j.search", get_entities_by_text_and_type=_unavailable("get_entities_by_text_and_type"))
_install("data.neo4j.base", async_neo4j_driver=_unavailable("async_neo4j_driver"))
_install("data.sql")
_install("data.sql.base", Base=_Placeholder, async_session_context=_unavailable("async_session_context"))

_install("engine")
_install("engine.embedding")
_install("engine.embedding.factory", get_embedding_engine=_unavailable("get_embedding_engine"))

# 模型服务的代理。真实实现要连数据库取用户模型配置。
_install("proxy")
_install("proxy.ai_model_proxy", AIModelProxy=_Placeholder)
_install("proxy.file_system_proxy", FileSystemProxy=_Placeholder)
_install("proxy.engine_proxy", EngineProxy=_Placeholder)

# 打标引擎：真实实现要调模型。
_install("engine.tag")
_install("engine.tag.llm_document", LLMDocumentTagEngine=_Placeholder)

# common.ai 是模型调用的入口（抽取、摘要、归并），属于外部边界。
_install(
    "common.ai",
    SummaryResultWithTitleAndDescription=_Placeholder,
    reducer_summary=_unavailable("reducer_summary"),
    summary_content=_unavailable("summary_content"),
    make_section_markdown=_unavailable("make_section_markdown"),
    build_structured_output_language_instruction=_unavailable("build_structured_output_language_instruction"),
    _get_user_ai_interaction_language=_unavailable("_get_user_ai_interaction_language"),
)
