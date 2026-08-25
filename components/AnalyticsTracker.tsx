"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getDeviceType(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/.test(userAgent)) {
    return "tablet";
  }

  if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(userAgent)) {
    return "mobile";
  }

  return "desktop";
}

function getArchiveSlug(pathname: string): string | null {
  const match = pathname.match(/^\/archive\/([^/]+)/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // Não rastrear o Dashboard nem nenhuma rota abaixo dele.
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return;
    }

    // Evita registrar a mesma página mais de uma vez.
    if (lastTrackedPath.current === pathname) {
      return;
    }

    lastTrackedPath.current = pathname;

    const params = new URLSearchParams(window.location.search);

    const payload = {
      event: "pageview",
      path: pathname,
      referrer: document.referrer || null,

      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),

      archive_slug: getArchiveSlug(pathname),
      device: getDeviceType(),
    };

    void fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Analytics nunca deve impedir ou quebrar a navegação do site.
    });
  }, [pathname]);

  return null;
}