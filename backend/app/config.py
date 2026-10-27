from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = Path(os.getenv("FOODPRICE_DATA_FILE", BASE_DIR / "data" / "processed" / "demo_prices.csv"))
ALLOWED_ORIGINS = os.getenv("FOODPRICE_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
