import os
import json
from openai import OpenAI
from neo4j import GraphDatabase

client = OpenAI(
    api_key=os.environ.get("MOONSHOT_API_KEY"),
    base_url="https://api.moonshot.cn/v1",
)

# 创建连接到 Neo4j 的驱动
uri = "bolt://localhost:7687"
driver = GraphDatabase.driver(uri, auth=("neo4j", "12345678"))

class KnowledgeGraphExtractor:
    def __init__(self):
        # 读取提示词模板
        self.entity_prompt = self.read_prompt("prompt/entity_extraction.txt")
        self.relation_prompt = self.read_prompt("prompt/relationship_extraction.txt")

    @staticmethod
    def read_prompt(file_path):
        """读取提示词模板"""
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()

    @staticmethod
    def read_json_file(file_path):
        """读取JSON文件"""
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)

    def chat_with_LLM(self, messages):
        """与LLM交互"""
        try:
            response = client.chat.completions.create(
                model="moonshot-v1-32k",
                messages=messages,
                temperature=0.5,
                response_format={"type": "json_object"},
                stream=True,
            )

            full_response = ""
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    full_response += content
            return full_response

        except Exception as e:
            print(f"LLM调用出错: {str(e)}")
            raise

    def extract_entities(self, text):
        """提取实体"""
        messages = [
            {"role": "system", "content": self.entity_prompt},
            {
                "role": "user",
                "content": f"请从以下文本中提取与话题相关的核心实体：\n\n{text}",
            },
        ]
        response = self.chat_with_LLM(messages)
        return self.parse_ai_response(response)

    def extract_relations(self, text, entities):
        """提取关系"""
        entities_str = ", ".join(entities)
        messages = [
            {"role": "system", "content": self.relation_prompt},
            {
                "role": "user",
                "content": f"已知实体列表：{entities_str}\n\n请从以下文本中提取这些实体之间的关系：\n\n{text}",
            },
        ]
        response = self.chat_with_LLM(messages)
        return self.parse_ai_response(response)