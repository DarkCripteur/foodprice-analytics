import { lazy, Suspense, useEffect, useState } from "react";
import {
  createBrowserRouter, Link, NavLink, Navigate, Outlet, RouterProvider,
  useLocation, useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle, BarChart3, BrainCircuit, ChartNoAxesCombined, ChevronLeft, Database,
  Download, MapPin, Moon, RefreshCw, Store, Sun, Wheat,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./services/api";
import "./App.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const MarketsPage = lazy(() => import("./pages/MarketsPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const PredictionsPage = lazy(() => import("./pages/PredictionsPage"));
const DataPage = lazy(() => import("./pages/DataPage"));

const NAV_ITEMS = [
  { to: "/tableau-de-bord", label: "Tableau de bord", shortLabel: "Accueil", icon: ChartNoAxesCombined },
  { to: "/prix", label: "Explorateur de prix", shortLabel: "Prix", icon: BarChart3 },
  { to: "/marches", label: "Marchés", shortLabel: "Marchés", icon: Store },
  { to: "/comparer", label: "Comparateur", shortLabel: "Comparer", icon: ChartNoAxesCombined },
  { to: "/previsions", label: "Prévisions IA", shortLabel: "Prévisions", icon: BrainCircuit },
  { to: "/donnees", label: "Sources et qualité", shortLabel: "Données", icon: Database },
];

const FILTER_QUERY_KEYS = {
  product: ["produit", "product"],
  region: ["region"],
  market: ["marche", "market"],
};

function getFilterValue(searchParams, filter) {
  const [primaryKey, legacyKey] = FILTER_QUERY_KEYS[filter];
  return searchParams.get(primaryKey) || (legacyKey ? searchParams.get(legacyKey) : "") || "";
}

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem("foodprice-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch (storageError) {
    console.warn("Impossible de lire le thème sauvegardé.", storageError);
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
}

function SuspendedPage({ children }) {
  return <Suspense fallback={<div className="route-loading" role="status">Chargement de la page…</div>}>{children}</Suspense>;
}

function FilterBar({
  products, regions, markets, product, region, market, loading, observationCount,
  onProductChange, onRegionChange, onMarketChange,
}) {
  return (
    <section className="filters panel" aria-label="Filtres des données">
      <div className="filter-field">
        <label htmlFor="product"><Wheat size={15} /> Produit</label>
        <select id="product" value={product} onChange={(event) => onProductChange(event.target.value)}>
          <option value="">Tous les produits</option>
          {products.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="region"><MapPin size={15} /> Région</label>
        <select id="region" value={region} onChange={(event) => onRegionChange(event.target.value)}>
          <option value="">Toutes les régions</option>
          {regions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="market"><Store size={15} /> Marché</label>
        <select
          id="market"
          value={market}
          onChange={(event) => onMarketChange(event.target.value)}
          disabled={loading && markets.length === 0}
        >
          <option value="">Tous les marchés</option>
          {markets.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="filter-meta" aria-live="polite">
        {loading ? "Chargement…" : `${observationCount.toLocaleString("fr-FR")} observation(s)`}
      </div>
    </section>
  );
}

function NotFoundPage() {
  const location = useLocation();
  return (
    <div className="page-content single-panel-page">
      <section className="panel">
        <h2>Page introuvable</h2>
        <p className="empty">Cette adresse ne correspond à aucun écran FoodPrice Analytics.</p>
        <Link className="button primary" to={{ pathname: "/tableau-de-bord", search: location.search }}>
          Retour au tableau de bord
        </Link>
      </section>
    </div>
  );
}

function LegacyRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function AppLayout() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [collapsed, setCollapsed] = useState(false);
  const [horizon, setHorizon] = useState(7);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();

  const product = getFilterValue(searchParams, "product");
  const region = getFilterValue(searchParams, "region");
  const market = getFilterValue(searchParams, "market");
  const filters = { product, region, market };

  useEffect(() => {
    try {
      window.localStorage.setItem("foodprice-theme", theme);
    } catch (storageError) {
      console.warn("Impossible de sauvegarder le thème choisi.", storageError);
    }
  }, [theme]);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: api.products,
    staleTime: 60_000,
    retry: 1,
  });
  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions,
    staleTime: 60_000,
    retry: 1,
  });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    staleTime: 30_000,
    retry: 1,
  });
  const marketsQuery = useQuery({
    queryKey: ["markets", product, region],
    queryFn: () => api.markets({ product, region }),
    staleTime: 60_000,
    retry: 1,
  });
  const priceDataQuery = useQuery({
    queryKey: ["price-data", filters],
    queryFn: async () => {
      const [summary, prices, trends] = await Promise.all([
        api.summary(filters),
        api.prices(filters),
        api.trends(filters),
      ]);
      return { summary, prices: prices.prices, trends: trends.trends };
    },
    staleTime: 30_000,
    retry: 1,
  });
  const forecastMutation = useMutation({ mutationFn: api.predict });
  const metricsMutation = useMutation({ mutationFn: api.metrics });
  const exportMutation = useMutation({
    mutationFn: async (selectedFilters) => {
      const response = await api.exportPrices(selectedFilters);
      if (!response.ok) {
        let message = `Erreur API (${response.status})`;
        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          message = `${message} : ${response.statusText || "réponse invalide"}`;
        }
        throw new Error(message);
      }
      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "foodprice_export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    },
  });

  const products = productsQuery.data?.products || [];
  const regions = regionsQuery.data?.regions || [];
  const markets = marketsQuery.data?.markets || [];
  const prices = priceDataQuery.data?.prices || [];
  const trends = priceDataQuery.data?.trends || [];
  const summary = priceDataQuery.data?.summary || null;
  const loading = priceDataQuery.isPending || priceDataQuery.isFetching;
  const isDemo = Boolean(summary?.demo_data || prices.some((price) => price.data_type === "synthetic"));
  const requestError = [
    productsQuery.error,
    regionsQuery.error,
    marketsQuery.error,
    priceDataQuery.error,
    forecastMutation.error,
    metricsMutation.error,
    exportMutation.error,
  ].find(Boolean);
  const error = requestError ? getErrorMessage(requestError) : "";

  useEffect(() => {
    if (!marketsQuery.isSuccess || !market || markets.includes(market)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("marche");
    nextParams.delete("market");
    setSearchParams(nextParams, { replace: true });
  }, [market, markets, marketsQuery.isSuccess, searchParams, setSearchParams]);

  function updateFilters(changes) {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([filter, value]) => {
      const [primaryKey, legacyKey] = FILTER_QUERY_KEYS[filter];
      if (value) nextParams.set(primaryKey, value);
      else nextParams.delete(primaryKey);
      if (legacyKey) nextParams.delete(legacyKey);
    });
    if ("product" in changes || "region" in changes) {
      nextParams.delete("marche");
      nextParams.delete("market");
    }
    setSearchParams(nextParams);
  }

  const onPredict = () => {
    if (!product) return;
    metricsMutation.reset();
    forecastMutation.mutate({
      product,
      region: region || null,
      market: market || null,
      horizon_days: Number(horizon),
    });
  };
  const onMeasure = () => {
    if (!product) return;
    forecastMutation.reset();
    metricsMutation.mutate({ product, region: region || null, market: market || null });
  };
  const onRefresh = () => queryClient.invalidateQueries();
  const onExport = () => exportMutation.mutate(filters);

  const pageContext = {
    apiConnected: healthQuery.isSuccess,
    filters,
    loading,
    prices,
    summary,
    trends,
    markets,
    products,
    regions,
    horizon,
    setHorizon,
    prediction: forecastMutation.data || null,
    metrics: metricsMutation.data || null,
    predicting: forecastMutation.isPending,
    measuring: metricsMutation.isPending,
    isDemo,
    onExport,
    onPredict,
    onMeasure,
    error,
  };
  const activePage = NAV_ITEMS.find((item) => item.to === location.pathname)
    || { label: location.pathname === "/marches" ? "Marchés" : "FoodPrice Analytics" };
  const navigationTarget = (to) => ({ pathname: to, search: location.search });

  function renderNavigation() {
    return (
      <nav className="sidebar-nav" aria-label="Navigation principale">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={navigationTarget(to)}
            end={to === "/tableau-de-bord"}
            aria-label={label}
            title={collapsed ? label : undefined}
            className={({ isActive }) => [
              "nav-item",
              isActive ? "active" : "",
              collapsed ? "collapsed-item" : "",
            ].filter(Boolean).join(" ")}
          >
            <Icon size={19} />
            {!collapsed && <span>{label}</span>}
            {!collapsed && <span className="nav-arrow" aria-hidden="true">›</span>}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`} data-theme={theme}>
      <header className="mobile-header">
        <Link className="brand mobile-brand" to={navigationTarget("/tableau-de-bord")}>
          <span className="brand-icon"><Wheat size={21} /></span>
          <span className="brand-copy"><strong>FoodPrice</strong><small>ANALYTICS SÉNÉGAL</small></span>
        </Link>
      </header>

      <aside className="sidebar" aria-label="Navigation FoodPrice">
        <div className="sidebar-top">
          <div className="sidebar-window-bar">
            <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
            <button
              className="collapse-toggle"
              onClick={() => setCollapsed((value) => !value)}
              title={collapsed ? "Déplier le menu" : "Réduire le menu"}
              aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
              aria-pressed={collapsed}
            >
              <ChevronLeft className={collapsed ? "chevron-reversed" : ""} size={17} />
            </button>
          </div>

          <Link
            className={`brand sidebar-brand${collapsed ? " brand-centered" : ""}`}
            to={navigationTarget("/tableau-de-bord")}
            title={collapsed ? "FoodPrice — Tableau de bord" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="brand-icon"><Wheat size={22} /></span>
            {!collapsed && <span className="brand-copy"><strong>FoodPrice</strong><small>ANALYTICS SÉNÉGAL</small></span>}
          </Link>

          {!collapsed && <p className="nav-label">ESPACE ANALYTIQUE</p>}
          {renderNavigation()}
        </div>

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-status" role="status">
              <span className={`status-dot${healthQuery.isSuccess ? "" : " offline"}`} />
              API {healthQuery.isSuccess ? "connectée" : "indisponible"}
            </div>
          )}
          {collapsed && (
            <span
              className={`status-dot collapsed-status${healthQuery.isSuccess ? "" : " offline"}`}
              title={`API ${healthQuery.isSuccess ? "connectée" : "indisponible"}`}
              role="status"
            />
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">SUIVI DES MARCHÉS ALIMENTAIRES</p>
            <h1>{activePage.label}</h1>
            <p className="subtitle">Comprendre les tendances des prix et explorer les prévisions.</p>
          </div>
          <div className="topbar-actions">
            <button
              className="button secondary theme-toggle"
              type="button"
              onClick={() => setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark")}
              aria-label={`Basculer vers le thème ${theme === "dark" ? "clair" : "sombre"}`}
              aria-pressed={theme === "dark"}
              title={`Basculer vers le thème ${theme === "dark" ? "clair" : "sombre"}`}
              data-theme={theme}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              <span>{theme === "dark" ? "Clair" : "Sombre"}</span>
            </button>
            <button className="button secondary" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} /> Actualiser
            </button>
            <button className="button secondary" onClick={onExport} disabled={exportMutation.isPending || loading || prices.length === 0}>
              <Download size={16} /> {exportMutation.isPending ? "Export…" : "Exporter CSV"}
            </button>
          </div>
        </header>

        {isDemo && (
          <div className="notice" role="status">
            <AlertTriangle size={17} />
            Données synthétiques de démonstration : elles ne représentent pas les prix réels du Sénégal.
          </div>
        )}
        {error && <div className="error-box" role="alert">{error}</div>}

        <FilterBar
          products={products}
          regions={regions}
          markets={markets}
          product={product}
          region={region}
          market={market}
          loading={loading || marketsQuery.isPending}
          observationCount={prices.length}
          onProductChange={(value) => updateFilters({ product: value })}
          onRegionChange={(value) => updateFilters({ region: value })}
          onMarketChange={(value) => updateFilters({ market: value })}
        />
        <div className="route-content">
          <Suspense fallback={<div className="route-loading" role="status">Chargement de la page…</div>}>
            <Outlet context={pageContext} />
          </Suspense>
        </div>

        <footer className="footer">
          FoodPrice Analytics Sénégal · Projet pédagogique · Les prévisions sont expérimentales et ne remplacent pas les données officielles.
        </footer>
      </main>

      <nav className="mobile-tabbar" aria-label="Navigation mobile">
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={navigationTarget(to)}
            end={to === "/tableau-de-bord"}
            className={({ isActive }) => `mobile-tab${isActive ? " active" : ""}`}
          >
            <Icon size={18} />
            <span>{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/tableau-de-bord" replace /> },
      { path: "tableau-de-bord", element: <DashboardPage /> },
      { path: "prix", element: <AnalysisPage /> },
      { path: "marches", element: <MarketsPage /> },
      { path: "comparer", element: <ComparePage /> },
      { path: "previsions", element: <PredictionsPage /> },
      { path: "donnees", element: <DataPage /> },
      { path: "dashboard", element: <LegacyRedirect to="/tableau-de-bord" /> },
      { path: "analysis", element: <LegacyRedirect to="/prix" /> },
      { path: "predictions", element: <LegacyRedirect to="/previsions" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
