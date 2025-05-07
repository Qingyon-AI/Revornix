from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from rich import print
from dotenv import load_dotenv
import os
import asyncio
import json

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

load_dotenv()

server_params = StdioServerParameters(command="python", args=["server.py"])

history_messages = [
    {
        "role": "system",
        "content": "You are a helpful assistant. You will excute tasks as prompted."
    },
]

def chat(query: str):
    history_messages.append({
        "role": "user",
        "content": query
    })
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            *history_messages,
        ]
    )
    return response.choices[0].message.content.strip()

def get_prompt_to_identify_tool_and_arguments(query, tools):
    tools_description = "\n".join([f"- {tool.name}, {tool.description}, {tool.inputSchema}" for tool in tools])
    return ("You are a helpful assistant with access to these tools:\n\n"
            f"{tools_description}\n"
            "Choose the appropriate tool based on the user's question. \n"
            f"User's Question: {query}\n"
            "If no tool is needed, reply directly.\n\n"
            "Important: When you need to use a tool, you must only response with "
            "the exact JSON object format below, nothing else:\n"
            "Keep the values in str "
            "{\n"
            '  "tool": "tool_name",\n'
            '  "arguments": {\n'
            '    "argument-name": "value"\n'
            "  }\n"
            "}\n\n")
    
def get_prompt_to_summarize_result(query: str, result: str):
    return (f"Now you have got the result of the tool call: {result},\n" 
            f"please answer the user's question: {query} based on the result.\n")

async def run(query: str):
    async with stdio_client(
        server_params
    ) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            tools = await session.list_tools()
            
            print(f"Available tools: {tools}")
            
            prompt = get_prompt_to_identify_tool_and_arguments(query, tools.tools)
            
            print(f"The prompt: {prompt}")
            
            llm_response = chat(prompt)
            
            print(f"LLM Response: {llm_response}")
            
            tool_call = json.loads(llm_response)
            
            print(f"Tool Call: {tool_call}")
            
            result = await session.call_tool(tool_call["tool"], tool_call["arguments"])
            
            print(f"Result: {result}")
            
if __name__=="__main__":
    query = "neo4j这篇文章如何"
    asyncio.run(run(query))
