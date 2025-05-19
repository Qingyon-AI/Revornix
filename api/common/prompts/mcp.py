from typing import List

def get_prompt_to_continue_next_tool(query: str, tool_response: str, context: List) -> str:
    return (
        "You are a helpful assistant with access to these tools and context:\n"
        "Now you have received the response from the previous tools, and because you can't answer the question directly, you need to continue processing using additional tools based on:\n"
        "\n- The user's query"
        "\n- The tools' response"
        "\n- The conversation context."
        "\nSometimes, multiple tools may be needed to fully address the user's request."
        "\nCarefully analyze the query, tool responses, and context together."
        "What you need to do is to say what you have learned from the previous tools response."
        "\n\nInputs:"
        f"\nUser's query: {query}"
        f"\nTool response: {tool_response}"
        f"\nCONTEXT: {context}"
    )

def get_prompt_to_identify_tool_and_arguments(query: str, tools: List, context: List) -> str:
    tools_description = "\n".join([
        f"{tool['name']}: {tool['description']}, {tool['inputSchema']}" for tool in tools
    ])
    return (
        "You are a helpful assistant with access to these tools and context:\n"
        f"CONTEXT: {context} \n"
        f"TOOLS: {tools_description}\n"
        "Choose the appropriate tool if needed based on the user's question. \n"
        f"User's Question: {query}\n"
        "Always identify a single tool only if needed.\n"
        "IMPORTANT: When you need to use a tool, you must ONLY respond with the exact JSON object format below, "
        "DO NOT ADD any other comment or wrappers.:\n"
        "Keep the values in str format.\n"
        '{"tool": "tool-name", "arguments": {"argument-name": "value"}}\n'
        "IMPORTANT: If no tool is needed or there is no tool that can be used to answer the question, tool-name should be none.\n"
    )
    
def get_if_down_prompt(query: str, tool_response: str, context: List) -> str:
    return (
        "You are a helpful assistant."
        " Your job is to decide whether to respond directly to the user or continue processing using additional tools, based on:"
        "\n- The user's query"
        "\n- The tool's response"
        "\n- The conversation context."
        "\nSometimes, multiple tools may be needed to fully address the user's request."
        "\nCarefully analyze the query, tool response, and context together."
        "\nIf no further processing is needed, respond directly to the user and set the action to 'finish'."
        "\nIf more processing is needed, set the action to 'continue'."
        "\nAlways respond with JSON like this:"
        '\n{"action": "finish"}'
        "\n\nInputs:"
        f"\nUser's query: {query}"
        f"\nTool response: {tool_response}"
        f"\nCONTEXT: {context}"
        "\nIMPORTANT: Always respond in VALID JSON using double quotes for keys and string values. DO NOT use single quotes."
    )

def get_prompt_to_process_tool_response(query: str, tool_response: str, context: List) -> str:
    return (
        "You are a helpful assistant."
        " Your job is to answer the user's question, based on:"
        "\n- The user's query"
        "\n- The tool's response"
        "\n- The conversation context."
        "\nCarefully analyze the query, tool response, and context together."
        "\n\nInputs:"
        f"\nUser's query: {query}"
        f"\nTool response: {tool_response}"
        f"\nCONTEXT: {context}"
    )