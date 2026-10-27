from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS
from app.routers import prices, predictions

app = FastAPI(
    title="FoodPrice Analytics Sénégal",
    description="API pédagogique d'analyse et de prévision des prix alimentaires.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(prices.router)
app.include_router(predictions.router)

@app.get("/api/health", tags=["Système"])
def health():
    return {"status": "ok", "application": "FoodPrice Analytics Sénégal"}
