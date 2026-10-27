import { useMemo } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { MapPin, Store } from "lucide-react";
import { formatNumber } from "../utils/format";

export default function MarketsPage() {
  const { filters, loading, markets, prices } = useOutletContext();
  const location = useLocation();
  const latestByMarket = useMemo(() => {
    const latest = new Map();
    [...prices]
      .sort((first, second) => second.date.localeCompare(first.date))
      .forEach((observation) => {
        if (!latest.has(observation.market)) latest.set(observation.market, observation);
      });
    return latest;
  }, [prices]);

  return (
    <div className="page-content markets-page">
      <section className="panel markets-map-panel">
        <div className="panel-heading">
          <div>
            <h2><MapPin size={19} /> Marchés suivis</h2>
            <p>Référentiel disponible pour les filtres actuels : {filters.region || "toutes les régions"}.</p>
          </div>
          <span className="pill">{formatNumber(markets.length)} marché(s)</span>
        </div>
        <div className="market-map-placeholder" role="status">
          <MapPin size={28} />
          <strong>Carte géographique en préparation</strong>
          <span>Aucune coordonnée n’est inventée ; les positions seront ajoutées avec le référentiel vérifié.</span>
        </div>
      </section>

      <section className="panel market-list-panel">
        <div className="panel-heading">
          <div><h2>Liste synchronisée</h2><p>{loading ? "Chargement des marchés…" : "Sélectionnez un marché pour ouvrir ses observations."}</p></div>
        </div>
        <div className="market-list">
          {markets.map((market) => {
            const latest = latestByMarket.get(market);
            const params = new URLSearchParams(location.search);
            params.set("marche", market);
            return (
              <article className="market-card" key={market}>
                <div className="market-card-icon"><Store size={18} /></div>
                <div className="market-card-copy">
                  <strong>{market}</strong>
                  <span>{latest ? `${latest.region} · dernier relevé ${latest.price.toLocaleString("fr-FR")} ${latest.currency}/${latest.unit}` : "Aucun relevé dans la sélection actuelle"}</span>
                </div>
                <Link className="button secondary" to={{ pathname: "/prix", search: `?${params.toString()}` }}>
                  Voir les prix
                </Link>
              </article>
            );
          })}
          {!loading && markets.length === 0 && <p className="empty">Aucun marché ne correspond aux filtres.</p>}
        </div>
      </section>
    </div>
  );
}
