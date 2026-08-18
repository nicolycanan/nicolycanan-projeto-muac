import { NextResponse } from "next/server";

type AnalyticsRow = {
  path: string;
  views: number;
};

type ArchiveRow = {
  archive_slug: string;
  views: number;
};

type DeviceRow = {
  device: string;
  views: number;
};

type SourceRow = {
  source: string;
  views: number;
};

type RecentEventRow = {
  id: number;
  event: string;
  path: string;
  archive_slug: string | null;
  device: string | null;
  utm_source: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const { env } = await import("cloudflare:workers");

    const db = env.muac_analytics;

    const totalResult = await db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM analytics_events
         WHERE event = 'pageview'`,
      )
      .first<{ total: number }>();

    const topPagesResult = await db
      .prepare(
        `SELECT
           path,
           COUNT(*) AS views
         FROM analytics_events
         WHERE event = 'pageview'
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all<AnalyticsRow>();

    const topArchivesResult = await db
      .prepare(
        `SELECT
           archive_slug,
           COUNT(*) AS views
         FROM analytics_events
         WHERE event = 'pageview'
           AND archive_slug IS NOT NULL
           AND archive_slug != ''
         GROUP BY archive_slug
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all<ArchiveRow>();

    const devicesResult = await db
      .prepare(
        `SELECT
           device,
           COUNT(*) AS views
         FROM analytics_events
         WHERE device IS NOT NULL
           AND device != ''
         GROUP BY device
         ORDER BY views DESC`,
      )
      .all<DeviceRow>();

    const sourcesResult = await db
      .prepare(
        `SELECT
           utm_source AS source,
           COUNT(*) AS views
         FROM analytics_events
         WHERE utm_source IS NOT NULL
           AND utm_source != ''
         GROUP BY utm_source
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all<SourceRow>();

    const recentEventsResult = await db
      .prepare(
        `SELECT
           id,
           event,
           path,
           archive_slug,
           device,
           utm_source,
           created_at
         FROM analytics_events
         ORDER BY id DESC
         LIMIT 20`,
      )
      .all<RecentEventRow>();

    return NextResponse.json(
      {
        totalPageviews: totalResult?.total ?? 0,
        topPages: topPagesResult.results ?? [],
        topArchives: topArchivesResult.results ?? [],
        devices: devicesResult.results ?? [],
        sources: sourcesResult.results ?? [],
        recentEvents: recentEventsResult.results ?? [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Analytics stats error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar as métricas.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}