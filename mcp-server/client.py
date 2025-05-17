import json
from typing import Any
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from typing import List
from openai import OpenAI
from openai.types.chat.chat_completion import ChatCompletion
from loguru import logger
from dotenv import load_dotenv
from common.logger import log_exception
from common.mcp_client_wrapper import MCPClientWrapper
from prompts.mcp import get_prompt_to_identify_tool_and_arguments, get_prompt_to_process_tool_response, get_if_down_prompt
from fastapi import FastAPI
from contextlib import AsyncExitStack

class ChatItem(BaseModel):
    chat_id: str
    content: str | None = None
    reasoning_content: str | None = None
    role: str
    finish_reason: str | None = None
    
class AskRequest(BaseModel):
    messages: List[ChatItem]
    
class ResponseItem(BaseModel):
    status: str
    content: Any  | None = None

app = FastAPI()

load_dotenv()

max_depth = 3

MCP_SERVERS = [
    "http://localhost:8000/document/mcp",
    "http://localhost:8000/common/mcp"
]

def call_llm_stream(message: str):
    client = OpenAI()
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ],
        stream=True,
    )
    return stream

def call_llm(message: str) -> ChatCompletion:
    client = OpenAI()
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ]
    )
    return completion
    
async def stream_ops_stream(query: str, memory: List[str]):
    tool_mapping = {}
    all_tools = []

    async with AsyncExitStack() as stack:
        clients = []
        for url in MCP_SERVERS:
            try:
                client = MCPClientWrapper(url)
                client = await stack.enter_async_context(client)
                clients.append(client)
                tools = await client.list_tools()
                for t in tools:
                    tool_mapping[t.name] = client
                    all_tools.append({
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.inputSchema
                    })
            except Exception as e:
                logger.warning(f"Failed to connect to {url}: {e}")

        # 1. 选择工具
        prompt = get_prompt_to_identify_tool_and_arguments(query=query, tools=all_tools, context=memory)
        yield ResponseItem(status="Selecting tool...").model_dump_json()
        selection_result = call_llm(prompt).choices[0].message.content
        yield ResponseItem(status="Tool Selected", content=selection_result).model_dump_json()
        tool_call = json.loads(selection_result)
        tool_name = tool_call["tool"]

        if tool_name == "none":
            tool_response = "No tool selected"
            yield ResponseItem(status="No tool selected").model_dump_json()
        elif tool_name not in tool_mapping:
            tool_response = "Tool not found"
            yield ResponseItem(status=f"Tool {tool_name} not found.").model_dump_json()
        else:
            # 2. 调用工具
            arguments = tool_call["arguments"]
            client = tool_mapping[tool_name]
            tool_result = await client.call_tool(tool_name, arguments)
            tool_response = tool_result.content[0].text
            yield ResponseItem(status="Tool Result", content=f"{tool_response}").model_dump_json()

        # 3. 再由 LLM 对结果进行总结
        checking_prompt = get_if_down_prompt(query, tool_response, context=memory)
        status = call_llm(checking_prompt).choices[0].message.content
        yield ResponseItem(status="Checking continue", content=status).model_dump_json()
        response_prompt = get_prompt_to_process_tool_response(query, tool_response, context=memory)
        yield ResponseItem(status="Generating final response").model_dump_json()

        for chunk in call_llm_stream(response_prompt):
            chunk = ChatItem(
                chat_id=chunk.id,
                content=chunk.choices[0].delta.content if hasattr(chunk.choices[0].delta, 'content') else None,
                role='assistant',
                finish_reason=chunk.choices[0].finish_reason
            )
            yield ResponseItem(status="AI Answering", content=chunk.model_dump_json()).model_dump_json()
    
@app.post("/test")
async def ask_ai(ask_request: AskRequest):
    memory = [m.content for m in ask_request.messages[:-1]]
    query = ask_request.messages[-1].content
    depth = 0

    async def event_generator():
        nonlocal query, depth

        should_stop = False
        
        while depth <= max_depth:
            try:
                async for chunk in stream_ops_stream(query, memory):
                    chunk = json.loads(chunk)
                    status = chunk.get('status')
                    content = chunk.get('content')
                    res = ResponseItem(status=status, content=content).model_dump_json()
                    yield res
                    if status == "Checking continue" and content is not None and "finish" in content:
                        should_stop = True
                    else:
                        query = content
                        memory.append(query)
                if should_stop:
                    break  # 退出 outer while-loop
                depth += 1
            except Exception as e:
                yield ResponseItem(status=f"Something went wrong", content=str(e)).model_dump_json()
                log_exception()
                break

        if depth > max_depth:
            yield ResponseItem(status="Max depth reached. Terminating.").model_dump_json()

    return StreamingResponse(event_generator(), media_type="text/event-stream")