from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from io import StringIO
from app.services.data_service import load_prices, filter_prices

router = APIRouter(prefix="/api", tags=["Prix"])

@router.get("/products")
def products():
    try:
        df = load_prices()
        return {"products": sorted(df["product"].dropna().unique().tolist())}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/regions")
def regions():
    try:
        df = load_prices()
        return {"regions": sorted(df["region"].dropna().unique().tolist())}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/markets")
def markets(product: str | None = None, region: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region)
        return {"markets": sorted(df["market"].dropna().unique().tolist())}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/prices")
def prices(product: str | None = None, region: str | None = None, market: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region, market)
        records = df.copy()
        records["date"] = records["date"].dt.strftime("%Y-%m-%d")
        records["price"] = records["price"].round(2)
        return {"count": len(records), "demo_data": bool((records["data_type"] == "synthetic").all()) if len(records) else False, "prices": records.to_dict(orient="records")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/prices/export")
def export_prices(product: str | None = None, region: str | None = None, market: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region, market)
        output = StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=foodprice_export.csv"})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/analytics/summary")
def summary(product: str | None = None, region: str | None = None, market: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region, market)
        if df.empty:
            return {"count": 0, "average_price": None, "latest_price": None, "variation_percent": None, "product_count": 0, "demo_data": False}
        series_keys = ["product", "market", "unit"]
        daily = (
            df.groupby(series_keys + ["date"], as_index=False, dropna=False)["price"]
            .mean()
            .sort_values("date")
        )
        latest_by_series = daily.groupby(series_keys, dropna=False).tail(1)
        first_by_series = daily.groupby(series_keys, dropna=False).head(1)
        first_prices = first_by_series.set_index(series_keys)["price"]
        last_prices = latest_by_series.set_index(series_keys)["price"]
        variations = ((last_prices - first_prices) / first_prices * 100).dropna()
        variation = float(variations.median()) if not variations.empty else None
        latest_price = float(latest_by_series["price"].median())
        return {
            "count": int(len(df)),
            "average_price": round(float(df["price"].mean()), 2),
            "latest_price": round(latest_price, 2),
            "variation_percent": round(float(variation), 2) if variation is not None else None,
            "product_count": int(df["product"].nunique()),
            "regions_count": int(df["region"].nunique()),
            "demo_data": bool((df["data_type"] == "synthetic").all()),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/analytics/trends")
def trends(product: str | None = None, region: str | None = None, market: str | None = None):
    try:
        df = filter_prices(load_prices(), product, region, market)
        if df.empty:
            return {"trends": []}
        series_keys = ["product", "market", "unit", "date"]
        daily_series = df.groupby(series_keys, as_index=False, dropna=False)["price"].mean()
        grouped = daily_series.groupby("date", as_index=False)["price"].median().sort_values("date")
        grouped["date"] = grouped["date"].dt.strftime("%Y-%m-%d")
        grouped["price"] = grouped["price"].round(2)
        grouped["unit"] = df["unit"].iloc[0] if df["unit"].nunique() == 1 else None
        return {"trends": grouped.to_dict(orient="records")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
