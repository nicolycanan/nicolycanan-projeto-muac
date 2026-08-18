"use client";

import { useEffect, useState } from "react";
import dashboardStyles from "./dashboard.module.css";

type TopItem = { path?: string; archive_slug?: string; views: number };
type SourceItem = { source: string; views: number };
type RecentEvent = {
  id: number;
  event: string;
  path: string;
  archive_slug: string | null;
  device: string | null;
  utm_source: string | null;
  created_at: string;
};

type StatsResponse = {
  totalPageviews: number;
  topPages: TopItem[];
  topArchives: TopItem[];
  sources: SourceItem[];
  recentEvents: RecentEvent[];
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analytics/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Erro ao carregar dados.");
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch {
      setError("Não foi possível carregar as métricas do MUAC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className={dashboardStyles.loadingState}>Carregando overview…</div>;
  }

  if (error) {
    return <div className={dashboardStyles.errorState}>{error}</div>;
  }

  if (!data) {
    return <div className={dashboardStyles.emptyState}>Sem dados disponíveis no momento.</div>;
  }

  const topPage = data.topPages[0];
  const topArchive = data.topArchives[0];
  const topSource = data.sources[0];

  return (
    <>
      <header className={dashboardStyles.pageHeader}>
        <div>
          <div className={dashboardStyles.pageEyebrow}>Overview</div>
          <h1 className="hand">Dashboard</h1>
        </div>
        <button className={dashboardStyles.button} onClick={() => fetchData()} disabled={loading}>
          Atualizar
        </button>
      </header>

      <section className={dashboardStyles.metrics} aria-label="Resumo das métricas administrativas">
        <article className={dashboardStyles.metricCard}>
          <div className={dashboardStyles.metricLabel}>Pageviews</div>
          <div className={dashboardStyles.metricValue}>{data.totalPageviews.toLocaleString()}</div>
          <div className={dashboardStyles.metricMeta}>Total de acessos registrados</div>
        </article>

        <article className={dashboardStyles.metricCard}>
          <div className={dashboardStyles.metricLabel}>Página mais acessada</div>
          <div className={dashboardStyles.metricValue}>{topPage ? topPage.path : "—"}</div>
          <div className={dashboardStyles.metricMeta}>{topPage ? `${topPage.views} visualizações` : "Sem dados"}</div>
        </article>

        <article className={dashboardStyles.metricCard}>
          <div className={dashboardStyles.metricLabel}>Arquivo mais visto</div>
          <div className={dashboardStyles.metricValue}>{topArchive ? topArchive.archive_slug : "—"}</div>
          <div className={dashboardStyles.metricMeta}>{topArchive ? `${topArchive.views} visualizações` : "Sem dados"}</div>
        </article>

        <article className={dashboardStyles.metricCard}>
          <div className={dashboardStyles.metricLabel}>Origem principal</div>
          <div className={dashboardStyles.metricValue}>{topSource ? topSource.source : "Direto"}</div>
          <div className={dashboardStyles.metricMeta}>{topSource ? `${topSource.views} visitas` : "Tráfego direto"}</div>
        </article>
      </section>

      <section className={dashboardStyles.grid}>
        <div className={dashboardStyles.panel}>
          <h2 className={dashboardStyles.panelTitle}>Páginas mais acessadas</h2>
          <div className={dashboardStyles.list}>
            {data.topPages.length > 0 ? (
              data.topPages.map((item) => (
                <div key={item.path || "unknown"} className={dashboardStyles.listItem}>
                  <span className={dashboardStyles.itemLabel}>{item.path}</span>
                  <span className={dashboardStyles.itemValue}>{item.views}</span>
                </div>
              ))
            ) : (
              <div className={dashboardStyles.emptyState}>Sem páginas registradas.</div>
            )}
          </div>
        </div>

        <div className={dashboardStyles.panel}>
          <h2 className={dashboardStyles.panelTitle}>Arquivos mais vistos</h2>
          <div className={dashboardStyles.list}>
            {data.topArchives.length > 0 ? (
              data.topArchives.map((item) => (
                <div key={item.archive_slug || "unknown"} className={dashboardStyles.listItem}>
                  <span className={dashboardStyles.itemLabel}>{item.archive_slug}</span>
                  <span className={dashboardStyles.itemValue}>{item.views}</span>
                </div>
              ))
            ) : (
              <div className={dashboardStyles.emptyState}>Sem arquivos registrados.</div>
            )}
          </div>
        </div>
      </section>

      <section className={dashboardStyles.panel} style={{ marginTop: "1rem" }}>
        <h2 className={dashboardStyles.panelTitle}>Eventos recentes</h2>
        <div className={dashboardStyles.list}>
          {data.recentEvents.length > 0 ? (
            data.recentEvents.slice(0, 6).map((event) => (
              <div key={event.id} className={dashboardStyles.listItem}>
                <span className={dashboardStyles.itemLabel}>
                  {event.event} · {event.path}
                </span>
                <span className={dashboardStyles.itemValue}>{new Date(event.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))
          ) : (
            <div className={dashboardStyles.emptyState}>Ainda não há eventos.</div>
          )}
        </div>
      </section>
    </>
  );
}
