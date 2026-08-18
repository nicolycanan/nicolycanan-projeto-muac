import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics";

const ALLOWED_EVENTS = new Set([
  "pageview",
  "archive_view",
  "archive_tag_filter",
  "external_click",
]);

type AnalyticsRequestBody = {
  event?: unknown;
  path?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  archive_slug?: unknown;
  country?: unknown;
  device?: unknown;
};

function getString(
  value: unknown,
  maxLength = 500,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const data = body as AnalyticsRequestBody;

    const event = getString(data.event, 50);
    const path = getString(data.path, 500);

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json(
        { error: "Invalid analytics event." },
        { status: 400 },
      );
    }

    if (!path || !path.startsWith("/")) {
      return NextResponse.json(
        { error: "Invalid analytics path." },
        { status: 400 },
      );
    }

    await recordAnalyticsEvent({
      event,
      path,
      referrer: getString(data.referrer, 1000),
      utm_source: getString(data.utm_source, 200),
      utm_medium: getString(data.utm_medium, 200),
      utm_campaign: getString(data.utm_campaign, 200),
      utm_content: getString(data.utm_content, 200),
      utm_term: getString(data.utm_term, 200),
      archive_slug: getString(data.archive_slug, 300),
      country: getString(data.country, 100),
      device: getString(data.device, 50),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);

    return NextResponse.json(
      { error: "Failed to record analytics event." },
      { status: 500 },
    );
  }
}