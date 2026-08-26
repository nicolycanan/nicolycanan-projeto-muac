import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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

export async function GET(request: Request) {
  try {
    const { env } = getCloudflareContext();
    const db = env.muac_analytics;

    const url = new URL(request.url);

    const requestedLimit = Number(
      url.searchParams.get("limit") ?? "100",
    );

    const limit = Math.min(
      Math.max(
        Number.isFinite(requestedLimit) ? requestedLimit : 100,
        1,
      ),
      500,
    );

    const result = await db
      .prepare(
        `SELECT
          id,
          event,
          path,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          archive_slug,
          country,
          device,
          ip_address,
          created_at
        FROM analytics_events
        ORDER BY id DESC
        LIMIT ?`,
      )
      .bind(limit)
      .all<AnalyticsLog>();

    return NextResponse.json(
      {
        logs: result.results ?? [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Analytics logs error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os logs.",
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