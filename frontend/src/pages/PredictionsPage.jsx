import { useOutletContext } from "react-router-dom";
import { Activity, BrainCircuit, RefreshCw } from "lucide-react";
import PriceTrendChart from "../components/PriceTrendChart";
import { formatDate, formatNumber } from "../utils/format";

export default function PredictionsPage() {
  const {
    filters, horizon, setHorizon, prediction, metrics, predicting, measuring,
    loading, trends, onPredict, onMeasure,
  } = useOutletContext();
  const hasProduct = Boolean(filters.product);

  return (
    <div className="page-content prediction-page">
      <section className="panel prediction-panel">
        <div className="panel-heading">
          <div><h2><BrainCircuit size={19} /> Prévision expérimentale</h2><p>Modèle Random Forest · Python / scikit-learn</p></div>
          <span className="pill">{filters.product || "Sélectionnez un produit"}</span>
        </div>
        {!hasProduct && (
          <p className="empty">Choisissez un produit dans les filtres pour activer la prévision et l’évaluation.</p>
        )}
        <div className="prediction-controls">
          <label htmlFor="horizon">Horizon de prévision</label>
          <select
            id="horizon"
            value={horizon}
            onChange={(event) => setHorizon(Number(event.target.value))}
            disabled={!hasProduct || predicting}
          >
            <option value={7}>7 jours</option>
            <option value={15}>15 jours</option>
            <option value={30}>30 jours</option>
          </select>
          <button className="button primary" onClick={onPredict} disabled={!hasProduct || loading || predicting}>
            <RefreshCw size={16} className={predicting ? "spin" : ""} />
            {predicting ? "Calcul en cours…" : "Générer une prévision"}
          </button>
          <button className="button secondary" onClick={onMeasure} disabled={!hasProduct || loading || measuring}>
            <Activity size={16} className={measuring ? "spin" : ""} />
            {measuring ? "Évaluation…" : "Évaluer le modèle"}
          </button>
        </div>
        {prediction && (
          <div className="prediction-result" aria-live="polite">
            <strong>{prediction.available ? "Prévision calculée" : "Prévision indisponible"}</strong>
            <p>{prediction.message}</p>
            {prediction.metrics && (
              <p>MAE : {formatNumber(prediction.metrics.mae)} · RMSE : {formatNumber(prediction.metrics.rmse)} · Test : {prediction.metrics.test_points} point(s) · FCFA/{prediction.unit}</p>
            )}
            {prediction.data_type === "synthetic" && (
              <small>Résultat fondé sur des données synthétiques, à ne pas interpréter comme une prévision réelle du marché.</small>
            )}
            {prediction.forecast?.length > 0 && (
              <div className="forecast-list forecast-grid">
                {prediction.forecast.map((item) => (
                  <div key={item.date}><span>{formatDate(item.date)}</span><strong>{formatNumber(item.predicted_price)} FCFA/{prediction.unit}</strong></div>
                ))}
              </div>
            )}
          </div>
        )}
        {metrics && (
          <div className="prediction-result" aria-live="polite">
            <strong>{metrics.available ? "Évaluation temporelle" : "Évaluation indisponible"}</strong>
            <p>{metrics.message}</p>
            {metrics.metrics && (
              <p>MAE : {formatNumber(metrics.metrics.mae)} · RMSE : {formatNumber(metrics.metrics.rmse)} · Test : {metrics.metrics.test_points} point(s) · FCFA/{metrics.unit}</p>
            )}
          </div>
        )}
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div><h2>Comparaison historique et prévision</h2><p>Le résultat de prévision est superposé à l’historique filtré.</p></div>
          {prediction?.available && <span className="pill">{prediction.forecast.length} jour(s)</span>}
        </div>
        <PriceTrendChart trends={trends} prediction={prediction} />
      </section>
    </div>
  );
}
