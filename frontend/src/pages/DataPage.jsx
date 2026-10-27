import { useOutletContext } from "react-router-dom";
import { Database, ShieldCheck } from "lucide-react";
import { formatNumber } from "../utils/format";

export default function DataPage() {
  const { apiConnected, isDemo, loading, prices, summary } = useOutletContext();
  const source = prices[0]?.source || (isDemo ? "DEMO_SYNTHETIC" : "Source non renseignée");
  const dataType = isDemo ? "synthetic" : prices[0]?.data_type || "unknown";

  return (
    <div className="page-content data-page">
      <section className="stats-grid data-stats" aria-label="État des données">
        <article className="stat-card">
          <div className="stat-heading"><span>API</span><ShieldCheck size={19} /></div>
          <h2>{apiConnected ? "Connectée" : "Indisponible"}</h2>
          <p>État du service backend</p>
        </article>
        <article className="stat-card">
          <div className="stat-heading"><span>Observations</span><Database size={19} /></div>
          <h2>{loading ? "…" : formatNumber(prices.length)}</h2>
          <p>Dans la sélection active</p>
        </article>
        <article className="stat-card">
          <div className="stat-heading"><span>Produits</span><Database size={19} /></div>
          <h2>{loading ? "…" : formatNumber(summary?.product_count ?? 0)}</h2>
          <p>Dans la sélection active</p>
        </article>
      </section>

      <section className="panel source-panel">
        <div className="panel-heading">
          <div><h2>Catalogue des sources</h2><p>Chaque série doit conserver sa provenance et son type.</p></div>
          <span className={`table-tag${isDemo ? " synthetic-tag" : ""}`}>{dataType}</span>
        </div>
        <div className="source-card">
          <div className="source-card-icon"><Database size={20} /></div>
          <div>
            <strong>{source}</strong>
            <p>{isDemo ? "Jeu local synthétique, réservé à la démonstration et aux tests." : "Source déclarée par les observations actuellement filtrées."}</p>
            <small>Les données de démonstration ne sont pas des prix observés du Sénégal.</small>
          </div>
        </div>
      </section>
    </div>
  );
}
