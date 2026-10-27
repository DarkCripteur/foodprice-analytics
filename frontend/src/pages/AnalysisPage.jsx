import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";
import PriceTrendChart from "../components/PriceTrendChart";
import { formatDate, formatNumber } from "../utils/format";

const PAGE_SIZE = 10;

export default function AnalysisPage() {
  const { filters, loading, prices, trends } = useOutletContext();
  const [currentPage, setCurrentPage] = useState(1);
  const orderedPrices = useMemo(
    () => [...prices].sort((first, second) => second.date.localeCompare(first.date)),
    [prices],
  );
  const pageCount = Math.max(1, Math.ceil(orderedPrices.length / PAGE_SIZE));
  const pagePrices = orderedPrices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.product, filters.region, filters.market]);

  return (
    <div className="page-content analysis-page">
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2><ChartNoAxesCombined size={19} /> Historique des prix</h2>
            <p>{filters.product || "Tous les produits"} · {filters.region || "Toutes les régions"} · {filters.market || "Tous les marchés"}</p>
          </div>
          <span className="pill">{formatNumber(trends.length)} date(s)</span>
        </div>
        <PriceTrendChart trends={trends} />
      </section>

      <section className="panel analysis-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Observations détaillées</h2>
            <p>{loading ? "Chargement des relevés…" : `${formatNumber(prices.length)} observation(s) correspondant aux filtres`}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Produit</th><th>Région</th><th>Marché</th><th>Prix</th><th>Source</th><th>Type</th></tr>
            </thead>
            <tbody>
              {pagePrices.map((item, index) => (
                <tr key={`${item.date}-${item.product}-${item.market}-${index}`}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.product}</td>
                  <td>{item.region}</td>
                  <td>{item.market}</td>
                  <td>{formatNumber(item.price)} {item.currency}/{item.unit}</td>
                  <td>{item.source}</td>
                  <td><span className="table-tag">{item.data_type === "synthetic" ? "Démo" : "Donnée"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && prices.length === 0 && <p className="empty">Aucune observation pour ces filtres.</p>}
          {prices.length > 0 && (
            <div className="pagination" aria-label="Pagination des observations">
              <span>Page {currentPage} / {pageCount}</span>
              <div>
                <button
                  className="button secondary"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Page précédente"
                >
                  Précédent
                </button>
                <button
                  className="button secondary"
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  disabled={currentPage >= pageCount}
                  aria-label="Page suivante"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
