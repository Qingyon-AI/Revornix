def get_prompt_to_identify_tool_and_arguments(query: str, tools: list, context: list[str]) -> str:
    tools_description = "\n".join([
        f"{tool['name']}: {tool['description']}, {tool['inputSchema']}" for tool in tools
    ])
    return (
        "You are a helpful assistant with access to these tools and context:\n\n"
        f"CONTEXT: {context} \n"
        f"{tools_description}\n"
        "Choose the appropriate tool if needed based on the user's question. \n"
        f"User's Question: {query}\n"
        "Always identify a single tool only if needed.\n"
        "IMPORTANT: When you need to use a tool, you must ONLY respond with the exact JSON object format below, "
        "DO NOT ADD any other comment or wrappers.:\n"
        "Keep the values in str format.\n"
        "{\n"
        '    "tool": "tool-name",\n'
        '    "arguments": {\n'
        '        "argument-name": "value"\n'
        "    }\n"
        "}\n\n"
        "IMPORTANT: If no tool is needed or there is no tool that can be used to answer the question, tool-name should be none.\n"
    )
    
def get_if_down_prompt(query: str, tool_response: str, context: list[str]) -> str:
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

def get_prompt_to_process_tool_response(query: str, tool_response: str, context: List[str]) -> str:
    return (
        "You are a helpful assistant."
        " Your job is to decide whether to respond directly to the user or continue processing using additional tools, based on:"
        "\n- The user's query"
        "\n- The tool's response"
        "\n- The conversation context."
        "\nSometimes, multiple tools may be needed to fully address the user's request."
        "\nCarefully analyze the query, tool response, and context together."
        "\nIf no further processing is needed, respond directly to the user and set the action to 'finish'."
        "\nIf more processing is needed, clearly state what’s pending and set the action to 'continue'."
        "\nAlways respond with JSON like this:"
        '\n{\n  "action": "finish",\n  "response": "your response here"\n}'
        "\n\nInputs:"
        f"\nUser's query: {query}"
        f"\nTool response: {tool_response}"
        f"\nCONTEXT: {context}"
        "\nIMPORTANT: Always respond in VALID JSON using double quotes for keys and string values. DO NOT use single quotes."
    )