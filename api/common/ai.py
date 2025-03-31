import json
import os
from openai import OpenAI

def summary_section(markdown_content: str):
    system_prompt = f"""
    This is the entire content of the document, {markdown_content}. Please summarize it in markdown format and provide me with a markdown summary report. The word count should be no less than 800 words, but if the original content is short, the word count can be a bit lower. Also, please ensure that the response is in the following JSON format:
    {{
    "summary": "Summary"
    }}
    """
    client = OpenAI(
        api_key=os.environ.get("MOONSHOT_API_KEY"),
        base_url="https://api.moonshot.cn/v1",
    )
    completion = client.chat.completions.create(
        model="kimi-latest",
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=4096
    )
    content = json.loads(completion.choices[0].message.content)
    summary = content.get('summary')
    return {
        "summary": summary
    }

def summary_section_with_origin(origin_section_markdown_content: str, new_document_markdown_content: str):
    system_prompt = f"""
    This is a summary document that consolidates several foundational documents, {origin_section_markdown_content}. This is the latest document, {new_document_markdown_content}. I hope you can use the original summary document and the new document to create a new, more complete markdown format summary report for me. The report should be in a format that allows for easy overall review, with a word count of at least 800 words. If the original content is short, the word count can be slightly lower. Please make sure to output your response in the following JSON format:
    {{
    "summary": "Summary Document"
    }}
    """
    client = OpenAI(
        api_key=os.environ.get("MOONSHOT_API_KEY"),
        base_url="https://api.moonshot.cn/v1",
    )
    completion = client.chat.completions.create(
        model="kimi-latest",
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=8192
    )
    content = json.loads(completion.choices[0].message.content)
    summary = content.get('summary')
    return {
        "summary": summary
    }
    
def summary_document(markdown_content: str):
    system_prompt = f"""
    This is the entire content of the document, {markdown_content}. Please summarize it in Chinese by providing a title, a brief description, and an overview of the content. The title should be around 10 characters, the description should be no less than 100 characters, and the summary should be between 300 and 600 characters. Please ensure to output your response in the following JSON format:
    {{
    "title": "Title",
    "description": "Description",
    "summary": "Summary"
    }}
    """
    client = OpenAI(
        api_key=os.environ.get("MOONSHOT_API_KEY"),
        base_url="https://api.moonshot.cn/v1",
    )
    completion = client.chat.completions.create(
        model="kimi-latest",
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=4096
    )
    content = json.loads(completion.choices[0].message.content)
    title = content.get('title')
    description = content.get('description')
    summary = content.get('summary')
    return {
        "title": title,
        "description": description,
        "summary": summary
    }