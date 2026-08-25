"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./analytics.module.css";

type TopItem = { path?: string; archive_slug?: string; views: number };

type DeviceItem = { device: string; views: number };

type SourceItem = { source: string; views: number };
type CampaignItem = { campaign: string; views: number };

type RecentEvent = {
  id: number;
  event: string;
  path: string;
  archive_slug: string | null;
  device: string | null;
  utm_source: string | null;
  utm_campaign?: string | null;
  created_at: string;
};

type StatsResponse = {
  totalPageviews: number;
  topPages: TopItem[];
  topArchives: TopItem[];
  devices: DeviceItem[];
  sources: SourceItem[];
  campaigns?: CampaignItem[];
  recentEvents: RecentEvent[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Server error");
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch (e) {
      setError("Não foi possível carregar as métricas. Tente atualizar a página.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const topPage = data?.topPages?.[0];
  const topArchive = data?.topArchives?.[0];
  const topSource = data?.sources?.[0];

  const deviceDistribution = useMemo(() => {
    const map = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 } as Record<string, number>;
    if (!data) return map;
    let total = 0;
    for (const d of data.devices) {
      total += d.views;
      const label = (d.device || "").toLowerCase();
      if (label.includes("mobile") || label.includes("phone")) map.mobile += d.views;
      else if (label.includes("tablet")) map.tablet += d.views;
      else if (label.includes("desktop") || label.includes("windows") || label.includes("mac") || label.includes("linux")) map.desktop += d.views;
      else map.unknown += d.views;
    }
    return map;
  }, [data]);

  const directCount = useMemo(() => {
    if (!data) return 0;
    const sumSources = data.sources.reduce((s, it) => s + it.views, 0);
    return Math.max(0, data.totalPageviews - sumSources);
  }, [data]);

  return (
    <div className={`container ${styles.wrap}`}>
      <header className={styles.header}>
        <h1 className="hand">Analytics</h1>
        <p className={styles.sub}>Um olhar sobre quem está passando pelo acervo.</p>
        <p className={styles.note}>Dados coletados pelo MUAC</p>
      </header>

      <div className={styles.controls}>
        <button className={styles.button} onClick={() => fetchData()} disabled={loading}>
          Atualizar
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>Carregando métricas…</div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <section className={styles.summaryGrid}>
            <article className={styles.card}>
              <div className={styles.cardLabel}>Pageviews totais</div>
              <div className={styles.cardValue}>{data.totalPageviews.toLocaleString()}</div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardLabel}>Página mais acessada</div>
              <div className={styles.cardValue}>{topPage ? topPage.path : "—"}</div>
              <div className={styles.cardMeta}>{topPage ? `${topPage.views} views` : ""}</div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardLabel}>Arquivo mais acessado</div>
              <div className={styles.cardValue}>{topArchive ? topArchive.archive_slug : "—"}</div>
              <div className={styles.cardMeta}>{topArchive ? `${topArchive.views} views` : ""}</div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardLabel}>Principal origem</div>
              <div className={styles.cardValue}>{topSource ? topSource.source : "Direto"}</div>
              <div className={styles.cardMeta}>{topSource ? `${topSource.views} views` : `${directCount} views`}</div>
            </article>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>Páginas mais acessadas</h2>
            <ol className={styles.list}>
              {data.topPages.map((p) => (
                <li key={p.path} className={styles.listItem}>
                  <span className={styles.itemPath}>{p.path}</span>
                  <span className={styles.itemCount}>{p.views}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.twoCol}>
            <div>
              <h2 className={styles.h2}>Arquivos mais acessados</h2>
              <ol className={styles.list}>
                {data.topArchives.map((a) => (
                  <li key={a.archive_slug} className={styles.listItem}>
                    <span className={styles.itemPath}>{a.archive_slug}</span>
                    <span className={styles.itemCount}>{a.views}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className={styles.h2}>Dispositivos</h2>
              <div className={styles.deviceList}>
                {Object.entries(deviceDistribution).map(([k, v]) => (
                  <div key={k} className={styles.deviceRow}>
                    <div className={styles.deviceLabel}>{k}</div>
                    <div className={styles.deviceBarWrap}>
                      <div
                        className={styles.deviceBar}
                        style={{ width: `${data.totalPageviews ? Math.round((v / data.totalPageviews) * 100) : 0}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className={styles.deviceCount}>{v}</div>
                  </div>
                ))}
              </div>

              <h2 className={styles.h2} style={{ marginTop: "1.25rem" }}>
                Fontes de tráfego
              </h2>
              <ol className={styles.list}>
                {data.sources.map((s) => (
                  <li key={s.source} className={styles.listItem}>
                    <span className={styles.itemPath}>{s.source}</span>
                    <span className={styles.itemCount}>{s.views}</span>
                  </li>
                ))}
                <li className={styles.listItem}>
                  <span className={styles.itemPath}>Direto</span>
                  <span className={styles.itemCount}>{directCount}</span>
                </li>
              </ol>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>Campanhas</h2>
            <ol className={styles.list}>
              {data.campaigns && data.campaigns.length > 0 ? (
                data.campaigns.map((c) => (
                  <li key={c.campaign} className={styles.listItem}>
                    <span className={styles.itemPath}>{c.campaign}</span>
                    <span className={styles.itemCount}>{c.views}</span>
                  </li>
                ))
              ) : (
                <li className={styles.listItem}>Nenhuma campanha registrada</li>
              )}
            </ol>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>Eventos recentes</h2>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <div>Data</div>
                <div>Evento</div>
                <div>Path</div>
                <div>Dispositivo</div>
                <div>Arquivo</div>
              </div>
              <div className={styles.tableBody}>
                {data.recentEvents.map((e) => (
                  <div key={e.id} className={styles.tableRow}>
                    <div>{new Date(e.created_at).toLocaleString()}</div>
                    <div>{e.event}</div>
                    <div className={styles.mono}>{e.path}</div>
                    <div>{e.device ?? "—"}</div>
                    <div>{e.archive_slug ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
