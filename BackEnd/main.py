from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import json
import random

# ------------------ MODELS ------------------

class Alternative(BaseModel):
    name: str
    tag: str
    type: str
    risk_score: float
    safe_time: str
    walk_time: str
    route: str
    ai_reason: str

class TimeSeriesItem(BaseModel):
    time: str
    crowd_density: int
    movement_chaos: int
    weather_factor: int
    time_peak_factor: int
    risk_score: float
    risk_level: str

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
    environment_risk: float = 0
    time_series: List[TimeSeriesItem] = []
    alternatives: List[Alternative] = []

# ------------------ APP ------------------

app = FastAPI(title="Smart City Risk Engine")

# Разрешаем фронт на другом порту
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # на хакатоне можно *
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ DATA ------------------

with open("data.json", "r", encoding="utf-8") as f:
    zones_data = json.load(f)

# ------------------ HELPERS ------------------

def normalize_zone(zone: dict) -> dict:
    """Гарантируем все обязательные поля для FastAPI"""
    zone_copy = zone.copy()
    zone_copy.setdefault("risk_score", 0)
    zone_copy.setdefault("risk_level", "low")
    zone_copy.setdefault("walk_time_from_nis", "")
    zone_copy.setdefault("safest_route_from_nis", "")
    zone_copy.setdefault("safe_time", "")
    zone_copy.setdefault("alternatives", [])
    zone_copy.setdefault("environment_risk", 0)
    zone_copy.setdefault("time_series", [])

    for alt in zone_copy["alternatives"]:
        alt.setdefault("tag", "")
        alt.setdefault("risk_score", 0)
        alt.setdefault("safe_time", "")
        alt.setdefault("walk_time", "")
        alt.setdefault("route", "")
        alt.setdefault("ai_reason", "")
    return zone_copy

def update_risk(zone: dict) -> dict:
    """Демонстрация динамики риска: случайное изменение ±5%"""
    zone = normalize_zone(zone)
    zone["risk_score"] = max(0, min(100, zone.get("risk_score", 0) + random.randint(-5, 5)))
    
    # Обновляем уровень риска
    if zone["risk_score"] < 30:
        zone["risk_level"] = "low"
    elif zone["risk_score"] < 70:
        zone["risk_level"] = "medium"
    else:
        zone["risk_level"] = "high"
    return zone

def get_zone_by_id(zone_id: int) -> dict | None:
    for zone in zones_data:
        if zone["id"] == zone_id:
            return zone
    return None

def fix_time_series_keys(zones):
    for zone in zones:
        if "time_series" in zone:
            for ts in zone["time_series"]:
                if "movement_chaос" in ts:
                    ts["movement_chaos"] = ts.pop("movement_chaос")
        if "alternatives" in zone:
            for alt in zone["alternatives"]:
                if "time_series" in alt:
                    for ts in alt["time_series"]:
                        if "movement_chaос" in ts:
                            ts["movement_chaos"] = ts.pop("movement_chaос")
    return zones

zones_data = fix_time_series_keys(zones_data)


# ------------------ ROUTES ------------------

@app.get("/")
def root():
    return {"message": "Smart City Backend работает! Используйте /zones, /zone/{id}, /predict/{id}"}

@app.get("/zones", response_model=List[RiskZone])
def get_zones():
    """Возвращает все зоны города с Risk Score и альтернативами"""
    updated_zones = [update_risk(zone) for zone in zones_data]
    return updated_zones

@app.get("/zone/{zone_id}", response_model=RiskZone)
def get_zone(zone_id: int):
    """Возвращает конкретную зону по id"""
    zone = get_zone_by_id(zone_id)
    if not zone:
        return normalize_zone({
            "id": zone_id,
            "name": "Не найдено",
            "lat": 0,
            "lng": 0,
            "risk_score": 0,
            "risk_level": "unknown",
            "safe_time": "",
            "walk_time_from_nis": "",
            "description": "",
            "safest_route_from_nis": "",
            "alternatives": []
        })
    return update_risk(zone)

@app.get("/predict/{zone_id}", response_model=RiskZone)
def predict(zone_id: int):
    """Mock-предсказание с ИИ-альтернативами"""
    zone = get_zone_by_id(zone_id)
    if not zone:
        return normalize_zone({
            "id": zone_id,
            "name": "Не найдено",
            "lat": 0,
            "lng": 0,
            "risk_score": 0,
            "risk_level": "unknown",
            "safe_time": "",
            "walk_time_from_nis": "",
            "description": "",
            "safest_route_from_nis": "",
            "alternatives": []
        })
    
    # Динамика риска: уменьшаем риск для демонстрации
    zone_copy = normalize_zone(zone)
    zone_copy["risk_score"] = max(0, zone_copy["risk_score"] - random.randint(5, 15))
    
    # Обновляем уровень риска
    if zone_copy["risk_score"] < 30:
        zone_copy["risk_level"] = "low"
    elif zone_copy["risk_score"] < 70:
        zone_copy["risk_level"] = "medium"
    else:
        zone_copy["risk_level"] = "high"
    
    return zone_copy