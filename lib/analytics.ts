import { getCloudflareContext } from "@opennextjs/cloudflare";

export type AnalyticsEvent = {
  event: string;
  path: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  archive_slug?: string | null;
  country?: string | null;
  device?: string | null;
  visitor_hash?: string | null;
};

export async function recordAnalyticsEvent(
  data: AnalyticsEvent,
): Promise<void> {
  const { env } = await getCloudflareContext();

  await env.muac_analytics
    .prepare(
      `
        INSERT INTO analytics_events (
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
          visitor_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      data.event,
      data.path,
      data.referrer ?? null,
      data.utm_source ?? null,
      data.utm_medium ?? null,
      data.utm_campaign ?? null,
      data.utm_content ?? null,
      data.utm_term ?? null,
      data.archive_slug ?? null,
      data.country ?? null,
      data.device ?? null,
      data.visitor_hash ?? null,
    )
    .run();
}