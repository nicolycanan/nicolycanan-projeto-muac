import type { MetadataRoute } from "next";
import { getArchive } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://muac.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/archive`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/radio`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/video`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  // Build-time sitemap generation should degrade gracefully if Notion is
  // briefly unreachable — a CMS hiccup shouldn't fail the whole deploy.
  // Runtime page requests still surface Notion errors clearly (see
  // app/archive/page.tsx and app/archive/[slug]/page.tsx).
  try {
    const archiveEntries = await getArchive();
    const archiveRoutes: MetadataRoute.Sitemap = archiveEntries.map((entry) => ({
      url: `${SITE_URL}/archive/${entry.slug}`,
      lastModified: entry.date ? new Date(entry.date) : new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...archiveRoutes];
  } catch (err) {
    console.warn("[sitemap] não foi possível buscar o Archive no Notion, gerando sitemap sem essas rotas:", err);
    return staticRoutes;
  }
}