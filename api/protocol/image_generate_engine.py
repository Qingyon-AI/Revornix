import crud
import json
import asyncio
from proxy.ai_model_proxy import AIModelProxy
from protocol.engine import EngineProtocol
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from prompts.section_image import build_image_planner_user_prompt, IMAGE_PLANNER_SYSTEM
from schemas.section import ImagePlan, ImagePlanResult
from data.sql.base import SessionLocal
from data.custom_types.all import EntityInfo, RelationInfo

class ImageGenerateEngineProtocol(EngineProtocol):
    
    def generate_image(
        self, 
        prompt: str
    ) -> str:
        raise NotImplementedError("Method not implemented")
    
    @staticmethod
    async def plan_images_with_llm(
        user_id: int,
        markdown: str,
        entities: list[EntityInfo],
        relations: list[RelationInfo],
    ) -> ImagePlanResult:
        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
            if db_user is None:
                raise RuntimeError("User not found")
            if db_user.default_document_reader_model_id is None:
                raise RuntimeError("Default document reader model not set")

            entities_dict = [
                e.model_dump(include={"id", "text", "entity_type"})
                for e in entities
            ]
            relations_dict = [
                r.model_dump(include={"src_node", "tgt_node", "relation_type"})
                for r in relations
            ]

            user_prompt = build_image_planner_user_prompt(
                markdown=markdown,
                entities=entities_dict,
                relations=relations_dict,
                max_images=6,
            )

            model_conf = (await AIModelProxy.create(
                user_id=user_id,
                model_id=db_user.default_document_reader_model_id
            )).get_configuration()

            with propagate_attributes(user_id=str(user_id)):
                client = OpenAI(
                    api_key=model_conf.api_key,
                    base_url=model_conf.base_url,
                )
                completion = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=model_conf.model_name,
                    messages=[
                        {"role": "system", "content": IMAGE_PLANNER_SYSTEM},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.3,
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                )

                resp_text = completion.choices[0].message.content
                if not resp_text:
                    raise RuntimeError("Image planner returned empty response")

                data = json.loads(resp_text)

                plans = data.get("plans") or []
                plans = plans[:6]

                return ImagePlanResult(
                    markdown_with_markers=data["markdown_with_markers"],
                    plans=[ImagePlan(**p) for p in plans],
                )

        finally:
            db.close()