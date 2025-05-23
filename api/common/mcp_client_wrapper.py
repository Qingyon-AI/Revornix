from contextlib import AsyncExitStack
from typing import Dict
from loguru import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamablehttp_client


class MCPClientWrapper:
    def __init__(self, mcp_type: str = "stream", base_url: str | None = None, command: str | None = None, args: str | None = None):
        self.stack = AsyncExitStack()
        self.session = None
        self.base_url = base_url
        self.mcp_type = mcp_type
        self.command = command
        self.args = args

    async def __aenter__(self):
        # 创建 async exit stack
        await self.stack.__aenter__()
        if self.mcp_type == "std":
            server_params = StdioServerParameters(
                command=self.command,  # Executable
                args=[item for item in self.args.split(',') if item],  # Optional command line arguments
                env=None,  # Optional environment variables
            )
            self.read_stream, self.write_stream = await self.stack.enter_async_context(
                stdio_client(server_params)
            )   
        elif self.mcp_type == "stream":
            self.read_stream, self.write_stream, _ = await self.stack.enter_async_context(
                streamablehttp_client(self.base_url)
            )
        # 创建 MCP Session 并加入 stack 管理
        self.session = ClientSession(self.read_stream, self.write_stream)
        await self.stack.enter_async_context(self.session)

        info = await self.session.initialize()
        logger.info(f"Connected to MCP server at {self.base_url} ({info.serverInfo.name})")

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stack.__aexit__(exc_type, exc_val, exc_tb)

    async def list_tools(self):
        return (await self.session.list_tools()).tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, str]):
        return await self.session.call_tool(tool_name, arguments=arguments)