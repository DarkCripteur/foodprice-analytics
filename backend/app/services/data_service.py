import re
import pandas as pd
from app.config import DATA_FILE

REQUIRED_COLUMNS = ["date", "product", "region", "market", "price", "unit", "currency", "source", "data_type"]
PACKAGE_UNIT_PATTERN = re.compile(
    r"^(?:(?:sac|bag|bidon|bouteille|pack)\s*(?:de\s*)?)?"
    r"(\d+(?:[.,]\d+)?)?\s*"
    r"(kg|kilograms?|kilogrammes?|g|grams?|grammes?|l|liters?|litres?|ml)$",
    re.IGNORECASE,
)


class ForecastInputError(ValueError):
    """Raised when a selection cannot be forecast as one comparable series."""


def normalize_price(price: float, unit: str, currency: str) -> tuple[float, str]:
    """Convert supported mass/volume prices to XOF per kilogram or litre."""
    if currency.strip().casefold() not in {"xof", "fcfa", "cfa"}:
        raise ForecastInputError(
            f"Devise incompatible ({currency}) : la prévision nécessite des prix en XOF/FCFA."
        )

    normalized_unit = re.sub(r"\s+", " ", str(unit).strip().casefold()).replace(",", ".")
    match = PACKAGE_UNIT_PATTERN.fullmatch(normalized_unit)
    if match is None:
        raise ForecastInputError(
            f"Unité non prise en charge ({unit}) : utilisez une unité de masse ou de volume connue."
        )

    quantity, raw_measure = match.groups()
    measure = raw_measure.casefold()
    amount = float(quantity) if quantity else 1.0
    if measure in {"kg", "kilogram", "kilograms", "kilogramme", "kilogrammes"}:
        standard_unit, factor = "kg", amount
    elif measure in {"g", "gram", "grams", "gramme", "grammes"}:
        standard_unit, factor = "kg", amount / 1000
    elif measure == "ml":
        standard_unit, factor = "L", amount / 1000
    else:
        standard_unit, factor = "L", amount

    if factor <= 0:
        raise ForecastInputError(f"Quantité d'unité invalide ({unit}).")
    return float(price) / factor, standard_unit


def load_prices() -> pd.DataFrame:
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Fichier de données introuvable : {DATA_FILE}. "
            "Placez un CSV normalisé à cet emplacement."
        )
    df = pd.read_csv(DATA_FILE)
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV : {', '.join(missing)}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df = df.dropna(subset=["date", "product", "price"])
    df = df[df["price"] > 0].copy()
    df["product"] = df["product"].astype(str).str.strip()
    df["region"] = df["region"].fillna("Non renseignée").astype(str).str.strip()
    df["market"] = df["market"].fillna("Non renseigné").astype(str).str.strip()
    df["unit"] = df["unit"].fillna("unité").astype(str)
    df["currency"] = df["currency"].fillna("XOF").astype(str)
    df["source"] = df["source"].fillna("Non renseignée").astype(str)
    df["data_type"] = df["data_type"].fillna("unknown").astype(str)
    return df.sort_values("date")


def filter_prices(df: pd.DataFrame, product=None, region=None, market=None):
    out = df.copy()
    if product:
        out = out[out["product"].str.casefold() == product.casefold()]
    if region:
        out = out[out["region"].str.casefold() == region.casefold()]
    if market:
        out = out[out["market"].str.casefold() == market.casefold()]
    return out
