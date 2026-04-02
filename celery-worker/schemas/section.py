from pydantic import Field
from .base import BaseModel

class ImagePlan(BaseModel):
    id: str = Field(..., description="Unique id used in markdown marker [image-id: <id>]")
    prompt: str = Field(..., description="Prompt for image generation engine")

class ImagePlanResult(BaseModel):
    markdown_with_markers: str
    plans: list[ImagePlan]

class GeneratedImage(BaseModel):
    id: str
    prompt: str
    image: str  # markdown image string, e.g. ![](data:image/png;base64,...)


class PptSlidePlan(BaseModel):
    id: str
    title: str
    summary: str
    prompt: str


class PptPlanResult(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    theme_prompt: str | None = None
    slides: list[PptSlidePlan] = Field(default_factory=list)
