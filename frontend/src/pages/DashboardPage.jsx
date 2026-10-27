import { useLocation, useOutletContext } from "react-router-dom";
import { Activity, ArrowRight, Database, MapPin, TrendingUp, Wheat } from "lucide-react";
import { Link } from "react-router-dom";
import PriceTrendChart from "../components/PriceTrendChart";
import { formatDate, formatNumber } from "../utils/format";

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="stat-card">
      <div className="stat-heading"><span>{label}</span><Icon size={19} /></div>
      <h2>{value}</h2>
      <p>{detail}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { loading, prices, summary, trends, filters } = useOutletContext();
  const location = useLocation();
  const priceRoute = { pathname: "/prix", search: location.search };
  const forecastRoute = { pathname: "/previsions", search: location.search };
  const latestPrices = [...prices].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 5);
  const unit = prices[0]?.unit || "unité";
  const currency = prices[0]?.currency || "XOF";
  const variation = summary?.variation_percent;

  return (
    <div className="page-content dashboard-page">
      <section className="stats-grid" aria-label="Indicateurs clés">
        <MetricCard
          label="Prix moyen"
          value={loading ? "…" : summary?.average_price == null ? "—" : `${formatNumber(summary.average_price)} ${currency}`}
          detail={`Unité : ${unit}`}
          icon={Database}
        />
        <MetricCard
          label="Dernier prix"
          value={loading ? "…" : summary?.latest_price == null ? "—" : `${formatNumber(summary.latest_price)} ${currency}`}
          detail="Observation la plus récente"
          icon={Wheat}
        />
        <MetricCard
          label="Variation observée"
          value={loading ? "…" : variation == null ? "—" : `${variation > 0 ? "+" : ""}${formatNumber(variation)} %`}
          detail="Du premier au dernier relevé"
          icon={TrendingUp}
        />
        <MetricCard
          label="Produits suivis"
          value={loading ? "…" : formatNumber(summary?.product_count ?? 0)}
          detail="Dans la sélection actuelle"
          icon={Wheat}
        />
        <MetricCard
          label="Régions couvertes"
          value={loading ? "…" : formatNumber(summary?.regions_count ?? 0)}
          detail="Dans la sélection actuelle"
          icon={MapPin}
        />
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2><Activity size={19} /> Évolution des prix</h2>
            <p>{filters.product || "Tous les produits"} · {filters.region || "Toutes les régions"} · {filters.market || "Tous les marchés"}</p>
          </div>
          <Link className="text-link" to={priceRoute}>Voir l’analyse complète <ArrowRight size={15} /></Link>
        </div>
        <PriceTrendChart trends={trends} />
      </section>

      <section className="dashboard-bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Dernières observations</h2><p>Les relevés les plus récents de votre sélection</p></div>
          </div>
          {latestPrices.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Produit</th><th>Région</th><th>Prix</th></tr></thead>
                <tbody>
                  {latestPrices.map((item, index) => (
                    <tr key={`${item.date}-${item.product}-${index}`}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.product}</td>
                      <td>{item.region}</td>
                      <td>{formatNumber(item.price)} {item.currency}/{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">{loading ? "Chargement des observations…" : "Aucune observation pour cette sélection."}</p>
          )}
        </section>

        <section className="panel quick-links">
          <div className="panel-heading">
            <div><h2>Accès rapide</h2><p>Poursuivez votre exploration</p></div>
          </div>
          <Link className="quick-link" to={priceRoute}>
            <span className="quick-link-icon"><Database size={18} /></span>
            <span><strong>Explorer les données</strong><small>Historique détaillé et export CSV</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link className="quick-link" to={forecastRoute}>
            <span className="quick-link-icon"><TrendingUp size={18} /></span>
            <span><strong>Prévoir les tendances</strong><small>Prévisions et évaluation du modèle</small></span>
            <ArrowRight size={16} />
          </Link>
        </section>
      </section>
    </div>
  );
}
