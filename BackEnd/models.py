from pydantic import BaseModel
from typing import List, Optional

class Alternative(BaseModel):
    name: str
    tag: Optional[str] = ""
    type: Optional[str] = "general"
    risk_score: int
    safe_time: Optional[str] = "Весь день"
    walk_time: Optional[str] = ""
    route: Optional[str] = ""
    ai_reason: Optional[str] = "Анализ данных..."

class RiskZone(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    risk_score: float
    risk_level: str 
    safe_time: str
    walk_time_from_nis: str
    description: str
    safest_route_from_nis: str
    alternatives: List[Alternative]