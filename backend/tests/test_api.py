import pandas as pd
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_products():
    response = client.get("/api/products")
    assert response.status_code == 200
    assert "products" in response.json()

def test_markets_can_be_filtered_by_product_and_region():
    response = client.get("/api/markets", params={"product": "Riz local", "region": "Dakar"})
    assert response.status_code == 200
    assert response.json()["markets"] == ["Marché de démonstration Dakar"]

def test_price_analytics_and_export_share_filters():
    params = {"product": "Riz local", "region": "Dakar", "market": "Marché de démonstration Dakar"}

    prices = client.get("/api/prices", params=params)
    summary = client.get("/api/analytics/summary", params=params)
    trends = client.get("/api/analytics/trends", params=params)
    export = client.get("/api/prices/export", params=params)

    assert prices.status_code == summary.status_code == trends.status_code == export.status_code == 200
    assert prices.json()["count"] > 0
    assert summary.json()["count"] == prices.json()["count"]
    assert len(trends.json()["trends"]) == prices.json()["count"]
    assert "Marché de démonstration Dakar" in export.text

def test_prediction_metrics_accept_market_filter():
    response = client.get(
        "/api/predictions/metrics",
        params={
            "product": "Riz local",
            "region": "Dakar",
            "market": "Marché de démonstration Dakar",
        },
    )

    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["metrics"]["mae"] >= 0

def test_prediction_supports_thirty_day_horizon():
    response = client.post(
        "/api/predictions",
        json={"product": "Riz local", "region": "Dakar", "horizon_days": 30},
    )

    assert response.status_code == 200
    assert response.json()["available"] is True
    assert len(response.json()["forecast"]) == 30

def test_prediction_rejects_horizons_over_thirty_days():
    response = client.post(
        "/api/predictions",
        json={"product": "Riz local", "region": "Dakar", "horizon_days": 31},
    )

    assert response.status_code == 422


def test_summary_aggregates_variation_and_latest_price_by_market_series(monkeypatch):
    rows = [
        {"date": "2026-01-01", "product": "Riz", "region": "Dakar", "market": "A", "price": 100, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-02", "product": "Riz", "region": "Dakar", "market": "A", "price": 200, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-01", "product": "Riz", "region": "Dakar", "market": "B", "price": 1000, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-02", "product": "Riz", "region": "Dakar", "market": "B", "price": 900, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
    ]
    monkeypatch.setattr(
        "app.routers.prices.load_prices",
        lambda: pd.DataFrame(rows).assign(date=lambda frame: pd.to_datetime(frame["date"])),
    )

    response = client.get("/api/analytics/summary", params={"product": "Riz"})

    assert response.status_code == 200
    assert response.json()["variation_percent"] == 45
    assert response.json()["latest_price"] == 550


def test_trends_use_daily_medians_of_market_series(monkeypatch):
    rows = [
        {"date": "2026-01-01", "product": "Riz", "region": "Dakar", "market": "A", "price": 100, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-01", "product": "Riz", "region": "Dakar", "market": "B", "price": 1000, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-02", "product": "Riz", "region": "Dakar", "market": "A", "price": 200, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
        {"date": "2026-01-02", "product": "Riz", "region": "Dakar", "market": "B", "price": 900, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"},
    ]
    monkeypatch.setattr(
        "app.routers.prices.load_prices",
        lambda: pd.DataFrame(rows).assign(date=lambda frame: pd.to_datetime(frame["date"])),
    )

    response = client.get("/api/analytics/trends", params={"product": "Riz"})

    assert response.status_code == 200
    assert [item["price"] for item in response.json()["trends"]] == [550, 550]


def test_prediction_rejects_multiple_markets_without_market_filter(monkeypatch):
    rows = [
        {"date": date, "product": "Riz", "region": "Dakar", "market": market, "price": 100, "unit": "kg", "currency": "XOF", "source": "test", "data_type": "observed"}
        for date in pd.date_range("2026-01-01", periods=12)
        for market in ("A", "B")
    ]
    monkeypatch.setattr("app.routers.predictions.load_prices", lambda: pd.DataFrame(rows))

    response = client.post(
        "/api/predictions",
        json={"product": "Riz", "region": "Dakar", "horizon_days": 7},
    )

    assert response.status_code == 422
    assert "un seul marché" in response.json()["detail"]


def test_prediction_rejects_incompatible_units(monkeypatch):
    rows = [
        {"date": date, "product": "Riz", "region": "Dakar", "market": "A", "price": 100, "unit": unit, "currency": "XOF", "source": "test", "data_type": "observed"}
        for date, unit in zip(pd.date_range("2026-01-01", periods=12), ["kg"] * 6 + ["L"] * 6)
    ]
    monkeypatch.setattr("app.routers.predictions.load_prices", lambda: pd.DataFrame(rows))

    response = client.post(
        "/api/predictions",
        json={"product": "Riz", "region": "Dakar", "market": "A", "horizon_days": 7},
    )

    assert response.status_code == 422
    assert "Unités incompatibles" in response.json()["detail"]


def test_price_normalization_converts_common_package_units():
    from app.services.data_service import normalize_price

    assert normalize_price(18000, "bidon de 20 L", "XOF") == (900, "L")
    assert normalize_price(2500, "2,5 kg", "FCFA") == (1000, "kg")


def test_forecast_returns_normalized_unit_for_package_prices(monkeypatch):
    rows = [
        {
            "date": date,
            "product": "Riz",
            "region": "Dakar",
            "market": "A",
            "price": 1000 if index % 2 == 0 else 2000,
            "unit": "kg" if index % 2 == 0 else "2 kg",
            "currency": "XOF",
            "source": "test",
            "data_type": "observed",
        }
        for index, date in enumerate(pd.date_range("2026-01-01", periods=20))
    ]
    monkeypatch.setattr("app.routers.predictions.load_prices", lambda: pd.DataFrame(rows))

    response = client.post(
        "/api/predictions",
        json={"product": "Riz", "region": "Dakar", "market": "A", "horizon_days": 7},
    )

    assert response.status_code == 200
    assert response.json()["unit"] == "kg"
    assert response.json()["currency"] == "XOF"
    assert {point["price"] for point in response.json()["history"]} == {1000}
