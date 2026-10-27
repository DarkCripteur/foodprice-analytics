from pydantic import BaseModel, Field
from typing import Optional

class PredictionRequest(BaseModel):
    product: str = Field(min_length=1, max_length=100)
    region: Optional[str] = None
    market: Optional[str] = None
    horizon_days: int = Field(default=7, ge=1, le=30)
