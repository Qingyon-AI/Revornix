from pydantic import BaseModel, Field

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
