import crud
import schemas
import json
from data.sql.base import session_scope
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from prompts.document_auto_tag import document_auto_tag_prompt
from common.markdown_helpers import get_markdown_content_by_document_id
from proxy.ai_model_proxy import AIModelProxy

class LLMDocumentTagEngine:
    
    user_id: int
    
    def __init__(
        self,
        user_id: int
    ):
        self.user_id = user_id

    async def generate_tags(
        self, 
        document_id: int
    ) -> list[schemas.document.DocumentLabel] | None:
        model_id: int | None = None
        tags: list[schemas.document.DocumentLabel] = []
        with session_scope() as db:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=self.user_id
            )
            if db_user is None:
                raise Exception('User not found')
            if db_user.default_document_reader_model_id is None:
                raise Exception('User does not have a default document reader model')
            if db_user.default_user_file_system is None:
                raise Exception('User does not have a default user file system')
            model_id = db_user.default_document_reader_model_id
            
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is None:
                raise Exception("The document you want to generate the tags is not found")
            
            db_tags = crud.document.get_user_labels_by_user_id(
                db=db,
                user_id=self.user_id
            )
            tags = [
                schemas.document.DocumentLabel(id=x.id, name=x.name)
                for x in db_tags
            ]
        if model_id is None:
            raise Exception('User does not have a default document reader model')
        model_configuration = (await AIModelProxy.create(
            user_id=self.user_id,
            model_id=model_id
        )).get_configuration()
        document_content = await get_markdown_content_by_document_id(
            document_id=document_id,
            user_id=self.user_id,
        )
        
        prompt = document_auto_tag_prompt(
            document_content=document_content,
            tags=tags
        )
        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f'model:{model_configuration.model_name}']
        ):
            llm_client = OpenAI(
                base_url=model_configuration.base_url,
                api_key=model_configuration.api_key
            )
            response = llm_client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[
                    {
                        "role": "user", 
                        "content": prompt
                    },   
                ],
                response_format={"type": "json_object"},
            )
            if len(response.choices) > 0 and response.choices[0].message is not None and response.choices[0].message.content is not None:
                res = json.loads(response.choices[0].message.content)
                res = [
                    schemas.document.DocumentLabel(
                        id=x['id'], 
                        name=x['name']
                    )
                    for x in res.get('tags')
                ]
                return res
            return None

if __name__ == '__main__':
    async def main():
        engine = LLMDocumentTagEngine(
            user_id=1
        )
        res = await engine.generate_tags(document_id=4)
        print(res)
    import asyncio
    asyncio.run(main())
