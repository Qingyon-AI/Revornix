from dotenv import load_dotenv
load_dotenv()  # load environment variables from .env

import ast
import asyncio
import json
from typing import Dict
from openai import OpenAI
from loguru import logger
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

# import httpx
# _orig_request = httpx.AsyncClient.request

# async def _patched_request(self, method, url, *args, **kwargs):
#     # ensure follow_redirects is set so 307 → /messages/ works
#     kwargs.setdefault("follow_redirects", True)
#     return await _orig_request(self, method, url, *args, **kwargs)

# httpx.AsyncClient.request = _patched_request

def llm_client(message: str):
    client = OpenAI()

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {
                "role": "user",
                "content": message,
            },
        ]
    )

    result = completion.choices[0].message.content
    return result

def get_prompt_to_identify_tool_and_arguments(query: str, 
                                              tools: any, 
                                              context = list):
    tools_description = "\n".join([f"{tool.name}: {tool.description}, {tool.inputSchema}" for tool in tools.tools])
    return  ("You are a helpful assistant with access to these tools and context:\n\n"
                f"CONTEXT: {context} \n"
                f"{tools_description}\n"
                "Choose the appropriate tool based on the user's question. \n"
                f"User's Question: {query}\n"                
                "If no tool is needed, reply directly.\n\n"
                "IMPORTANT: Always identify a single tool only."
                "IMPORTANT: When you need to use a tool, you must ONLY respond with the exact JSON object format below, "
                "DO NOT ADD any other comment or wrappers.:\n"
                "Keep the values in str format."
                "{\n"
                '    "tool": "tool-name",\n'
                '    "arguments": {\n'
                '        "argument-name": "value"\n'
                "    }\n"
                "}\n\n"
                )
    
def get_prompt_to_process_tool_response(query:str, 
                                        tool_response:str, 
                                        context:list):
    response_format = '''
    {
        "action": "respond_to_user",
        "response": "your response here"
    }
    '''
    return (
        "You are a helpful assistant."
        " Your job is to decide whether to respond directly to the user or continue processing using additional tools, based on:"
        "\n- The user's query"
        "\n- The tool's response"
        "\n- The conversation context."
        "\nSometimes, multiple tools may be needed to fully address the user's request."
        "\nCarefully analyze the query, tool response, and context together."
        "\nIf no further processing is needed, respond directly to the user and set the action to 'respond_to_user' with your response.\
            Ensure the response addresses the user's original query. For example, if the query had 2 tasks, the response to the user should address both tasks"
        "\nIf more processing is needed (for example, if a query has multiple tasks but only one has been handled), clearly state what’s pending and leave the action blank."
        "\nAlways follow this response format:"
        f"\n{response_format}"
        "\n\nInputs:"
        f"\nUser's query: {query}"
        f"\nTool response: {tool_response}"
        f"\nCONTEXT: {context}"
        f"\nIMPORTANT: Always respond in VALID JSON using double quotes for keys and string values. DO NOT use single quotes."
        )

async def stream_ops(query:str, memory:list):
     # Connect to a streamable HTTP server
    async with streamablehttp_client("http://localhost:8000/common/mcp") as (
        read_stream,
        write_stream,
        _,
    ):
        # Create a session using the client streams
        async with ClientSession(read_stream, write_stream) as session:
            # 3) Initialize
            info = await session.initialize()
            logger.info(f"Connected to {info.serverInfo.name} v{info.serverInfo.version}")

            # 4) List tools
            tools = (await session.list_tools())
            print("Available tools:", [t.name for t in tools.tools])
            
            prompt = get_prompt_to_identify_tool_and_arguments(query=query,
                                                               tools=tools,
                                                               context=memory)
            logger.info(f"Printing tool identification prompt\n {prompt}")
            
            response = llm_client(prompt)
            logger.info(f"Response from LLM {response}")
            
            tool_call = json.loads(response)
            result = await session.call_tool(tool_call["tool"], arguments=tool_call["arguments"])
            
            tool_response = result.content[0].text
            
            response_prompt = get_prompt_to_process_tool_response(query=query,
                                                                  tool_response=tool_response,
                                                                  context=memory)
            logger.info(f"Printing tool process response prompt\n {response_prompt}")
            final_response = llm_client(response_prompt)
            
            ##Convert string respons to dict
            try:
                json_dict = json.loads(final_response)
                if not isinstance(json_dict, dict):
                    raise ValueError("response is not a valid dictionary")
                return json_dict
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse response from LLM as JSON: {final_response}")
                raise e
            
async def main():
    memory = []   
        
    ##Use this as the query to the agent = "Calculate BMI for height 5ft 10inches and weight 80kg"
    print("Chat Agent: Hello! How can I assist you today?")
    user_input = input("You: ")

    while True:
        if user_input.lower() in ["exit", "bye", "close"]:
            print("See you later!")
            break

        response = await stream_ops(user_input, memory)
        memory.append(response)
        if isinstance(response, dict) and response["action"] == "respond_to_user":
            print("Reponse from Agent: ", response["response"])
            user_input = input("You: ")
            memory.append(user_input)
        else:
            user_input = response["response"]
        
    
if __name__ == "__main__":    
    asyncio.run(main())