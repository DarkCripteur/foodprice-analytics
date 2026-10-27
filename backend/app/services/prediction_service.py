import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from app.services.data_service import ForecastInputError, normalize_price


def _make_features(series: pd.Series) -> pd.DataFrame:
    frame = pd.DataFrame({"price": series.astype(float)})
    frame["lag_1"] = frame["price"].shift(1)
    frame["lag_2"] = frame["price"].shift(2)
    frame["lag_3"] = frame["price"].shift(3)
    frame["rolling_mean_3"] = frame["price"].shift(1).rolling(3).mean()
    frame["day_of_year"] = frame.index.day_of_year
    frame["month"] = frame.index.month
    return frame.dropna()


def forecast_prices(group: pd.DataFrame, horizon_days: int = 7):
    group = group.sort_values("date").copy()
    if "product" in group and group["product"].nunique() > 1:
        raise ForecastInputError("Sélectionnez un seul produit pour générer une prévision.")
    if "market" in group and group["market"].nunique() > 1:
        raise ForecastInputError("Sélectionnez un seul marché : les prévisions sont calculées par série.")

    normalized_prices = [
        normalize_price(row.price, row.unit, row.currency)
        for row in group[["price", "unit", "currency"]].itertuples(index=False)
    ]
    standard_units = {unit for _, unit in normalized_prices}
    if len(standard_units) != 1:
        raise ForecastInputError(
            "Unités incompatibles : une prévision ne peut pas mélanger kilogrammes et litres."
        )
    group["normalized_price"] = [price for price, _ in normalized_prices]
    standard_unit = standard_units.pop()

    # Aggregate same-day observations only after converting them to a common unit.
    series = group.groupby("date")["normalized_price"].mean().sort_index()
    if len(series) < 12:
        return {
            "available": False,
            "message": "Historique insuffisant : au moins 12 dates distinctes sont nécessaires pour cette prévision exploratoire.",
            "history_points": int(len(series)),
            "forecast": [],
            "metrics": None,
            "unit": standard_unit,
        }

    features = _make_features(series)
    if len(features) < 8:
        return {
            "available": False,
            "message": "Pas assez de lignes après préparation des variables.",
            "history_points": int(len(series)),
            "forecast": [],
            "metrics": None,
            "unit": standard_unit,
        }

    X = features.drop(columns=["price"])
    y = features["price"]
    split = max(5, int(len(features) * 0.8))
    if split >= len(features):
        split = len(features) - 1
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    model = RandomForestRegressor(n_estimators=150, random_state=42, min_samples_leaf=2)
    model.fit(X_train, y_train)
    test_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, test_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, test_pred)))

    # Réentraînement sur toutes les observations disponibles avant prévision récursive.
    final_model = RandomForestRegressor(n_estimators=150, random_state=42, min_samples_leaf=2)
    final_model.fit(X, y)
    history = series.copy()
    forecast = []
    last_date = pd.Timestamp(history.index.max())
    for step in range(1, horizon_days + 1):
        next_date = last_date + pd.Timedelta(days=step)
        values = history.values
        row = {
            "lag_1": float(values[-1]),
            "lag_2": float(values[-2]),
            "lag_3": float(values[-3]),
            "rolling_mean_3": float(np.mean(values[-3:])),
            "day_of_year": int(next_date.day_of_year),
            "month": int(next_date.month),
        }
        predicted = float(final_model.predict(pd.DataFrame([row]))[0])
        predicted = max(0.0, predicted)
        forecast.append({"date": next_date.strftime("%Y-%m-%d"), "predicted_price": round(predicted, 2)})
        history.loc[next_date] = predicted

    return {
        "available": True,
        "message": "Prévision expérimentale basée sur un modèle Random Forest. Elle doit être interprétée avec prudence.",
        "history_points": int(len(series)),
        "history": [
            {"date": date.strftime("%Y-%m-%d"), "price": round(float(price), 2)}
            for date, price in series.items()
        ],
        "forecast": forecast,
        "metrics": {"mae": round(mae, 2), "rmse": round(rmse, 2), "test_points": int(len(X_test))},
        "model": "RandomForestRegressor",
        "unit": standard_unit,
    }
