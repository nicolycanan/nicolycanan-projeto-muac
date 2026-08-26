"use client";

import { useEffect, useState } from "react";
import styles from "./logs.module.css";

type AnalyticsLog = {
  id: number;
  event: string;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  archive_slug: string | null;
  country: string | null;
  device: string | null;
  ip_address: string | null;
  created_at: string;
};

type LogsResponse = {
  logs: AnalyticsLog[];
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AnalyticsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/logs?limit=100", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar logs.");
      }

      const data = (await response.json()) as LogsResponse;

      setLogs(data.logs ?? []);
    } catch {
      setError("Não foi possível carregar os logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Admin / Logs</div>

          <h1 className="hand">Logs</h1>

          <p className={styles.sub}>
            Eventos registrados pelo sistema de analytics do MUAC.
          </p>
        </div>

        <button
          className={styles.button}
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className={styles.state}>Carregando logs...</div>
      ) : logs.length === 0 ? (
        <div className={styles.state}>Nenhum evento registrado.</div>
      ) : (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>{logs.length} eventos exibidos</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Evento</th>
                  <th>Path</th>
                  <th>Arquivo</th>
                  <th>Dispositivo</th>
                  <th>IP</th>
                  <th>Origem</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.date}>
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>

                    <td>
                      <span className={styles.event}>{log.event}</span>
                    </td>

                    <td className={styles.mono}>{log.path}</td>

                    <td>{log.archive_slug ?? "—"}</td>

                    <td>{log.device ?? "—"}</td>

                    <td className={styles.mono}>
                      {log.ip_address ?? "—"}
                    </td>

                    <td>{log.utm_source ?? "Direto"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}