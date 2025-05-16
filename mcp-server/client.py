import asyncio
import traceback
import json
from typing import List
from openai import OpenAI
from loguru import logger
from dotenv import load_dotenv
from common.mcp_client_wrapper import MCPClientWrapper
from prompts.mcp import get_prompt_to_identify_tool_and_arguments, get_prompt_to_process_tool_response

from contextlib import AsyncExitStack

load_dotenv()

max_depth = 5
MCP_SERVERS = [
    "http://localhost:8000/document/mcp",
    "http://localhost:8000/common/mcp"
]

def llm_client(message: str) -> str:
    client = OpenAI()
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ]
    )
    return completion.choices[0].message.content

async def stream_ops(query: str, memory: List[str]) -> dict:
    tool_mapping = {}
    all_tools = []

    async with AsyncExitStack() as stack:
        clients = []

        # Step 1: Connect to all servers
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
                logger.warning(f"Failed to connect or list tools for {url}: {e}")

        if not all_tools:
            raise RuntimeError("No tools available from any MCP server.")

        # Step 2: Let LLM select tool from all tools
        prompt = get_prompt_to_identify_tool_and_arguments(query=query, tools=all_tools, context=memory)
        logger.info(f"Tool selection prompt:\n{prompt}")
        response = llm_client(prompt)
        logger.info(f"LLM selected tool: {response}")

        tool_call = json.loads(response)
        tool_name = tool_call["tool"]
        arguments = tool_call["arguments"]

        if tool_name not in tool_mapping:
            tool_response = f"Tool {tool_name} is not available."
        else:
            client = tool_mapping[tool_name]
            tool_result = await client.call_tool(tool_name, arguments)
            tool_response = tool_result.content[0].text
        
        logger.info(f"Tool {tool_name} returned: {tool_response}")

        response_prompt = get_prompt_to_process_tool_response(query, tool_response, context=memory)
        final_response = llm_client(response_prompt)
        parsed = json.loads(final_response)
        return parsed

async def main():
    memory = []
    depth = 0

    print("Chat Agent: Hello! How can I assist you today?")
    user_input = input("You: ")

    while True:
        if depth > max_depth:
            print("Max depth reached. Exiting.")
            break
        if user_input.lower() in ["exit", "bye", "close"]:
            print("See you later!")
            break

        try:
            response = await stream_ops(user_input, memory)
            depth += 1
            memory.append(response)

            if response.get("action") == "respond_to_user":
                logger.info(f"Agent: {response['response']}")
                user_input = input("You: ")
                memory.append(user_input)
            else:
                user_input = response["response"]
        except Exception as e:
            logger.error(f"Fatal error: {type(e).__name__} - {e}")
            traceback.print_exception(type(e), e, e.__traceback__)

if __name__ == "__main__":
    asyncio.run(main())