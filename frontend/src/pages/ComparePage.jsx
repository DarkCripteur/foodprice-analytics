import { Link, useLocation, useOutletContext } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

export default function ComparePage() {
  const { filters, trends } = useOutletContext();
  const location = useLocation();

  return (
    <div className="page-content single-panel-page">
      <section className="panel comparison-panel">
        <div className="panel-heading">
          <div>
            <h2><ChartNoAxesCombined size={19} /> Comparateur de prix</h2>
            <p>La comparaison doit porter sur des produits ou marchés et des unités compatibles.</p>
          </div>
        </div>
        <div className="comparison-summary">
          <article><span>Série sélectionnée</span><strong>{filters.product || "Tous les produits"}</strong></article>
          <article><span>Marché</span><strong>{filters.market || "Tous les marchés"}</strong></article>
          <article><span>Points historiques</span><strong>{trends.length.toLocaleString("fr-FR")}</strong></article>
        </div>
        <p className="empty">
          Le comparateur multi-séries et les courbes en base 100 seront raccordés aux analyses dédiées.
          L’historique filtré reste disponible sans présenter de séries non comparables.
        </p>
        <Link className="button primary" to={{ pathname: "/prix", search: location.search }}>
          Ouvrir l’explorateur de prix
        </Link>
      </section>
    </div>
  );
}
