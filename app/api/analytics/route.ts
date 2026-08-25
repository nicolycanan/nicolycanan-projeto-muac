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

/**
 * Gera um identificador anônimo baseado no IP.
 *
 * O IP real nunca é armazenado no banco.
 * O salt fica protegido como secret no Cloudflare.
 */
async function createVisitorHash(
  ip: string | null,
  salt: string | undefined,
): Promise<string | null> {
  if (!ip || !salt) {
    return null;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${ip}`);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data,
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

    /*
     * O Dashboard nunca deve entrar no Analytics.
     *
     * Isso bloqueia:
     * /dashboard
     * /dashboard/analytics
     * /dashboard/logs
     * /dashboard/*
     */
    if (
      path === "/dashboard" ||
      path.startsWith("/dashboard/")
    ) {
      return NextResponse.json({
        success: true,
        tracked: false,
      });
    }

    /*
     * Captura o IP fornecido pelo Cloudflare.
     *
     * O IP é utilizado somente para gerar o hash.
     * O IP real não é enviado para o banco.
     */
    const clientIp = request.headers.get("CF-Connecting-IP");

    const visitorHash = await createVisitorHash(
      clientIp,
      process.env.ANALYTICS_IP_SALT,
    );

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

      visitor_hash: visitorHash,
    });

    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return NextResponse.json(
      { error: "Failed to record analytics event." },
      { status: 500 },
    );
  }
}