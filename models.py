from pydantic import BaseModel
from typing import List

class Alternative(BaseModel):
    name: str
    tag: str
    type: str
    risk_score: int
    safe_time: str
    walk_time: str
    route: str
    ai_reason: str

class RiskZone(BaseModel):
    id: int
    name: str
    
    # координаты (у тебя они есть в JSON!)
    lat: float
    lng: float
    
    risk_score: float
    risk_level: str  # <-- у тебя есть в JSON
    
    safe_time: str
    walk_time_from_nis: str  # <-- есть в JSON
    description: str
    
    # маршрут
    safest_route_from_nis: str
    
    # альтернативы
    alternatives: List[Alternative]
