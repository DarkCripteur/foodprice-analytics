from fastapi import APIRouter, HTTPException
from app.schemas import PredictionRequest
from app.services.data_service import ForecastInputError, load_prices, filter_prices
from app.services.prediction_service import forecast_prices

router = APIRouter(prefix="/api/predictions", tags=["Prédictions"])

@router.post("")
def predict(request: PredictionRequest):
    try:
        df = filter_prices(load_prices(), request.product, request.region, request.market)
        if df.empty:
            raise HTTPException(status_code=404, detail="Aucune donnée ne correspond à ces filtres.")
        result = forecast_prices(df, request.horizon_days)
        result.update({
            "product": request.product,
            "region": request.region,
            "market": request.market,
            "currency": "XOF",
            "data_type": "synthetic" if (df["data_type"] == "synthetic").all() else "observed_or_mixed",
        })
        return result
    except HTTPException:
        raise
    except ForecastInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/metrics")
def metrics(product: str, region: str | None = None, market: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region, market)
        if df.empty:
            raise HTTPException(status_code=404, detail="Aucune donnée disponible.")
        result = forecast_prices(df, 7)
        return {
            "product": product,
            "region": region,
            "metrics": result.get("metrics"),
            "available": result.get("available"),
            "message": result.get("message"),
            "unit": result.get("unit"),
            "currency": "XOF",
        }
    except HTTPException:
        raise
    except ForecastInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
