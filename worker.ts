// MUAC Worker
// Public entrypoint that delegates requests to the OpenNext worker.

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ANALYTICS_RATE_LIMITER: RateLimitBinding;
  muac_media: KVNamespace;
  IMAGES: ImagesBinding;
  ASSETS: Fetcher;
  MAINTENANCE_MODE?: string;
}

// OpenNext's local image loader reads static assets. Media from KV must be
// supplied to the Images binding as bytes, rather than as a static-asset URL.
const IMAGE_WIDTHS = new Set([
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
]);
async function kvImage(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const source = url.searchParams.get("url") ?? "";
  if (
    request.method !== "GET" ||
    url.pathname !== "/_next/image" ||
    !/^\/media\/[a-f0-9-]{36}$/.test(source)
  )
    return null;
  const width = Number(url.searchParams.get("w"));
  if (!IMAGE_WIDTHS.has(width) || url.searchParams.get("q") !== "75")
    return new Response("Invalid image size or quality", { status: 400 });
  const format = request.headers.get("accept")?.includes("image/webp")
    ? "image/webp"
    : "image/png";
  const cacheUrl = new URL(url.origin + "/_next/image");
  cacheUrl.searchParams.set("url", source);
  cacheUrl.searchParams.set("w", String(width));
  cacheUrl.searchParams.set("q", "75");
  cacheUrl.searchParams.set("format", format);
  const key = new Request(cacheUrl.toString());
  const cache = await caches.open("muac-images");
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const stream = await env.muac_media.get(
      `images/${source.slice(7)}`,
      "stream",
    );
    if (!stream)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    const transformed = (
      await env.IMAGES.input(stream)
        .transform({ width, fit: "scale-down" })
        .output({ format, quality: 75 })
    ).response();
    const response = new Response(transformed.body, {
      status: transformed.status,
      headers: transformed.headers,
    });
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
    response.headers.set("Vary", "Accept");
    response.headers.set("X-Content-Type-Options", "nosniff");
    if (response.ok) ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  } catch (error) {
    console.error("KV image optimization failed", error);
    // Keep originals usable even if the transformation quota is exhausted.
    return new Response(null, {
      status: 307,
      headers: { Location: source, "Cache-Control": "no-store" },
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      const url = new URL(request.url);
      if (env.MAINTENANCE_MODE === "1") {
        // Preserve the protected workspace for repairs while every public page pauses.
        const admin =
          url.pathname === "/dashboard" ||
          url.pathname.startsWith("/dashboard/");
        const asset =
          url.pathname.startsWith("/_next/") ||
          url.pathname.startsWith("/maintenance/") ||
          url.pathname.startsWith("/media/") ||
          url.pathname.startsWith("/images/") ||
          url.pathname === "/favicon.svg";
        const stats =
          url.pathname === "/api/analytics/stats" ||
          url.pathname === "/api/analytics/logs";
        if (url.pathname === "/api/analytics" && request.method === "POST")
          return new Response(null, {
            status: 204,
            headers: { "Cache-Control": "no-store" },
          });
        if (!admin && !asset && !stats) {
          const page = await env.ASSETS.fetch(
            new Request(new URL("/maintenance/index.html", url.origin)),
          );
          return new Response(request.method === "HEAD" ? null : page.body, {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, max-age=0",
              "Retry-After": "300",
              "X-Robots-Tag": "noindex, nofollow",
            },
          });
        }
      }
      const image = await kvImage(request, url, env, ctx);
      if (image) return image;

      /*
       * Rate limiting do endpoint público de analytics.
       *
       * O POST /api/analytics precisa continuar público,
       * pois é utilizado pelos visitantes do site.
       *
       * O limite é aplicado antes da requisição chegar ao OpenNext/D1.
       */
      const isAnalyticsPost =
        request.method === "POST" && url.pathname === "/api/analytics";

      if (isAnalyticsPost) {
        const clientIp = request.headers.get("CF-Connecting-IP") ?? "unknown";

        const rateLimitKey = `analytics:${clientIp}`;

        const { success } = await env.ANALYTICS_RATE_LIMITER.limit({
          key: rateLimitKey,
        });

        if (!success) {
          return new Response(
            JSON.stringify({
              error: "Too many analytics requests.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
                "Retry-After": "60",
              },
            },
          );
        }
      }

      // @ts-ignore - generated by OpenNext during build
      const openNextMod = await import("./.open-next/worker.js");
      const openNextAny = openNextMod as any;

      if (
        openNextAny &&
        openNextAny.default &&
        typeof openNextAny.default.fetch === "function"
      ) {
        return await openNextAny.default.fetch(request, env, ctx);
      }

      if (openNextAny && typeof openNextAny.fetch === "function") {
        return await openNextAny.fetch(request, env, ctx);
      }

      throw new Error("OpenNext generated worker missing fetch");
    } catch (error) {
      console.error("OpenNext delegation error:", error);

      return new Response("Internal Server Error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  },
};
