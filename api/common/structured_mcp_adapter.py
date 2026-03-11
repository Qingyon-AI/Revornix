from __future__ import annotations

import json
import re
from typing import Any, NoReturn

from jsonschema_pydantic import jsonschema_to_pydantic
from langchain_core.tools import BaseTool
from mcp.types import CallToolResult, Prompt, ReadResourceRequestParams, Resource
from mcp.types import Tool as MCPTool
from mcp_use.agents.adapters.langchain_adapter import LangChainAdapter
from mcp_use.client.connectors.base import BaseConnector
from mcp_use.errors.error_formatting import format_error
from mcp_use.logging import logger
from pydantic import BaseModel, Field, create_model


def _to_json_safe(value: Any) -> Any:
    """Convert arbitrary MCP payload fragments into JSON-safe Python values."""
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, bytes):
        return f"[bytes:{len(value)}]"
    if isinstance(value, list | tuple):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _to_json_safe(item) for key, item in value.items()}

    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        try:
            return _to_json_safe(model_dump())
        except Exception:
            return str(value)

    dict_value = getattr(value, "__dict__", None)
    if isinstance(dict_value, dict):
        return {str(key): _to_json_safe(item) for key, item in dict_value.items() if not key.startswith("_")}

    return str(value)


def _normalize_content_block(content: Any) -> dict[str, Any]:
    """Normalize one MCP content block into a stable artifact shape."""
    block_type = getattr(content, "type", None)
    text = getattr(content, "text", None)
    mime_type = getattr(content, "mimeType", None)
    annotations = getattr(content, "annotations", None)
    meta = getattr(content, "meta", None)

    if isinstance(text, str):
        return {
            "type": block_type or "text",
            "text": text,
            "mime_type": mime_type,
            "annotations": _to_json_safe(annotations),
            "meta": _to_json_safe(meta),
        }

    resource = getattr(content, "resource", None)
    if resource is not None:
        return {
            "type": block_type or "resource",
            "resource": _to_json_safe(resource),
            "annotations": _to_json_safe(annotations),
            "meta": _to_json_safe(meta),
        }

    data = getattr(content, "data", None)
    if data is not None:
        return {
            "type": block_type or "binary",
            "mime_type": mime_type,
            "data": _to_json_safe(data),
            "annotations": _to_json_safe(annotations),
            "meta": _to_json_safe(meta),
        }

    normalized = _to_json_safe(content)
    if isinstance(normalized, dict):
        return normalized
    return {
        "type": block_type or "unknown",
        "text": str(normalized),
        "annotations": _to_json_safe(annotations),
        "meta": _to_json_safe(meta),
    }


def _build_tool_result_artifact(tool_name: str, tool_result: CallToolResult) -> dict[str, Any]:
    """Build the structured tool artifact that flows to downstream SSE consumers."""
    content_blocks = getattr(tool_result, "content", None) or []
    if not isinstance(content_blocks, list):
        content_blocks = [content_blocks]

    return {
        "kind": "mcp_tool_result",
        "tool": tool_name,
        "is_error": bool(getattr(tool_result, "isError", False)),
        "content_blocks": [_normalize_content_block(block) for block in content_blocks],
    }


def _build_tool_result_text(tool_name: str, artifact: dict[str, Any]) -> str:
    """Render a compact text view of the structured artifact for the LLM."""
    fragments: list[str] = []

    for block in artifact.get("content_blocks", []):
        if not isinstance(block, dict):
            continue

        text = block.get("text")
        if isinstance(text, str) and text.strip():
            fragments.append(text.strip())
            continue

        resource = block.get("resource")
        if isinstance(resource, dict):
            resource_uri = resource.get("uri")
            if isinstance(resource_uri, str) and resource_uri.strip():
                fragments.append(f"[resource: {resource_uri}]")
                continue

        mime_type = block.get("mime_type")
        if isinstance(mime_type, str) and mime_type.strip():
            fragments.append(f"[{block.get('type', 'content')}: {mime_type}]")

    text_output = "\n\n".join(fragment for fragment in fragments if fragment)
    if text_output:
        if artifact.get("is_error"):
            return f"Error: {text_output}"
        return text_output

    fallback = json.dumps(artifact.get("content_blocks", []), ensure_ascii=False)
    if artifact.get("is_error"):
        return f"Error: {tool_name} returned no readable content. Raw blocks: {fallback}"
    return fallback


def _build_error_artifact(tool_name: str, error_text: str) -> dict[str, Any]:
    """Wrap adapter-level tool failures in the same artifact structure as normal outputs."""
    return {
        "kind": "mcp_tool_result",
        "tool": tool_name,
        "is_error": True,
        "content_blocks": [
            {
                "type": "error",
                "text": error_text,
            }
        ],
    }


