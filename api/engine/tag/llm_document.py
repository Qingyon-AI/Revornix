import crud
import schemas
import json
from enums.document import DocumentCategory
from data.sql.base import session_scope
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from prompts.document_auto_tag import document_auto_tag_prompt
from proxy.ai_model_proxy import AIModelProxy
from proxy.file_system_proxy import FileSystemProxy

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
    ) -> list[schemas.document.Label] | None:
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

            model_configuration = (await AIModelProxy.create(
                user_id=self.user_id,
                model_id=db_user.default_document_reader_model_id
            )).get_configuration()
            
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is None:
                raise Exception("The document you want to generate the tags is not found")

            doc_category = db_document.category
            md_file_name = None
            if doc_category == DocumentCategory.FILE or doc_category == DocumentCategory.WEBSITE:
                db_convert_task = crud.task.get_document_convert_task_by_document_id(
                    db=db,
                    document_id=document_id
                )
                if db_convert_task is None:
                    raise Exception("The document you want to process do not have a the convert task info")
                if db_convert_task.md_file_name is None:
                    raise Exception("The document you want to process do not have a the md file name")
                md_file_name = db_convert_task.md_file_name
            
            tags = crud.document.get_user_labels_by_user_id(
                db=db,
                user_id=self.user_id
            )
            tags = [
                schemas.document.Label(id=x.id, name=x.name)
                for x in tags
            ]
        document_content = ''
        if doc_category == DocumentCategory.FILE or doc_category == DocumentCategory.WEBSITE:
            remote_file_service = await FileSystemProxy.create(
                user_id=self.user_id
            )
            if md_file_name is None:
                raise Exception("The document you want to process do not have a the md file name")
            document_content = await remote_file_service.get_file_content_by_file_path(
                file_path=md_file_name
            )
        elif doc_category == DocumentCategory.QUICK_NOTE:
            db_quick_not_document = crud.document.get_quick_note_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_quick_not_document is None:
                raise Exception("The document you want to process do not have a the quick note document info")
            document_content = db_quick_not_document.content
        
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
                temperature=0.2,  # 降低发散
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
                    schemas.document.Label(
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