class StructuredLangChainAdapter(LangChainAdapter):
    """LangChain adapter that preserves MCP tool output as structured artifacts."""

    def _convert_tool(self, mcp_tool: MCPTool, connector: BaseConnector) -> BaseTool | None:
        """Convert an MCP tool into a LangChain tool that returns content plus artifact."""
        if mcp_tool.name in self.disallowed_tools:
            return None

        adapter_self = self

        class StructuredMcpTool(BaseTool):
            name: str = mcp_tool.name or "NO NAME"
            description: str = mcp_tool.description or ""
            args_schema: type[BaseModel] = jsonschema_to_pydantic(
                adapter_self.fix_schema(mcp_tool.inputSchema)
            )
            tool_connector: BaseConnector = connector
            handle_tool_error: bool = True
            response_format: str = "content_and_artifact"

            def __repr__(self) -> str:
                """Return a readable debug representation for the wrapped MCP tool."""
                return f"MCP tool: {self.name}: {self.description}"

            def _run(self, **kwargs: Any) -> NoReturn:
                """Reject sync execution because MCP tools are async-only."""
                raise NotImplementedError("MCP tools only support async operations")

            async def _arun(self, **kwargs: Any) -> tuple[str, dict[str, Any]]:
                """Execute the MCP tool and preserve its raw content blocks in an artifact."""
                logger.debug(f'MCP tool: "{self.name}" received input: {kwargs}')

                try:
                    tool_result: CallToolResult = await self.tool_connector.call_tool(self.name, kwargs)
                    artifact = _build_tool_result_artifact(self.name, tool_result)
                    return _build_tool_result_text(self.name, artifact), artifact
                except Exception as e:
                    if self.handle_tool_error:
                        error_text = format_error(e, tool=self.name)
                        return error_text, _build_error_artifact(self.name, error_text)
                    raise

        return StructuredMcpTool()

    def _convert_resource(self, mcp_resource: Resource, connector: BaseConnector) -> BaseTool:
        """Convert an MCP resource into a LangChain tool with structured artifact output."""

        def _sanitize(name: str) -> str:
            """Create a safe identifier for dynamic resource tool names."""
            return re.sub(r"[^A-Za-z0-9_]+", "_", name).lower().strip("_")

        class StructuredResourceTool(BaseTool):
            name: str = _sanitize(mcp_resource.name or f"resource_{mcp_resource.uri}")
            description: str = (
                mcp_resource.description or f"Return the content of the resource located at URI {mcp_resource.uri}."
            )
            args_schema: type[BaseModel] = ReadResourceRequestParams
            tool_connector: BaseConnector = connector
            handle_tool_error: bool = True
            response_format: str = "content_and_artifact"

            def _run(self, **kwargs: Any) -> NoReturn:
                """Reject sync execution because MCP resources are async-only."""
                raise NotImplementedError("Resource tools only support async operations")

            async def _arun(self, **kwargs: Any) -> tuple[str, dict[str, Any]]:
                """Fetch the resource and keep the raw payload available to the UI artifact."""
                logger.debug(f'Resource tool: "{self.name}" called')
                try:
                    result = await self.tool_connector.read_resource(mcp_resource.uri)
                    contents = []
                    text_fragments: list[str] = []
                    for content in result.contents:
                        normalized = _to_json_safe(content)
                        contents.append(normalized)
                        if isinstance(content, bytes):
                            text_fragments.append(content.decode())
                        else:
                            text_fragments.append(str(content))
                    artifact = {
                        "kind": "mcp_tool_result",
                        "tool": self.name,
                        "is_error": False,
                        "content_blocks": [{"type": "resource", "resource": item} for item in contents],
                    }
                    return "\n".join(text_fragments), artifact
                except Exception as e:
                    if self.handle_tool_error:
                        error_text = format_error(e, tool=self.name)
                        return error_text, _build_error_artifact(self.name, error_text)
                    raise

        return StructuredResourceTool()

    def _convert_prompt(self, mcp_prompt: Prompt, connector: BaseConnector) -> BaseTool:
        """Convert an MCP prompt into a LangChain tool with structured artifact output."""
        prompt_arguments = mcp_prompt.arguments

        base_model_name = re.sub(r"[^a-zA-Z0-9_]", "_", mcp_prompt.name)
        if not base_model_name or base_model_name[0].isdigit():
            base_model_name = "PromptArgs_" + base_model_name
        dynamic_model_name = f"{base_model_name}_InputSchema"

        if prompt_arguments:
            field_definitions_for_create: dict[str, Any] = {}
            for arg in prompt_arguments:
                param_type: type = getattr(arg, "type", str)
                if arg.required:
                    field_definitions_for_create[arg.name] = (
                        param_type,
                        Field(description=arg.description),
                    )
                else:
                    field_definitions_for_create[arg.name] = (
                        param_type | None,
                        Field(None, description=arg.description),
                    )

            input_schema = create_model(dynamic_model_name, **field_definitions_for_create, __base__=BaseModel)
        else:
            input_schema = create_model(dynamic_model_name, __base__=BaseModel)

        class StructuredPromptTool(BaseTool):
            name: str = mcp_prompt.name
            description: str | None = mcp_prompt.description
            args_schema: type[BaseModel] = input_schema
            tool_connector: BaseConnector = connector
            handle_tool_error: bool = True
            response_format: str = "content_and_artifact"

            def _run(self, **kwargs: Any) -> NoReturn:
                """Reject sync execution because MCP prompts are async-only."""
                raise NotImplementedError("Prompt tools only support async operations")

            async def _arun(self, **kwargs: Any) -> tuple[str, dict[str, Any]]:
                """Resolve the prompt and forward both readable text and raw prompt messages."""
                logger.debug(f'Prompt tool: "{self.name}" called with args: {kwargs}')
                try:
                    result = await self.tool_connector.get_prompt(self.name, kwargs)
                    messages = _to_json_safe(result.messages)
                    artifact = {
                        "kind": "mcp_tool_result",
                        "tool": self.name,
                        "is_error": False,
                        "content_blocks": [{"type": "prompt_message", "message": message} for message in messages],
                    }
                    return "\n".join(str(message) for message in result.messages), artifact
                except Exception as e:
                    if self.handle_tool_error:
                        error_text = format_error(e, tool=self.name)
                        return error_text, _build_error_artifact(self.name, error_text)
                    raise

        return StructuredPromptTool()
